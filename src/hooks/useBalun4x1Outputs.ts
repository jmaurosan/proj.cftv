import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Balun4x1Output } from '../lib/types'
import { translateError } from '../lib/errorTranslator'

// Calcula as saídas 4x1 baseado no total de portas
export function get4x1Outputs(totalPorts: number): Array<{ output_number: number; channel_start: number; channel_end: number }> {
  if (totalPorts < 4) return []
  
  const outputs = []
  const numOutputs = Math.floor(totalPorts / 4)
  
  for (let i = 0; i < numOutputs; i++) {
    outputs.push({
      output_number: i + 1,
      channel_start: i * 4 + 1,
      channel_end: (i + 1) * 4,
    })
  }
  return outputs
}

export function useBalun4x1Outputs(balunId: string | null) {
  const [outputs, setOutputs] = useState<Balun4x1Output[]>([])
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async () => {
    if (!balunId) { setOutputs([]); return }
    setLoading(true)
    const { data, error } = await supabase
      .from('balun_4x1_outputs')
      .select('*')
      .eq('balun_id', balunId)
      .order('output_number')
    if (!error) setOutputs((data as Balun4x1Output[]) || [])
    setLoading(false)
  }, [balunId])

  useEffect(() => { fetch() }, [fetch])

  const saveOutput = async (output: { output_number: number; channel_start: number; channel_end: number; notes?: string }) => {
    if (!balunId) return { error: 'Sem balun' }
    const { data: existing } = await supabase
      .from('balun_4x1_outputs')
      .select('id')
      .eq('balun_id', balunId)
      .eq('output_number', output.output_number)
      .single()

    if (existing) {
      const { error } = await supabase.from('balun_4x1_outputs').update({
        notes: output.notes || null,
      }).eq('id', existing.id)
      if (error) return { error: translateError(error) }
    } else {
      const { error } = await supabase.from('balun_4x1_outputs').insert({
        balun_id: balunId,
        output_number: output.output_number,
        channel_start: output.channel_start,
        channel_end: output.channel_end,
        notes: output.notes || null,
      })
      if (error) return { error: translateError(error) }
    }
    await fetch()
    return { error: null }
  }

  const deleteOutput = async (outputNumber: number) => {
    if (!balunId) return { error: 'Sem balun' }
    const { error } = await supabase
      .from('balun_4x1_outputs')
      .delete()
      .eq('balun_id', balunId)
      .eq('output_number', outputNumber)
    if (error) return { error: translateError(error) }
    await fetch()
    return { error: null }
  }

  return { outputs, loading, saveOutput, deleteOutput, refetch: fetch }
}