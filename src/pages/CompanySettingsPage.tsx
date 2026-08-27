import { useEffect, useState } from 'react'
import { Building2, Image, Save } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../components/ui/Toast'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { DEFAULT_COMPANY_BRANDING, getCompanyLogoUrl, uploadCompanyLogo, type CompanyBranding } from '../lib/companyBranding'

export default function CompanySettingsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [form, setForm] = useState<CompanyBranding>(DEFAULT_COMPANY_BRANDING)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      if (!user) return
      const { data } = await supabase.from('company_profiles').select('*').eq('user_id', user.id).maybeSingle()
      if (data) setForm(data as CompanyBranding)
      setLoading(false)
    }
    void load()
  }, [user])

  const update = (field: keyof CompanyBranding, value: string) => setForm(current => ({ ...current, [field]: value || null }))
  const save = async () => {
    if (!user || !form.company_name.trim()) { toast('Informe o nome da empresa.', 'error'); return }
    setSaving(true)
    let logoPath = form.logo_path
    if (logoFile) {
      const uploaded = await uploadCompanyLogo(logoFile, user.id)
      if (uploaded.error) { setSaving(false); toast(uploaded.error, 'error'); return }
      logoPath = uploaded.path
    }
    const result = await supabase.from('company_profiles').upsert({ ...form, company_name: form.company_name.trim(), logo_path: logoPath, user_id: user.id, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    setSaving(false)
    if (result.error) { toast(result.error.message, 'error'); return }
    setForm(current => ({ ...current, logo_path: logoPath })); setLogoFile(null)
    window.dispatchEvent(new Event('company-branding-updated'))
    toast('Identidade da empresa atualizada.')
  }

  if (loading) return <LoadingSpinner />
  const logoUrl = logoFile ? URL.createObjectURL(logoFile) : getCompanyLogoUrl(form.logo_path)
  return <div className="max-w-4xl space-y-5">
    <div><h1 className="text-xl font-semibold text-text-primary flex items-center gap-2"><Building2 className="w-5 h-5 text-accent" /> Empresa e identidade visual</h1><p className="text-sm text-text-muted mt-1">Dados da empresa operadora exibidos no sistema e usados futuramente nos documentos.</p></div>
    <section className="bg-bg-secondary border border-border-light rounded-lg p-5 space-y-5">
      <div className="flex flex-col sm:flex-row gap-5 sm:items-center"><div className="w-28 h-28 rounded-lg border border-border-light bg-bg-primary flex items-center justify-center overflow-hidden shrink-0">{logoUrl ? <img src={logoUrl} alt="Logo da empresa" className="w-full h-full object-contain p-2" /> : <Image className="w-8 h-8 text-text-muted" />}</div><div><label className="block text-sm font-medium text-text-secondary mb-2">Logo da empresa</label><input type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" onChange={event => setLogoFile(event.target.files?.[0] || null)} className="text-sm text-text-muted" /><p className="text-xs text-text-muted mt-2">PNG, JPG, WebP ou SVG, até 5 MB. Prefira fundo transparente.</p></div></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><Input label="Nome da empresa" value={form.company_name} onChange={event => update('company_name', event.target.value)} /><Input label="Nome comercial" value={form.trade_name || ''} onChange={event => update('trade_name', event.target.value)} /><Input label="CNPJ ou CPF" value={form.document_number || ''} onChange={event => update('document_number', event.target.value)} /><Input label="Telefone" value={form.phone || ''} onChange={event => update('phone', event.target.value)} /><Input label="E-mail" type="email" value={form.email || ''} onChange={event => update('email', event.target.value)} /><Input label="Cor principal" type="color" value={form.primary_color} onChange={event => update('primary_color', event.target.value)} /><div className="sm:col-span-2"><Input label="Endereço" value={form.address || ''} onChange={event => update('address', event.target.value)} /></div></div>
      <div className="flex justify-end"><Button onClick={() => void save()} disabled={saving}><Save className="w-4 h-4" /> {saving ? 'Salvando...' : 'Salvar identidade'}</Button></div>
    </section>
  </div>
}
