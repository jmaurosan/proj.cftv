import http from 'node:http'
import { randomBytes } from 'node:crypto'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import os from 'node:os'
import { writeMediaMtxConfigWithBackup } from './agentCore.mjs'

const DEFAULT_HOST = '127.0.0.1'
const DEFAULT_PORT = 8727
const DEFAULT_CONFIG_PATH = 'C:\\MediaMTX\\mediamtx.yml'
const AGENT_VERSION = '1.1.0'
const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://192.168.0.182:5173',
  'https://proj-cftv.vercel.app',
]

const host = process.env.CFTV_MEDIAMTX_AGENT_HOST || DEFAULT_HOST
const port = Number(process.env.CFTV_MEDIAMTX_AGENT_PORT || DEFAULT_PORT)
const configPath = process.env.CFTV_MEDIAMTX_CONFIG_PATH || DEFAULT_CONFIG_PATH
const configuredToken = process.env.CFTV_MEDIAMTX_AGENT_TOKEN?.trim()
const token = configuredToken || randomBytes(32).toString('base64url')
const allowedOrigins = (process.env.CFTV_MEDIAMTX_ALLOWED_ORIGINS || DEFAULT_ALLOWED_ORIGINS.join(','))
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)
const execFileAsync = promisify(execFile)
const IPV4_PATTERN = /^(?:25[0-5]|2[0-4]\d|1?\d?\d)(?:\.(?:25[0-5]|2[0-4]\d|1?\d?\d)){3}$/

const pingTarget = async (ip) => {
  if (!IPV4_PATTERN.test(ip)) throw new Error('Endereço IPv4 inválido.')
  const startedAt = Date.now()
  const args = process.platform === 'win32' ? ['-n', '1', '-w', '2500', ip] : ['-c', '1', '-W', '3', ip]
  try {
    await execFileAsync('ping', args, { timeout: 4000, windowsHide: true })
    return { online: true, latency: Date.now() - startedAt }
  } catch {
    return { online: false, latency: Date.now() - startedAt }
  }
}

const jsonResponse = (res, statusCode, body, origin) => {
  res.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    ...(origin ? { 'access-control-allow-origin': origin, vary: 'Origin' } : {}),
  })
  res.end(JSON.stringify(body))
}

const readBody = (req) => new Promise((resolve, reject) => {
  let body = ''
  req.on('data', (chunk) => {
    body += chunk
    if (body.length > 2_000_000) {
      reject(new Error('Payload muito grande.'))
      req.destroy()
    }
  })
  req.on('end', () => resolve(body))
  req.on('error', reject)
})

const isOriginAllowed = (origin) => !origin || allowedOrigins.includes(origin)

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin

  if (!isOriginAllowed(origin)) {
    jsonResponse(res, 403, { ok: false, error: 'Origem não permitida pelo agente MediaMTX.' })
    return
  }

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'access-control-allow-origin': origin || '*',
      'access-control-allow-methods': 'GET,POST,OPTIONS',
      'access-control-allow-headers': 'content-type,x-cftv-agent-token',
      'access-control-max-age': '600',
      vary: 'Origin',
    })
    res.end()
    return
  }

  if (req.method === 'GET' && req.url === '/health') {
    jsonResponse(res, 200, {
      ok: true,
      service: 'cftv-mediamtx-agent',
      version: AGENT_VERSION,
      capabilities: ['mediamtx-config', 'network-ping'],
      configPath,
      allowedOrigins,
      hostname: os.hostname(),
    }, origin)
    return
  }

  if (req.method === 'POST' && req.url === '/network/ping') {
    if (req.headers['x-cftv-agent-token'] !== token) {
      jsonResponse(res, 401, { ok: false, error: 'Token inválido para o agente local.' }, origin)
      return
    }

    try {
      const rawBody = await readBody(req)
      const payload = JSON.parse(rawBody)
      const result = await pingTarget(String(payload.ip || '').trim())
      jsonResponse(res, 200, { ok: true, ...result }, origin)
    } catch (error) {
      jsonResponse(res, 400, { ok: false, error: error instanceof Error ? error.message : 'Falha no diagnóstico.' }, origin)
    }
    return
  }

  if (req.method === 'POST' && req.url === '/config') {
    if (req.headers['x-cftv-agent-token'] !== token) {
      jsonResponse(res, 401, { ok: false, error: 'Token inválido para o agente MediaMTX.' }, origin)
      return
    }

    try {
      const rawBody = await readBody(req)
      const payload = JSON.parse(rawBody)
      const result = await writeMediaMtxConfigWithBackup({ configPath, yaml: String(payload.yaml || '') })
      jsonResponse(res, 200, { ok: true, ...result }, origin)
    } catch (error) {
      jsonResponse(res, 400, { ok: false, error: error instanceof Error ? error.message : 'Erro ao atualizar MediaMTX.' }, origin)
    }
    return
  }

  jsonResponse(res, 404, { ok: false, error: 'Rota não encontrada.' }, origin)
})

server.listen(port, host, () => {
  console.log(`CFTV MediaMTX agent listening on http://${host}:${port}`)
  console.log(`Config path: ${configPath}`)
  if (!configuredToken) {
    console.warn('CFTV_MEDIAMTX_AGENT_TOKEN nao foi configurado.')
    console.warn(`Token temporario desta execucao: ${token}`)
    console.warn('Defina a variavel de ambiente para manter um token estavel e seguro.')
  }
})
