import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { SwitchPort } from '../lib/types'

export function useSwitchPorts(switchId: string | null) {
  const [ports, setPorts] = useState<SwitchPort[]>([])
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async () => {
    if (!switchId) { setPorts([]); return }
    setLoading(true)
    const { data, error } = await supabase
      .from('switch_ports')
      .select('*')
      .eq('switch_id', switchId)
      .order('port_number')
    if (!error) setPorts((data as SwitchPort[]) || [])
    setLoading(false)
  }, [switchId])

  useEffect(() => { fetch() }, [fetch])

  const savePort = async (port: { port_number: number; device_type?: string | null; device_name?: string | null; notes?: string }) => {
    if (!switchId) return { error: 'Sem switch' }
    const { data: existing } = await supabase
      .from('switch_ports')
      .select('id')
      .eq('switch_id', switchId)
      .eq('port_number', port.port_number)
      .single()

    if (existing) {
      const { error } = await supabase.from('switch_ports').update({
        device_type: port.device_type || null,
        device_name: port.device_name || null,
        notes: port.notes || null,
      }).eq('id', existing.id)
      if (error) return { error: error.message }
    } else {
      const { error } = await supabase.from('switch_ports').insert({
        switch_id: switchId,
        port_number: port.port_number,
        device_type: port.device_type || null,
        device_name: port.device_name || null,
        notes: port.notes || null,
      })
      if (error) return { error: error.message }
    }
    await fetch()
    return { error: null }
  }

  return { ports, loading, savePort, refetch: fetch }
}
