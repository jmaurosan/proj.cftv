export type EquipmentLabelKind = 'camera' | 'dvr' | 'router' | 'switch' | 'balun' | 'power_supply' | 'generic'

export interface EquipmentLabelData {
brand: string | null
model: string | null
serial_number: string | null
mac_address: string | null
notes: string | null
}

export interface ExtractLabelResult {
data: EquipmentLabelData | null
error: string | null
}

const GEMINI_PROXY_ENDPOINT = '/api/gemini'

const callGeminiProxy = async <T>(route: string, payload: Record<string, unknown>): Promise<T> => {
const response = await fetch(`${GEMINI_PROXY_ENDPOINT}${route}`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(payload),
})

const result = await response.json().catch(() => ({}))
if (!response.ok) {
  throw new Error(result.error || 'Gemini proxy indisponível no momento.')
}

return result as T
}

export const isGeminiConfigured = async () => {
try {
  const response = await fetch(`${GEMINI_PROXY_ENDPOINT}/health`, { cache: 'no-store' })
  return response.ok
} catch {
  return false
}
}

/**
 * Extrai marca, modelo, SN e MAC de uma foto da etiqueta do equipamento.
 * A chave da API não fica no front-end; a chamada é enviada para um proxy server-side.
 */
export async function extractEquipmentLabel(
imageInput: string,
kind: EquipmentLabelKind = 'generic',
): Promise<ExtractLabelResult> {
try {
  const result = await callGeminiProxy<{ data: EquipmentLabelData | null; error: string | null }>('/label', {
    imageInput,
    kind,
  })
  return result
} catch (error) {
  const message = error instanceof Error ? error.message : 'Falha ao consultar Gemini.'
  return { data: null, error: `Gemini indisponível: ${message}` }
}
}

/**
 * Generates a placeholder image using Imagen AI for surveillance contexts.
 * @param prompt The description of the image to generate.
 * @returns A promise that resolves to a base64 data URL of the generated image.
 */
export async function generateSurveillancePlaceholder(prompt: string): Promise<string> {
const fallbackUrl = `https://picsum.photos/seed/${encodeURIComponent(prompt)}/1280/720?blur=2`

try {
  const result = await callGeminiProxy<{ url?: string; error?: string }>('/placeholder', { prompt })
  if (result.url) return result.url
  return fallbackUrl
} catch (error) {
  console.warn('Gemini proxy indisponível; usando placeholder local.', error)
  return fallbackUrl
}
}

/**
 * Generates a specific placeholder for a camera feed.
 */
export async function generateCameraFeedPlaceholder(cameraName: string, location: string): Promise<string> {
const prompt = `Security camera view of ${location}, showing ${cameraName} perspective, night vision or low light tactical look`
return generateSurveillancePlaceholder(prompt)
}

/**
 * Generates a status indicator image for a DVR.
 */
export async function generateDVRStatusPlaceholder(dvrName: string): Promise<string> {
const prompt = `Technical dashboard showing status for DVR ${dvrName}, server rack environment, glowing status lights, tactical interface`
return generateSurveillancePlaceholder(prompt)
}
