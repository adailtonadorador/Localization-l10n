import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from '@/components/ui/button';
import { RefreshCw, X } from 'lucide-react';

export function PWAUpdatePrompt() {
  const [showPrompt, setShowPrompt] = useState(false);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered:', r);
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  useEffect(() => {
    if (needRefresh) {
      setShowPrompt(true);
    }
  }, [needRefresh]);

  const handleUpdate = () => {
    updateServiceWorker(true);
  };

  const handleClose = () => {
    setShowPrompt(false);
    setNeedRefresh(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 bg-white border border-slate-200 rounded-xl shadow-lg p-4 z-50 animate-in slide-in-from-bottom-4">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-emerald-100 rounded-lg">
          <RefreshCw className="h-5 w-5 text-emerald-600" />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-slate-900">Nova versão disponível</h4>
          <p className="text-sm text-muted-foreground mt-1">
            Uma nova versão do aplicativo está disponível. Atualize para obter as últimas melhorias.
          </p>
          <div className="flex items-center gap-2 mt-3">
            <Button size="sm" onClick={handleUpdate} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </Button>
            <Button size="sm" variant="ghost" onClick={handleClose}>
              Depois
            </Button>
          </div>
        </div>
        <button
          onClick={handleClose}
          className="text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
