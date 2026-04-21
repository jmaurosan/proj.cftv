import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { BalunPort } from '../lib/types'

export function useBalunPorts(balunId: string | null) {
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

  const savePort = async (port: { port_number: number; camera_id?: string | null; notes?: string }) => {
    if (!balunId) return { error: 'Sem balun' }
    const { data: existing } = await supabase
      .from('balun_ports')
      .select('id')
      .eq('balun_id', balunId)
      .eq('port_number', port.port_number)
      .single()

    if (existing) {
      const { error } = await supabase.from('balun_ports').update({
        camera_id: port.camera_id || null,
        notes: port.notes || null,
      }).eq('id', existing.id)
      if (error) return { error: error.message }
    } else {
      const { error } = await supabase.from('balun_ports').insert({
        balun_id: balunId,
        port_number: port.port_number,
        camera_id: port.camera_id || null,
        notes: port.notes || null,
      })
      if (error) return { error: error.message }
    }
    await fetch()
    return { error: null }
  }

  return { ports, loading, savePort, refetch: fetch }
}
