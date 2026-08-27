import { supabase } from './supabase'

export interface CompanyBranding {
  company_name: string
  trade_name: string | null
  document_number: string | null
  phone: string | null
  email: string | null
  address: string | null
  logo_path: string | null
  primary_color: string
}

export const DEFAULT_COMPANY_BRANDING: CompanyBranding = {
  company_name: 'Sistema CFTV', trade_name: null, document_number: null,
  phone: null, email: null, address: null, logo_path: null, primary_color: '#0891B2',
}

export function getCompanyLogoUrl(path: string | null | undefined) {
  if (!path) return null
  return supabase.storage.from('company-logos').getPublicUrl(path).data.publicUrl
}

export async function uploadCompanyLogo(file: File, userId: string) {
  const extension = file.name.split('.').pop()?.toLowerCase() || 'png'
  const path = `${userId}/logo-${Date.now()}.${extension}`
  const result = await supabase.storage.from('company-logos').upload(path, file, { upsert: true, contentType: file.type })
  return result.error ? { path: null, error: result.error.message } : { path, error: null }
}
