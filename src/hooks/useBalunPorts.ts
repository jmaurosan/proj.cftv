import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { BalunPort } from '../lib/types'
import { useAuth } from './useAuth'
import { translateError } from '../lib/errorTranslator'
import { validatePortAssignment } from '../lib/connectionValidation'

export function useBalunPorts(balunId: string | null) {
  const { user } = useAuth()
  const [ports, setPorts] = useState<BalunPort[]>([])
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async () => {
    if (!balunId) { setPorts([]); return }
    setLoading(true)
    const { data, error } = await supabase
      .from('balun_ports')
      .select('*, cameras(name, dvr_id, channel_number, dvrs(name))')
      .eq('balun_id', balunId)
      .order('port_number')
    if (!error) setPorts((data as BalunPort[]) || [])
    setLoading(false)
  }, [balunId])

  useEffect(() => { fetch() }, [fetch])

  const savePort = async (port: { port_number: number; camera_id?: string | null; is_active?: boolean; notes?: string }) => {
    if (!balunId || !user) return { error: 'Sem balun ou usuário' }
    const { data: currentPorts, error: validationError } = await supabase
      .from('balun_ports')
      .select('port_number, camera_id, cameras(name)')
      .eq('balun_id', balunId)
    if (validationError) return { error: `Não foi possível validar as portas: ${translateError(validationError)}` }
    const conflict = validatePortAssignment(
      (currentPorts || []).map((item) => ({
        port_number: item.port_number,
        target_id: item.camera_id,
        target_name: (Array.isArray(item.cameras) ? item.cameras[0] : item.cameras)?.name,
      })),
      { port_number: port.port_number, target_id: port.camera_id },
      'Power Balun',
    )
    if (conflict) return { error: conflict }
    const { data: existing } = await supabase
      .from('balun_ports')
      .select('id, user_id')
      .eq('balun_id', balunId)
      .eq('port_number', port.port_number)
      .maybeSingle()

    if (existing) {
      const { error } = await supabase.from('balun_ports').update({
        camera_id: port.camera_id || null,
        is_active: port.is_active ?? true,
        notes: port.notes || null,
      }).eq('id', existing.id)
      if (error) return { error: translateError(error) }
    } else {
      const { error } = await supabase.from('balun_ports').insert({
        balun_id: balunId,
        port_number: port.port_number,
        camera_id: port.camera_id || null,
        is_active: port.is_active ?? true,
        notes: port.notes || null,
        user_id: user.id,
      })
      if (error) return { error: translateError(error) }
    }
    await fetch()
    return { error: null }
  }

  return { ports, loading, savePort, refetch: fetch }
}
