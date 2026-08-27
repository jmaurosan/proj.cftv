// Traduz mensagens de erro do Supabase/PostgreSQL para PT-BR
// Mantém a mensagem legível para o usuário final

interface ErrorLike {
  message?: string
  code?: string
  details?: string
  hint?: string
}

// Dicionário de constraints conhecidas → mensagens amigáveis
const CONSTRAINT_MESSAGES: Record<string, string> = {
  uq_cameras_dvr_channel:
    'Já existe uma câmera cadastrada neste canal do DVR. Escolha outro canal ou edite a câmera existente.',
  uq_cameras_ip_address:
    'Já existe uma câmera cadastrada com este endereço IP.',
  uq_cameras_client_name:
    'Já existe uma câmera cadastrada com este nome para o cliente.',
  uq_cameras_balun_port:
    'Esta porta do Power Balun já está vinculada a outra câmera.',
  uq_cameras_switch_port:
    'Esta porta do switch já está vinculada a outro dispositivo.',
  uq_dvrs_ip_address:
    'Já existe um DVR cadastrado com este endereço IP.',
  uq_dvrs_client_name:
    'Já existe um DVR cadastrado com este nome para o cliente.',
  uq_switches_ip_address:
    'Já existe um switch cadastrado com este endereço IP.',
  uq_balun_ports_balun_port:
    'Esta porta do Power Balun já está em uso.',
  uq_switch_ports_switch_port:
    'Esta porta do Switch já está em uso.',
  uq_dvr_channels_dvr_channel:
    'Este canal do DVR já está cadastrado.',
  uq_balun_4x1_outputs_balun_output:
    'Esta saída 4x1 já está cadastrada neste Power Balun.',
  cameras_dvr_id_fkey:
    'DVR vinculado não foi encontrado.',
  cameras_balun_id_fkey:
    'Power Balun vinculado não foi encontrado.',
  cameras_switch_id_fkey:
    'Switch vinculado não foi encontrado.',
  cameras_client_id_fkey:
    'Cliente vinculado não foi encontrado.',
}

export function translateError(err: unknown): string {
  if (!err) return 'Erro desconhecido.'

  const e = (typeof err === 'string' ? { message: err } : err) as ErrorLike
  const raw = (e.message ?? '').toLowerCase()

  // Divergência entre a versão publicada do app e o schema do banco.
  if (raw.includes('schema cache') || raw.includes('could not find the') && raw.includes('column')) {
    return 'O banco de dados está desatualizado e esta alteração não foi salva. Aplique a migration indicada no aviso do sistema.'
  }

  // 1. Violação de unique constraint — tenta extrair o nome da constraint
  if (raw.includes('duplicate key') || raw.includes('unique constraint')) {
    const match = (e.message ?? '').match(/constraint ["']?([\w_]+)["']?/i)
    const constraint = match?.[1]
    if (constraint && CONSTRAINT_MESSAGES[constraint]) {
      return CONSTRAINT_MESSAGES[constraint]
    }
    return 'Registro duplicado: já existe um cadastro com estes dados.'
  }

  // 2. Violação de foreign key
  if (raw.includes('foreign key') || raw.includes('violates foreign')) {
    const match = (e.message ?? '').match(/constraint ["']?([\w_]+)["']?/i)
    const constraint = match?.[1]
    if (constraint && CONSTRAINT_MESSAGES[constraint]) {
      return CONSTRAINT_MESSAGES[constraint]
    }
    return 'Referência inválida: o registro vinculado não existe ou foi removido.'
  }

  // 3. Violação de not-null
  if (raw.includes('null value') && raw.includes('not-null')) {
    const match = (e.message ?? '').match(/column ["']?([\w_]+)["']?/i)
    const col = match?.[1]
    return col
      ? `O campo "${col}" é obrigatório.`
      : 'Um campo obrigatório não foi preenchido.'
  }

  // 4. Check constraint
  if (raw.includes('check constraint') || raw.includes('violates check')) {
    return 'Um dos valores informados não é válido.'
  }

  // 5. RLS / permissão
  if (raw.includes('row-level security') || raw.includes('permission denied') || raw.includes('rls')) {
    return 'Você não tem permissão para realizar esta ação.'
  }

  // 6. Autenticação
  if (raw.includes('invalid login') || raw.includes('invalid credentials')) {
    return 'E-mail ou senha inválidos.'
  }
  if (raw.includes('user already registered') || raw.includes('already been registered')) {
    return 'Este e-mail já está cadastrado.'
  }
  if (raw.includes('email not confirmed')) {
    return 'E-mail ainda não confirmado. Verifique sua caixa de entrada.'
  }

  // 7. Conexão / rede
  if (raw.includes('network') || raw.includes('failed to fetch')) {
    return 'Falha na conexão. Verifique sua internet e tente novamente.'
  }

  // 8. JWT / sessão
  if (raw.includes('jwt') || raw.includes('token')) {
    return 'Sessão expirada. Faça login novamente.'
  }

  // 9. Timeout
  if (raw.includes('timeout')) {
    return 'A operação demorou muito para responder. Tente novamente.'
  }

  // Fallback: retorna a mensagem original
  return e.message ?? 'Erro ao processar a operação.'
}
