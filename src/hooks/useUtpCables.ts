import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type {
  UtpCable,
  UtpCableInsert,
  UtpCableUpdate,
  UtpCablePairInput,
} from '../lib/types'
import { useAuth } from './useAuth'
import { useClient } from '../contexts/ClientContext'
import { translateError } from '../lib/errorTranslator'
import { validateCablePairs, type CablePair } from '../lib/cableConfiguration'
import type { PairFunction } from '../lib/balunConfiguration'

export function useUtpCables() {
  const { user } = useAuth()
  const { selectedClientId } = useClient()
  const [data, setData] = useState<UtpCable[]>([])
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
      .from('utp_cables')
      .select('*, utp_cable_pairs(*)')
      .eq('client_id', selectedClientId)
      .order('created_at', { ascending: false })
    if (err) {
      setError(translateError(err))
    } else {
      setError(null)
      setData((rows as UtpCable[]) || [])
    }
    setLoading(false)
  }, [selectedClientId])

  useEffect(() => { fetch() }, [fetch])

  const runPairValidation = (pairs: UtpCablePairInput[]) => {
    const asCablePairs: CablePair[] = pairs.map((p) => ({
      pair_number: p.pair_number,
      function: p.function as PairFunction,
      camera_id: p.camera_id,
    }))
    return validateCablePairs(asCablePairs)
  }

  /**
   * Cria um cabo + seus 4 pares. Se qualquer inserção falhar, remove o cabo
   * recém-criado (rollback manual). Supabase JS não expõe transação REST.
   */
  const create = async (
    cable: Omit<UtpCableInsert, 'user_id' | 'client_id' | 'legacy_cable_id'>,
    pairs: UtpCablePairInput[],
  ) => {
    if (!user) return { error: 'Não autenticado' }
    if (!selectedClientId) return { error: 'Selecione um cliente antes de cadastrar cabo' }

    const validation = runPairValidation(pairs)
    if (!validation.valid) return { error: validation.errors.join(' ') }

    const cablePayload = {
      ...cable,
      user_id: user.id,
      client_id: selectedClientId,
    }

    const { data: inserted, error: insertErr } = await supabase
      .from('utp_cables')
      .insert(cablePayload)
      .select()
      .single()

    if (insertErr || !inserted) return { error: translateError(insertErr) }
    const cableId = (inserted as UtpCable).id

    const pairRows = pairs.map((p) => ({
      cable_id: cableId,
      pair_number: p.pair_number,
      function: p.function,
      camera_id: p.camera_id,
      wire1_color: p.wire1_color,
      wire2_color: p.wire2_color,
    }))
    const { error: pairsErr } = await supabase.from('utp_cable_pairs').insert(pairRows)

    if (pairsErr) {
      await supabase.from('utp_cables').delete().eq('id', cableId)
      return { error: translateError(pairsErr) }
    }

    await fetch()
    return { error: null, id: cableId }
  }

  /**
   * Atualiza o cabo e substitui todos os 4 pares pela nova configuração.
   * A regra de "exatamente 4 pares" fica garantida na aplicação e reforçada
   * pela unique (cable_id, pair_number) no banco.
   */
  const update = async (
    id: string,
    cable: UtpCableUpdate,
    pairs?: UtpCablePairInput[],
  ) => {
    if (pairs) {
      const validation = runPairValidation(pairs)
      if (!validation.valid) return { error: validation.errors.join(' ') }
    }

    const { error: updErr } = await supabase.from('utp_cables').update(cable).eq('id', id)
    if (updErr) return { error: translateError(updErr) }

    if (pairs) {
      const { error: delErr } = await supabase.from('utp_cable_pairs').delete().eq('cable_id', id)
      if (delErr) return { error: translateError(delErr) }
      const pairRows = pairs.map((p) => ({
        cable_id: id,
        pair_number: p.pair_number,
        function: p.function,
        camera_id: p.camera_id,
        wire1_color: p.wire1_color,
        wire2_color: p.wire2_color,
      }))
      const { error: insErr } = await supabase.from('utp_cable_pairs').insert(pairRows)
      if (insErr) return { error: translateError(insErr) }
    }

    await fetch()
    return { error: null }
  }

  const remove = async (id: string) => {
    const { error: delErr } = await supabase.from('utp_cables').delete().eq('id', id)
    if (delErr) return { error: translateError(delErr) }
    await fetch()
    return { error: null }
  }

  /**
   * Retorna os cabos que contêm a câmera dada em algum par (independente da função).
   */
  const cablesByCamera = (cameraId: string) =>
    data.filter((cable) => cable.utp_cable_pairs?.some((p) => p.camera_id === cameraId))

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
