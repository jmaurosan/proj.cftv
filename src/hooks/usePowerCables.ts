import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type {
  PowerCable,
  PowerCableInsert,
  PowerCableUpdate,
} from '../lib/types'
import { useAuth } from './useAuth'
import { useClient } from '../contexts/ClientContext'
import { translateError } from '../lib/errorTranslator'

interface PowerCableRow extends Omit<PowerCable, 'camera_ids'> {
  power_cable_cameras?: Array<{ camera_id: string }>
}

const flattenCameras = (row: PowerCableRow): PowerCable => ({
  ...row,
  camera_ids: (row.power_cable_cameras ?? []).map((c) => c.camera_id),
})

export function usePowerCables() {
  const { user } = useAuth()
  const { selectedClientId } = useClient()
  const [data, setData] = useState<PowerCable[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!selectedClientId) {
      setData([])
      setLoading(false)
      setError(null)
      return
    }
    setLoading(true)
    const { data: rows, error: err } = await supabase
      .from('power_cables')
      .select('*, power_cable_cameras(camera_id)')
      .eq('client_id', selectedClientId)
      .order('created_at', { ascending: false })
    if (err) {
      setError(translateError(err))
    } else {
      setError(null)
      setData(((rows as PowerCableRow[]) || []).map(flattenCameras))
    }
    setLoading(false)
  }, [selectedClientId])

  useEffect(() => { fetch() }, [fetch])

  /**
   * Cria o cabo paralelo e vincula as câmeras alimentadas por ele.
   * Rollback manual caso o vínculo M2M falhe após o cabo ser criado.
   */
  const create = async (
    cable: Omit<PowerCableInsert, 'user_id' | 'client_id' | 'legacy_cable_id'>,
    cameraIds: string[],
  ) => {
    if (!user) return { error: 'Não autenticado' }
    if (!selectedClientId) return { error: 'Selecione um cliente antes de cadastrar cabo de alimentação' }

    const payload = {
      ...cable,
      user_id: user.id,
      client_id: selectedClientId,
    }

    const { data: inserted, error: insErr } = await supabase
      .from('power_cables')
      .insert(payload)
      .select()
      .single()

    if (insErr || !inserted) return { error: translateError(insErr) }
    const cableId = (inserted as PowerCable).id

    if (cameraIds.length > 0) {
      const links = cameraIds.map((cameraId) => ({
        power_cable_id: cableId,
        camera_id: cameraId,
      }))
      const { error: linkErr } = await supabase.from('power_cable_cameras').insert(links)
      if (linkErr) {
        await supabase.from('power_cables').delete().eq('id', cableId)
        return { error: translateError(linkErr) }
      }
    }

    await fetch()
    return { error: null, id: cableId }
  }

  /**
   * Atualiza o cabo e, se cameraIds for passado, substitui todas as ligações.
   */
  const update = async (
    id: string,
    cable: PowerCableUpdate,
    cameraIds?: string[],
  ) => {
    const { error: updErr } = await supabase.from('power_cables').update(cable).eq('id', id)
    if (updErr) return { error: translateError(updErr) }

    if (cameraIds) {
      const { error: delErr } = await supabase
        .from('power_cable_cameras')
        .delete()
        .eq('power_cable_id', id)
      if (delErr) return { error: translateError(delErr) }
      if (cameraIds.length > 0) {
        const links = cameraIds.map((cameraId) => ({
          power_cable_id: id,
          camera_id: cameraId,
        }))
        const { error: linkErr } = await supabase.from('power_cable_cameras').insert(links)
        if (linkErr) return { error: translateError(linkErr) }
      }
    }

    await fetch()
    return { error: null }
  }

  const remove = async (id: string) => {
    const { error: delErr } = await supabase.from('power_cables').delete().eq('id', id)
    if (delErr) return { error: translateError(delErr) }
    await fetch()
    return { error: null }
  }

  const cablesByCamera = (cameraId: string) =>
    data.filter((cable) => cable.camera_ids?.includes(cameraId))

  return {
    data,
    loading,
    error,
    create,
    update,
    remove,
    refetch: fetch,
    cablesByCamera,
  }
}
