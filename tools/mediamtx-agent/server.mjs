import http from 'node:http'
import { writeMediaMtxConfigWithBackup } from './agentCore.mjs'

const DEFAULT_HOST = '127.0.0.1'
const DEFAULT_PORT = 8727
const DEFAULT_CONFIG_PATH = 'C:\\MediaMTX\\mediamtx.yml'
const DEFAULT_TOKEN = 'cftv-local-agent'
const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://192.168.0.182:5173',
  'https://proj-cftv.vercel.app',
]

const host = process.env.CFTV_MEDIAMTX_AGENT_HOST || DEFAULT_HOST
const port = Number(process.env.CFTV_MEDIAMTX_AGENT_PORT || DEFAULT_PORT)
const configPath = process.env.CFTV_MEDIAMTX_CONFIG_PATH || DEFAULT_CONFIG_PATH
const token = process.env.CFTV_MEDIAMTX_AGENT_TOKEN || DEFAULT_TOKEN
const allowedOrigins = (process.env.CFTV_MEDIAMTX_ALLOWED_ORIGINS || DEFAULT_ALLOWED_ORIGINS.join(','))
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

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
      configPath,
      allowedOrigins,
    }, origin)
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
})
