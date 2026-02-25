/**
 * NotificationPrompt Component
 * Componente UI para solicitar permissão de notificações push
 */

import { useState } from 'react';
import { Bell, BellOff, X, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useNotifications } from '@/hooks/useNotifications';

export type NotificationPromptVariant = 'card' | 'banner' | 'inline';

interface NotificationPromptProps {
  variant?: NotificationPromptVariant;
  onDismiss?: () => void;
  className?: string;
}

export function NotificationPrompt({
  variant = 'card',
  onDismiss,
  className = '',
}: NotificationPromptProps) {
  const { permissionStatus, isSubscribed, isLoading, requestPermission } = useNotifications();
  const [dismissed, setDismissed] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  // Não mostrar se já está inscrito, já negou ou foi dismissado
  if (isSubscribed || permissionStatus === 'denied' || dismissed) {
    return null;
  }

  const handleRequestPermission = async () => {
    console.log('[NotificationPrompt] Botão clicado, solicitando permissão...');
    setIsRequesting(true);
    try {
      const result = await requestPermission();
      console.log('[NotificationPrompt] Resultado da permissão:', result);
    } catch (error) {
      console.error('[NotificationPrompt] Erro ao solicitar permissão:', error);
    }
    setIsRequesting(false);
  };

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  // Variante: Card (para dashboards)
  if (variant === 'card') {
    return (
      <Card className={`border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 ${className}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Bell className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-base text-blue-900">Ative as Notificações</CardTitle>
                <CardDescription className="text-blue-700">
                  Receba alertas de novas vagas e atualizações
                </CardDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-blue-400 hover:text-blue-600 hover:bg-blue-100"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <Button
            onClick={handleRequestPermission}
            disabled={isLoading || isRequesting}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {isRequesting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Ativando...
              </>
            ) : (
              <>
                <Bell className="h-4 w-4 mr-2" />
                Ativar Notificações
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Variante: Banner (para topo de página)
  if (variant === 'banner') {
    return (
      <div
        className={`bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3 ${className}`}
      >
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5" />
            <p className="text-sm font-medium">
              Ative as notificações para não perder nenhuma vaga!
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRequestPermission}
              disabled={isLoading || isRequesting}
              className="bg-white/20 hover:bg-white/30 text-white border-0"
            >
              {isRequesting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Ativar'
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDismiss}
              className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Variante: Inline (para dentro de outros componentes)
  return (
    <div
      className={`flex items-center justify-between gap-4 p-3 bg-blue-50 border border-blue-200 rounded-lg ${className}`}
    >
      <div className="flex items-center gap-2 text-sm text-blue-700">
        <Bell className="h-4 w-4 text-blue-600" />
        <span>Ative notificações para receber alertas de vagas</span>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleRequestPermission}
        disabled={isLoading || isRequesting}
        className="border-blue-300 text-blue-700 hover:bg-blue-100"
      >
        {isRequesting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          'Ativar'
        )}
      </Button>
    </div>
  );
}

/**
 * Componente para mostrar quando as notificações estão ativas
 */
export function NotificationActive({ className = '' }: { className?: string }) {
  return (
    <div
      className={`flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg ${className}`}
    >
      <CheckCircle2 className="h-4 w-4 text-green-600" />
      <span className="text-sm text-green-700">Notificações ativas</span>
    </div>
  );
}

/**
 * Componente para mostrar quando as notificações foram negadas
 */
export function NotificationDenied({ className = '' }: { className?: string }) {
  const handleOpenSettings = () => {
    // Informa o usuário como ativar nas configurações do navegador
    alert(
      'Para ativar as notificações:\n\n' +
        '1. Clique no ícone de cadeado ou informações na barra de endereço\n' +
        '2. Encontre a opção "Notificações"\n' +
        '3. Altere para "Permitir"\n' +
        '4. Recarregue a página'
    );
  };

  return (
    <Alert className={`border-amber-200 bg-amber-50 ${className}`}>
      <BellOff className="h-4 w-4 text-amber-600" />
      <AlertTitle className="text-amber-800">Notificações bloqueadas</AlertTitle>
      <AlertDescription className="text-amber-700">
        Você bloqueou as notificações. Para receber alertas de novas vagas,{' '}
        <button
          onClick={handleOpenSettings}
          className="underline font-medium hover:text-amber-800"
        >
          ative nas configurações do navegador
        </button>
        .
      </AlertDescription>
    </Alert>
  );
}

/**
 * Componente inteligente que mostra o prompt adequado baseado no estado
 */
export function NotificationStatus({
  variant = 'inline',
  className = '',
}: {
  variant?: NotificationPromptVariant;
  className?: string;
}) {
  const { permissionStatus, isSubscribed, isInitialized } = useNotifications();

  if (!isInitialized) {
    return null;
  }

  if (isSubscribed) {
    return <NotificationActive className={className} />;
  }

  if (permissionStatus === 'denied') {
    return <NotificationDenied className={className} />;
  }

  return <NotificationPrompt variant={variant} className={className} />;
}
