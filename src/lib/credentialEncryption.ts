const SECRET_KEY = import.meta.env.VITE_CREDENTIAL_ENCRYPTION_KEY
const encoder = new TextEncoder()
const decoder = new TextDecoder()

const toBase64 = (bytes: Uint8Array) => {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

const fromBase64 = (value: string) => {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

const deriveKey = async () => {
  if (!SECRET_KEY) {
    throw new Error('VITE_CREDENTIAL_ENCRYPTION_KEY is required for encrypted credentials.')
  }
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(SECRET_KEY))
  return crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt', 'decrypt'])
}

const looksEncrypted = (value: string) => {
  if (!value || !value.includes('.')) return false
  const parts = value.split('.')
  if (parts.length !== 2) return false
  const [ivPart, payloadPart] = parts
  if (ivPart.length < 16 || payloadPart.length < 24) return false
  return parts.every((part) => part.length > 0 && /^[A-Za-z0-9+/=_-]+$/.test(part))
}

export const encryptSecret = async (value: string | null | undefined) => {
  if (value == null || value === '') return value ?? null
  if (looksEncrypted(value)) return value

  const key = await deriveKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(value))
  return `${toBase64(iv)}.${toBase64(new Uint8Array(encrypted))}`
}

export const decryptSecret = async (value: string | null | undefined) => {
  if (value == null || value === '') return value ?? null
  if (!looksEncrypted(value)) return value

  const [ivBase64, cipherBase64] = value.split('.')
  if (!ivBase64 || !cipherBase64) return value

  try {
    const key = await deriveKey()
    const iv = fromBase64(ivBase64)
    const ciphertext = fromBase64(cipherBase64)
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
    return decoder.decode(decrypted)
  } catch {
    return value
  }
}
