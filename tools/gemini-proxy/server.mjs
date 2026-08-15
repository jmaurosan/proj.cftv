import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { GoogleGenAI, Type } from '@google/genai'

// Tenta carregar segredos de ./secrets.yaml (opcional) para permitir configuração server-side
const __dirname = path.dirname(fileURLToPath(import.meta.url))
function loadSecrets() {
  const candidates = [path.join(__dirname, '..', '..', 'secrets.yaml'), path.join(__dirname, '..', '..', 'secrets.json'), path.join(process.cwd(), 'secrets.yaml')]
  for (const p of candidates) {
    try {
      if (!fs.existsSync(p)) continue
      const raw = fs.readFileSync(p, 'utf8').trim()
      if (!raw) continue
      // Tentar JSON primeiro
      try {
        return JSON.parse(raw)
      } catch {}
      // Parse YAML simples key: value (linha por linha)
      const out = {}
      for (const line of raw.split(/\r?\n/)) {
        const m = line.match(/^([A-Za-z0-9_\-]+):\s*(?:"([^"]*)"|'([^']*)'|(.*))?$/)
        if (!m) continue
        const key = m[1]
        const val = m[2] ?? m[3] ?? (m[4] !== undefined ? m[4].trim() : '')
        out[key] = val === '' ? null : val
      }
      return out
    } catch (e) {
      // ignore and try next
    }
  }
  return {}
}

const SECRETS = loadSecrets()
const PORT = Number(process.env.GEMINI_PROXY_PORT || 8787)
const apiKey = process.env.GEMINI_API_KEY || SECRETS.GEMINI_KEY || SECRETS.GEMINI_API_KEY

if (!apiKey || !String(apiKey).trim()) {
  console.error('GEMINI_API_KEY é necessário para iniciar o proxy Gemini. Defina a variável de ambiente GEMINI_API_KEY ou coloque GEMINI_KEY em secrets.yaml')
  process.exit(1)
}

const client = new GoogleGenAI({ apiKey })

const sendJson = (res, statusCode, body) => {
  res.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
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

const ensureString = (value, fallback = null) => {
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim()
  return trimmed || fallback
}

const buildEquipmentPrompt = (kind) => {
  const hintMap = {
    camera: 'câmera de CFTV (Intelbras, Hikvision, Dahua, JFL etc.)',
    dvr: 'gravador DVR/NVR de CFTV',
    router: 'roteador ou access point',
    switch: 'switch de rede',
    balun: 'balun (ativo/power ou passivo)',
    power_supply: 'fonte de alimentação estabilizada',
    generic: 'equipamento eletrônico',
  }
  return `Analise a foto da etiqueta de um ${hintMap[kind] || hintMap.generic} e extraia os dados de identificação.
Regras:
- Se um campo não estiver visível ou legível, use null.
- Nunca invente valores — prefira null a chutar.
- brand: marca fabricante (ex: Intelbras, Hikvision, Dahua, JFL, TP-Link).
- model: código completo do modelo (ex: VHD 3230 B, DS-2CE16D0T-IRF).
- serial_number: número de série (SN, S/N, Serial). Ignore MAC.
- mac_address: apenas se aparecer explicitamente (formato AA:BB:CC:DD:EE:FF).
- notes: apenas se houver informação técnica útil não coberta acima (tensão, ano, revisão de hardware). Máx 80 caracteres.`
}

const parseLabelResult = (text) => {
  if (!text) {
    throw new Error('Resposta vazia do Gemini.')
  }

  const parsed = JSON.parse(text)
  const clean = (value) => {
    if (typeof value !== 'string') return null
    const trimmed = value.trim()
    if (!trimmed || trimmed.toLowerCase() === 'null') return null
    return trimmed
  }

  return {
    brand: clean(parsed.brand),
    model: clean(parsed.model),
    serial_number: clean(parsed.serial_number),
    mac_address: clean(parsed.mac_address),
    notes: clean(parsed.notes),
  }
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/api/gemini/health') {
    sendJson(res, 200, { ok: true, service: 'gemini-proxy', configured: true })
    return
  }

  if (req.method !== 'POST') {
    sendJson(res, 405, { ok: false, error: 'Método não permitido.' })
    return
  }

  try {
    const rawBody = await readBody(req)
    const payload = rawBody ? JSON.parse(rawBody) : {}

    if (req.url === '/api/gemini/label') {
      const imageInput = ensureString(payload.imageInput)
      const kind = ensureString(payload.kind, 'generic')

      if (!imageInput) {
        sendJson(res, 400, { ok: false, error: 'imageInput é obrigatório.' })
        return
      }

      const commaIdx = imageInput.indexOf(',')
      const base64 = commaIdx >= 0 ? imageInput.slice(commaIdx + 1) : imageInput
      const mimeMatch = imageInput.match(/^data:([^;]+);base64,/)
      const mimeType = mimeMatch?.[1] ?? 'image/jpeg'

      const response = await client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{
          role: 'user',
          parts: [
            { inlineData: { mimeType, data: base64 } },
            { text: buildEquipmentPrompt(kind) },
          ],
        }],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              brand: { type: Type.STRING, nullable: true },
              model: { type: Type.STRING, nullable: true },
              serial_number: { type: Type.STRING, nullable: true },
              mac_address: { type: Type.STRING, nullable: true },
              notes: { type: Type.STRING, nullable: true },
            },
            required: ['brand', 'model', 'serial_number', 'mac_address', 'notes'],
          },
          temperature: 0,
        },
      })

      const data = parseLabelResult(response.text)
      const hasSomething = data.brand || data.model || data.serial_number || data.mac_address

      if (!hasSomething) {
        sendJson(res, 200, {
          ok: true,
          data: null,
          error: 'Nenhuma informação legível encontrada na etiqueta. Tente uma foto mais nítida.',
        })
        return
      }

      sendJson(res, 200, { ok: true, data, error: null })
      return
    }

    if (req.url === '/api/gemini/placeholder') {
      const prompt = ensureString(payload.prompt)
      if (!prompt) {
        sendJson(res, 400, { ok: false, error: 'prompt é obrigatório.' })
        return
      }

      const response = await client.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: `Tactical surveillance style, CCTV feed aesthetic, ${prompt}, high contrast, security monitoring theme`,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio: '16:9',
        },
      })

      const imageBytes = response.generatedImages?.[0]?.image?.imageBytes
      if (!imageBytes) {
        sendJson(res, 502, { ok: false, error: 'Gemini não retornou imagem.' })
        return
      }

      sendJson(res, 200, {
        ok: true,
        url: `data:image/jpeg;base64,${imageBytes}`,
      })
      return
    }

    sendJson(res, 404, { ok: false, error: 'Rota não encontrada.' })
  } catch (error) {
    sendJson(res, 500, {
      ok: false,
      error: error instanceof Error ? error.message : 'Erro interno do proxy Gemini.',
    })
  }
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Secure Gemini proxy listening on http://127.0.0.1:${PORT}`)
})
