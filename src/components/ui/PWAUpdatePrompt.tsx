import { useRegisterSW } from 'virtual:pwa-register/react'

export default function PWAUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, r) {
      // Check for updates every 30 minutes
      if (r) {
        setInterval(() => {
          r.update()
        }, 30 * 60 * 1000)
      }
      console.log('SW registrado:', swUrl)
    },
    onRegisterError(error) {
      console.error('Erro ao registrar SW:', error)
    },
  })

  if (!needRefresh) return null

  return (
    <div className="fixed bottom-4 left-4 z-[200] bg-bg-secondary border border-accent/30 rounded-xl p-4 shadow-2xl max-w-sm animate-[slideIn_0.3s_ease-out]">
      <p className="text-sm text-text-primary font-medium mb-1">
        Nova versão disponível!
      </p>
      <p className="text-xs text-text-muted mb-3">
        Atualize para obter as últimas melhorias.
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => updateServiceWorker(true)}
          className="px-3 py-1.5 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-lg transition-colors"
        >
          Atualizar
        </button>
        <button
          onClick={() => setNeedRefresh(false)}
          className="px-3 py-1.5 bg-bg-tertiary hover:bg-border text-text-primary text-sm rounded-lg transition-colors"
        >
          Depois
        </button>
      </div>
    </div>
  )
}
