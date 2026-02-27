import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { RefreshCw, X, Download, Smartphone, Zap, Bell, Wifi, Sparkles, Share, PlusSquare } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Detectar se é iOS
function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
}

// Detectar se está em modo standalone (já instalado)
function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true;
}

// Detectar se é mobile
function isMobile() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export function PWAUpdatePrompt() {
  const { profile } = useAuth();
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOSDevice, setIsIOSDevice] = useState(false);

  // Só mostra prompt de instalação para usuários logados
  const isLoggedIn = !!profile;

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

  // Listen for beforeinstallprompt event
  useEffect(() => {
    // Verificar se já está instalado
    if (isStandalone()) {
      console.log('App já está instalado');
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      // Check if user has dismissed the prompt before
      const dismissed = localStorage.getItem('pwa-install-dismissed');
      const dismissedTime = localStorage.getItem('pwa-install-dismissed-time');

      // Se foi dispensado há mais de 7 dias, mostrar novamente
      if (dismissed && dismissedTime) {
        const daysSinceDismissed = (Date.now() - parseInt(dismissedTime)) / (1000 * 60 * 60 * 24);
        if (daysSinceDismissed > 7) {
          localStorage.removeItem('pwa-install-dismissed');
          localStorage.removeItem('pwa-install-dismissed-time');
          setShowInstallPrompt(true);
        }
      } else if (!dismissed) {
        setShowInstallPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Check if app is already installed
    window.addEventListener('appinstalled', () => {
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
      console.log('PWA installed');
    });

    // Para iOS, mostrar instruções manuais após um delay
    if (isIOS() && isMobile()) {
      setIsIOSDevice(true);
      const dismissed = localStorage.getItem('pwa-install-dismissed');
      const dismissedTime = localStorage.getItem('pwa-install-dismissed-time');

      if (dismissed && dismissedTime) {
        const daysSinceDismissed = (Date.now() - parseInt(dismissedTime)) / (1000 * 60 * 60 * 24);
        if (daysSinceDismissed > 7) {
          localStorage.removeItem('pwa-install-dismissed');
          localStorage.removeItem('pwa-install-dismissed-time');
          setTimeout(() => setShowInstallPrompt(true), 3000);
        }
      } else if (!dismissed) {
        setTimeout(() => setShowInstallPrompt(true), 3000);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  useEffect(() => {
    if (needRefresh) {
      setShowUpdatePrompt(true);
    }
  }, [needRefresh]);

  const handleUpdate = () => {
    updateServiceWorker(true);
  };

  const handleCloseUpdate = () => {
    setShowUpdatePrompt(false);
    setNeedRefresh(false);
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }

    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  const handleDismissInstall = () => {
    setShowInstallPrompt(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
    localStorage.setItem('pwa-install-dismissed-time', Date.now().toString());
  };

  return (
    <>
      {/* Install Prompt - Redesigned (apenas para usuários logados) */}
      {isLoggedIn && showInstallPrompt && (deferredPrompt || isIOSDevice) && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in duration-300"
            onClick={handleDismissInstall}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="pointer-events-auto bg-white rounded-2xl shadow-2xl max-w-md w-full mx-auto overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
              {/* Header with gradient background */}
              <div className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 px-6 pt-8 pb-16">
                {/* Close button */}
                <button
                  onClick={handleDismissInstall}
                  className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
                  aria-label="Fechar"
                >
                  <X className="h-5 w-5" />
                </button>

                {/* App icon with pulse animation */}
                <div className="flex justify-center mb-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-white/20 rounded-2xl animate-ping" style={{ animationDuration: '2s' }} />
                    <div className="relative bg-white rounded-2xl p-4 shadow-lg">
                      <Smartphone className="h-12 w-12 text-blue-600" />
                    </div>
                  </div>
                </div>

                <h2 className="text-2xl font-bold text-white text-center mb-2">
                  Instalar Sama Conecta
                </h2>
                <p className="text-blue-100 text-center text-sm">
                  Leve suas oportunidades de trabalho no bolso
                </p>
              </div>

              {/* Content */}
              <div className="px-6 py-6 -mt-8">
                {/* Benefits card */}
                <div className="bg-white rounded-xl shadow-md p-5 mb-6 border border-slate-100">
                  <div className="space-y-4">
                    {/* Benefit 1 */}
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg flex items-center justify-center">
                        <Zap className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1 pt-1">
                        <h3 className="font-semibold text-slate-900 text-sm mb-0.5">
                          Acesso Instantâneo
                        </h3>
                        <p className="text-xs text-slate-600">
                          Abra o app direto da tela inicial do seu celular
                        </p>
                      </div>
                    </div>

                    {/* Benefit 2 */}
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-green-50 to-green-100 rounded-lg flex items-center justify-center">
                        <Bell className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="flex-1 pt-1">
                        <h3 className="font-semibold text-slate-900 text-sm mb-0.5">
                          Notificações em Tempo Real
                        </h3>
                        <p className="text-xs text-slate-600">
                          Seja avisado assim que surgir uma nova vaga
                        </p>
                      </div>
                    </div>

                    {/* Benefit 3 */}
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg flex items-center justify-center">
                        <Wifi className="h-5 w-5 text-purple-600" />
                      </div>
                      <div className="flex-1 pt-1">
                        <h3 className="font-semibold text-slate-900 text-sm mb-0.5">
                          Funciona Offline
                        </h3>
                        <p className="text-xs text-slate-600">
                          Acesse suas vagas salvas mesmo sem internet
                        </p>
                      </div>
                    </div>

                    {/* Benefit 4 */}
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg flex items-center justify-center">
                        <Sparkles className="h-5 w-5 text-amber-600" />
                      </div>
                      <div className="flex-1 pt-1">
                        <h3 className="font-semibold text-slate-900 text-sm mb-0.5">
                          Experiência Aprimorada
                        </h3>
                        <p className="text-xs text-slate-600">
                          Interface otimizada e mais rápida que o navegador
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action buttons - Different for iOS */}
                {isIOSDevice ? (
                  <div className="space-y-4">
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                      <p className="text-sm font-medium text-slate-900 mb-3">
                        Para instalar no seu iPhone/iPad:
                      </p>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm">
                            1
                          </div>
                          <div className="flex items-center gap-2 text-sm text-slate-700">
                            <span>Toque no ícone</span>
                            <Share className="h-5 w-5 text-blue-600" />
                            <span>Compartilhar</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm">
                            2
                          </div>
                          <div className="flex items-center gap-2 text-sm text-slate-700">
                            <span>Selecione</span>
                            <PlusSquare className="h-5 w-5 text-blue-600" />
                            <span>"Adicionar à Tela de Início"</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={handleDismissInstall}
                      variant="ghost"
                      className="w-full h-10 text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    >
                      Entendi
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Button
                      onClick={handleInstall}
                      className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-600/30 hover:shadow-xl hover:shadow-blue-600/40 transition-all duration-200"
                    >
                      <Download className="h-5 w-5 mr-2" />
                      Instalar Agora
                    </Button>

                    <Button
                      onClick={handleDismissInstall}
                      variant="ghost"
                      className="w-full h-10 text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    >
                      Talvez depois
                    </Button>
                  </div>
                )}

                {/* Trust indicator */}
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <p className="text-xs text-center text-slate-500">
                    Grátis • Seguro • Sem ocupar espaço no celular
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Update Prompt */}
      {showUpdatePrompt && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 bg-white border border-slate-200 rounded-xl shadow-lg p-4 z-50 animate-in slide-in-from-bottom-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <RefreshCw className="h-5 w-5 text-blue-700" />
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
                <Button size="sm" variant="ghost" onClick={handleCloseUpdate}>
                  Depois
                </Button>
              </div>
            </div>
            <button
              onClick={handleCloseUpdate}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
