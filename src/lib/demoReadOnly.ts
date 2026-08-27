const READ_ONLY_ACTION = /^(novo|nova|adicionar|salvar|editar|excluir|remover|vincular|anexar|enviar|importar|restaurar|redefinir|organizar|selecionar arquivo|revelar|copiar senha)/i

export function isMutationAction(label: string, buttonType = '') {
  return buttonType === 'submit' || READ_ONLY_ACTION.test(label.trim())
}
