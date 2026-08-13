import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Camera, CameraInsert, CameraUpdate } from '../lib/types'
import { useAuth } from './useAuth'
import { useClient } from '../contexts/ClientContext'
import { translateError } from '../lib/errorTranslator'
import { validateCameraConflicts, type CameraConnectionRecord } from '../lib/connectionValidation'

const IMAGE_FIELDS = new Set(['installation_photo_url', 'qr_code_url'])

const getMissingCameraColumn = (error: unknown) => {
  const message = String((error as { message?: string })?.message || error || '')
  if (!message.toLowerCase().includes('schema cache')) return null
  return message.match(/could not find the ['"]([^'"]+)['"] column/i)?.[1] ?? null
}

const insertWithSchemaFallback = async (payload: Record<string, unknown>) => {
  const compatiblePayload = { ...payload }

  for (let attempt = 0; attempt < 15; attempt++) {
    const { error } = await supabase.from('cameras').insert(compatiblePayload)
    if (!error) return null

    const missingColumn = getMissingCameraColumn(error)
    if (!missingColumn || IMAGE_FIELDS.has(missingColumn) || !(missingColumn in compatiblePayload)) {
      return error
    }
    delete compatiblePayload[missingColumn]
  }

  return new Error('Não foi possível compatibilizar o cadastro com a estrutura atual do banco.')
}

const updateWithSchemaFallback = async (id: string, payload: Record<string, unknown>) => {
  const compatiblePayload = { ...payload }

  for (let attempt = 0; attempt < 15; attempt++) {
    const { error } = await supabase.from('cameras').update(compatiblePayload).eq('id', id)
    if (!error) return null

    const missingColumn = getMissingCameraColumn(error)
    if (!missingColumn || IMAGE_FIELDS.has(missingColumn) || !(missingColumn in compatiblePayload)) {
      return error
    }
    delete compatiblePayload[missingColumn]
  }

  return new Error('Não foi possível compatibilizar a atualização com a estrutura atual do banco.')
}

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
    const finalPayload = {
      ...payload,
      user_id: user.id,
      client_id: payload.client_id ?? selectedClientId ?? null,
    }
    const conflict = await validateBeforeSave(finalPayload)
    if (conflict) return { error: conflict }
    const error = await insertWithSchemaFallback(finalPayload)
    if (error) return { error: translateError(error) }
    await fetch()
    return { error: null }
  }

  const update = async (id: string, payload: CameraUpdate) => {
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

    if (dvrChannelOccupant) {
      const temporaryReleaseError = await updateWithSchemaFallback(id, {
        dvr_id: null,
        channel_number: null,
      })
      if (temporaryReleaseError) return { error: translateError(temporaryReleaseError) }

      const swapPayload: CameraUpdate = {
        dvr_id: current?.dvr_id ?? null,
        channel_number: current?.channel_number ?? null,
      }
      const swapError = await updateWithSchemaFallback(dvrChannelOccupant.id, swapPayload)
      if (swapError) return { error: translateError(swapError) }
    }

    const error = await updateWithSchemaFallback(id, payload)
    if (error) return { error: translateError(error) }
    await fetch()
    return { error: null }
  }

  const remove = async (id: string) => {
    const { error } = await supabase.from('cameras').delete().eq('id', id)
    if (error) return { error: translateError(error) }
    await fetch()
    return { error: null }
  }

  return { data, loading, error, create, update, remove, refetch: fetch }
}
