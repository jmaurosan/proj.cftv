import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Camera, CameraInsert, CameraUpdate } from '../lib/types'
import { useAuth } from './useAuth'
import { useClient } from '../contexts/ClientContext'
import { translateError } from '../lib/errorTranslator'
import { validateCameraConflicts, type CameraConnectionRecord } from '../lib/connectionValidation'
import { requireCompatibleSchema } from '../lib/schemaCompatibility'

export function useCameras() {
  const { user } = useAuth()
  const { selectedClientId } = useClient()
  const [data, setData] = useState<Camera[]>([])
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
    let query = supabase.from('cameras').select('*, dvrs(name, analog_channels, disabled_analog_channels)').order('created_at', { ascending: false })
    query = query.eq('client_id', selectedClientId)
    const { data, error } = await query
    if (error) setError(translateError(error))
    else setData(data as Camera[])
    setLoading(false)
  }, [selectedClientId])

  useEffect(() => { fetch() }, [fetch])

  const validateBeforeSave = async (
    candidate: CameraConnectionRecord,
    editingId?: string,
    options: { allowDvrChannelConflict?: boolean } = {},
  ) => {
    const clientId = (candidate as CameraConnectionRecord & { client_id?: string | null }).client_id ?? selectedClientId
    if (!clientId) return 'Selecione um cliente antes de cadastrar câmera'

    const { data: currentCameras, error: camerasError } = await supabase
      .from('cameras')
      .select('id, name, ip_address, dvr_id, channel_number, balun_id, balun_port, switch_id, switch_port, dvrs(name)')
      .eq('client_id', clientId)
    if (camerasError) return `Não foi possível validar as conexões: ${translateError(camerasError)}`

    const cameraConflict = validateCameraConflicts(currentCameras || [], candidate, editingId, options)
    if (cameraConflict) return cameraConflict

    if (candidate.balun_id && candidate.balun_port != null) {
      const { data: balunPort, error: balunError } = await supabase
        .from('balun_ports')
        .select('camera_id, cameras(name)')
        .eq('balun_id', candidate.balun_id)
        .eq('port_number', candidate.balun_port)
        .maybeSingle()
      if (balunError) return `Não foi possível validar a porta do Power Balun: ${translateError(balunError)}`
      if (balunPort?.camera_id && balunPort.camera_id !== editingId) {
        const linkedCamera = Array.isArray(balunPort.cameras) ? balunPort.cameras[0] : balunPort.cameras
        return `A porta ${candidate.balun_port} do Power Balun já está sendo utilizada pela câmera "${linkedCamera?.name || 'outra câmera'}".`
      }
    }

    if (candidate.switch_id && candidate.switch_port != null) {
      const { data: switchPort, error: switchError } = await supabase
        .from('switch_ports')
        .select('device_id, device_name')
        .eq('switch_id', candidate.switch_id)
        .eq('port_number', candidate.switch_port)
        .maybeSingle()
      if (switchError) return `Não foi possível validar a porta do switch: ${translateError(switchError)}`
      if (switchPort?.device_id && switchPort.device_id !== editingId) {
        return `A porta ${candidate.switch_port} do switch já está sendo utilizada por "${switchPort.device_name || 'outro dispositivo'}".`
      }
    }

    return null
  }

  const create = async (payload: Omit<CameraInsert, 'user_id'>) => {
    if (!user) return { error: 'Não autenticado' }
    if (!selectedClientId && !payload.client_id) return { error: 'Selecione um cliente antes de cadastrar câmera' }
    const schemaError = await requireCompatibleSchema()
    if (schemaError) return { error: schemaError.message }
    const finalPayload = {
      ...payload,
      user_id: user.id,
      client_id: payload.client_id ?? selectedClientId ?? null,
    }
    const conflict = await validateBeforeSave(finalPayload)
    if (conflict) return { error: conflict }
    const { error } = await supabase.from('cameras').insert(finalPayload)
    if (error) return { error: translateError(error) }
    await fetch()
    return { error: null }
  }

  const update = async (id: string, payload: CameraUpdate) => {
    const schemaError = await requireCompatibleSchema()
    if (schemaError) return { error: schemaError.message }
    const current = data.find((camera) => camera.id === id)
    const candidate = { ...current, ...payload }
    const dvrChannelOccupant = data.find((camera) => (
      camera.id !== id &&
      camera.dvr_id === candidate.dvr_id &&
      camera.channel_number === candidate.channel_number &&
      Boolean(candidate.dvr_id) &&
      candidate.channel_number != null
    ))

    const conflict = await validateBeforeSave(candidate, id, {
      allowDvrChannelConflict: Boolean(dvrChannelOccupant),
    })
    if (conflict) return { error: conflict }

    const connectionsChanged = current?.dvr_id !== (candidate.dvr_id ?? null)
      || current?.channel_number !== (candidate.channel_number ?? null)
      || current?.balun_id !== (candidate.balun_id ?? null)
      || current?.balun_port !== (candidate.balun_port ?? null)
      || current?.switch_id !== (candidate.switch_id ?? null)
      || current?.switch_port !== (candidate.switch_port ?? null)
    const {
      dvr_id: _dvrId,
      channel_number: _channelNumber,
      balun_id: _balunId,
      balun_port: _balunPort,
      switch_id: _switchId,
      switch_port: _switchPort,
      ...nonConnectionPayload
    } = payload
    void _dvrId
    void _channelNumber
    void _balunId
    void _balunPort
    void _switchId
    void _switchPort

    if (connectionsChanged) {
      const { error: moveError } = await supabase.rpc('update_camera_connections', {
        p_camera_id: id,
        p_dvr_id: candidate.dvr_id ?? null,
        p_channel_number: candidate.channel_number ?? null,
        p_balun_id: candidate.balun_id ?? null,
        p_balun_port: candidate.balun_port ?? null,
        p_switch_id: candidate.switch_id ?? null,
        p_switch_port: candidate.switch_port ?? null,
      })
      if (moveError) return { error: translateError(moveError) }
    }

    const hasNonConnectionChanges = Object.keys(nonConnectionPayload).length > 0
    const { error } = hasNonConnectionChanges
      ? await supabase.from('cameras').update(nonConnectionPayload).eq('id', id)
      : { error: null }
    if (error) {
      return { error: translateError(error) }
    }

    // switch_ports mantém um rótulo desnormalizado para exibição. O vínculo real
    // continua sendo o ID da câmera; ao renomeá-la, mantenha o rótulo em sincronia.
    if (typeof candidate.name === 'string' && candidate.name.trim()) {
      await supabase
        .from('switch_ports')
        .update({ device_name: candidate.name.trim() })
        .eq('device_type', 'camera')
        .eq('device_id', id)
    }
    await fetch()
    return { error: null }
  }

  const remove = async (id: string) => {
    const schemaError = await requireCompatibleSchema()
    if (schemaError) return { error: schemaError.message }
    const { error } = await supabase.from('cameras').delete().eq('id', id)
    if (error) return { error: translateError(error) }
    await fetch()
    return { error: null }
  }

  return { data, loading, error, create, update, remove, refetch: fetch }
}
