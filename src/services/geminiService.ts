import { GoogleGenAI, Type } from "@google/genai";

// Initialize the Gemini AI client using Vite's environment variables
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

export const isGeminiConfigured = () => Boolean(ai);

// ------------------------------------------------------------------------
// Etiqueta de equipamento — extração via Gemini Vision
// ------------------------------------------------------------------------

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

const EQUIPMENT_LABEL_HINT: Record<EquipmentLabelKind, string> = {
  camera: 'câmera de CFTV (Intelbras, Hikvision, Dahua, JFL etc.)',
  dvr: 'gravador DVR/NVR de CFTV',
  router: 'roteador ou access point',
  switch: 'switch de rede',
  balun: 'balun (ativo/power ou passivo)',
  power_supply: 'fonte de alimentação estabilizada',
  generic: 'equipamento eletrônico',
}

/**
 * Extrai marca, modelo, SN e MAC de uma foto da etiqueta do equipamento.
 * Retorna { data, error }. data é null se a API não estiver configurada ou
 * se o Gemini não conseguir identificar nenhum campo com confiança.
 *
 * imageInput: base64 puro (sem prefixo data:) OU data URL (data:image/jpeg;base64,...).
 */
export async function extractEquipmentLabel(
  imageInput: string,
  kind: EquipmentLabelKind = 'generic',
): Promise<ExtractLabelResult> {
  if (!ai) {
    return {
      data: null,
      error: 'Chave VITE_GEMINI_API_KEY não configurada. Adicione ao .env.local e reinicie o servidor.',
    }
  }

  const commaIdx = imageInput.indexOf(',')
  const base64 = commaIdx >= 0 ? imageInput.slice(commaIdx + 1) : imageInput
  const mimeMatch = imageInput.match(/^data:([^;]+);base64,/)
  const mimeType = mimeMatch?.[1] ?? 'image/jpeg'

  const prompt = `Analise a foto da etiqueta de um ${EQUIPMENT_LABEL_HINT[kind]} e extraia os dados de identificação.
Regras:
- Se um campo não estiver visível ou legível, use null.
- Nunca invente valores — prefira null a chutar.
- brand: marca fabricante (ex: Intelbras, Hikvision, Dahua, JFL, TP-Link).
- model: código completo do modelo (ex: VHD 3230 B, DS-2CE16D0T-IRF).
- serial_number: número de série (SN, S/N, Serial). Ignore MAC.
- mac_address: apenas se aparecer explicitamente (formato AA:BB:CC:DD:EE:FF).
- notes: apenas se houver informação técnica útil não coberta acima (tensão, ano, revisão de hardware). Máx 80 caracteres.`

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { mimeType, data: base64 } },
            { text: prompt },
          ],
        },
      ],
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

    const text = response.text
    if (!text) return { data: null, error: 'Resposta vazia do Gemini.' }

    const parsed = JSON.parse(text) as Partial<EquipmentLabelData>
    const clean = (value: unknown): string | null => {
      if (typeof value !== 'string') return null
      const trimmed = value.trim()
      if (!trimmed || trimmed.toLowerCase() === 'null') return null
      return trimmed
    }
    const data: EquipmentLabelData = {
      brand: clean(parsed.brand),
      model: clean(parsed.model),
      serial_number: clean(parsed.serial_number),
      mac_address: clean(parsed.mac_address),
      notes: clean(parsed.notes),
    }

    // Se nada foi encontrado, retorna erro amigável em vez de objeto vazio
    if (!data.brand && !data.model && !data.serial_number && !data.mac_address) {
      return { data: null, error: 'Nenhuma informação legível encontrada na etiqueta. Tente uma foto mais próxima ou com melhor iluminação.' }
    }

    return { data, error: null }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { data: null, error: `Falha ao consultar Gemini: ${message}` }
  }
}

/**
 * Generates a placeholder image using Imagen AI for surveillance contexts.
 * @param prompt The description of the image to generate.
 * @returns A promise that resolves to a base64 data URL of the generated image.
 */
export async function generateSurveillancePlaceholder(prompt: string): Promise<string> {
  const fallbackUrl = `https://picsum.photos/seed/${encodeURIComponent(prompt)}/1280/720?blur=2`;

  // Fallback if no API Key is provided
  if (!ai) {
    console.warn("GEMINI_API_KEY not found. Using fallback placeholder.");
    return fallbackUrl;
  }

  try {
    const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: `Tactical surveillance style, CCTV feed aesthetic, ${prompt}, high contrast, security monitoring theme`,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio: '16:9',
      },
    });

    if (response.generatedImages && response.generatedImages.length > 0) {
      const base64EncodeString = response.generatedImages[0].image?.imageBytes;
      if (base64EncodeString) {
        return `data:image/jpeg;base64,${base64EncodeString}`;
      }
    }
    
    throw new Error("No image generated");
  } catch (error) {
    console.error("Error generating image with Imagen AI:", error);
    // Return fallback if generation fails
    return fallbackUrl;
  }
}

/**
 * Generates a specific placeholder for a camera feed.
 */
export async function generateCameraFeedPlaceholder(cameraName: string, location: string): Promise<string> {
  const prompt = `Security camera view of ${location}, showing ${cameraName} perspective, night vision or low light tactical look`;
  return generateSurveillancePlaceholder(prompt);
}

/**
 * Generates a status indicator image for a DVR.
 */
export async function generateDVRStatusPlaceholder(dvrName: string): Promise<string> {
  const prompt = `Technical dashboard showing status for DVR ${dvrName}, server rack environment, glowing status lights, tactical interface`;
  return generateSurveillancePlaceholder(prompt);
}

