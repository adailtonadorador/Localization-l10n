/**
 * Serviço OneSignal
 * Integração com OneSignal para Push Notifications
 * Usando API v16 do OneSignal SDK via react-onesignal
 */

import OneSignal from 'react-onesignal';

// Configurações
const ONESIGNAL_APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID;

// Estado de inicialização
let isInitialized = false;

export type UserRole = 'worker' | 'client' | 'admin';

export interface UserTags {
  role: UserRole;
  user_id: string;
  approval_status?: 'pending' | 'approved' | 'rejected';
  is_active?: 'true' | 'false';
  [key: string]: string | undefined;
}

/**
 * Aguarda o Service Worker estar pronto e ativo
 */
async function waitForServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('[OneSignal] Service Worker não suportado');
    return null;
  }

  try {
    // Primeiro, tenta obter o registration existente
    const registration = await navigator.serviceWorker.getRegistration('/');

    if (registration) {
      // Se já tem um SW ativo, retorna
      if (registration.active) {
        console.log('[OneSignal] Service Worker já está ativo');
        return registration;
      }

      // Se tem um SW instalando ou esperando, aguarda ficar ativo
      const sw = registration.installing || registration.waiting;
      if (sw) {
        console.log('[OneSignal] Aguardando Service Worker ativar...');
        await new Promise<void>((resolve) => {
          sw.addEventListener('statechange', function handler() {
            if (sw.state === 'activated') {
              sw.removeEventListener('statechange', handler);
              resolve();
            }
          });
          // Timeout de 10 segundos
          setTimeout(resolve, 10000);
        });
        return registration;
      }
    }

    // Se não tem registration, aguarda o ready
    console.log('[OneSignal] Aguardando Service Worker ready...');
    const readyRegistration = await navigator.serviceWorker.ready;
    return readyRegistration;
  } catch (error) {
    console.warn('[OneSignal] Erro ao aguardar Service Worker:', error);
    return null;
  }
}

/**
 * Inicializa o OneSignal SDK
 * Deve ser chamado uma única vez
 */
export async function initOneSignal(): Promise<boolean> {
  if (isInitialized) {
    console.log('[OneSignal] Já inicializado');
    return true;
  }

  if (!ONESIGNAL_APP_ID) {
    console.warn('[OneSignal] VITE_ONESIGNAL_APP_ID não configurado');
    return false;
  }

  try {
    // Aguarda o Service Worker estar pronto antes de inicializar
    const swRegistration = await waitForServiceWorker();
    console.log('[OneSignal] Service Worker status:', swRegistration ? 'pronto' : 'não disponível');

    // Em desenvolvimento, o SW do PWA está desabilitado, então usa o SW do OneSignal diretamente
    // Em produção, usa o SW unificado (PWA + OneSignal)
    const isDev = import.meta.env.DEV;
    const serviceWorkerPath = isDev ? '/OneSignalSDKWorker.js' : '/sw.js';
    console.log('[OneSignal] Usando Service Worker:', serviceWorkerPath);

    await OneSignal.init({
      appId: ONESIGNAL_APP_ID,
      allowLocalhostAsSecureOrigin: true,
      serviceWorkerPath,
      serviceWorkerParam: { scope: '/' },
      // Desabilita prompts automáticos - usamos botão customizado no dashboard
      autoResubscribe: true,
    });

    isInitialized = true;
    console.log('[OneSignal] Inicializado com sucesso');
    return true;
  } catch (error) {
    const errorMessage = String(error);

    // Se o SDK já foi inicializado, consideramos sucesso
    if (errorMessage.includes('already initialized')) {
      isInitialized = true;
      console.log('[OneSignal] SDK já estava inicializado, continuando...');
      return true;
    }

    // Em desenvolvimento, ignorar erro de domínio não configurado
    if (import.meta.env.DEV && errorMessage.includes('Can only be used on')) {
      console.warn('[OneSignal] Domínio localhost não configurado no OneSignal. Push desabilitado em dev.');
      return false;
    }

    console.error('[OneSignal] Erro ao inicializar:', error);
    return false;
  }
}

/**
 * Registra o usuário no OneSignal com external_id
 * Nota: Tags removidas devido ao limite do plano gratuito
 */
export async function registerUser(
  userId: string,
  role: UserRole,
  _additionalTags?: Partial<UserTags>
): Promise<void> {
  if (!isInitialized) {
    console.warn('[OneSignal] Não inicializado. Chame initOneSignal primeiro.');
    return;
  }

  try {
    // Login com external_id - funciona no plano gratuito
    await OneSignal.login(userId);
    console.log('[OneSignal] Usuário registrado:', { userId, role });
  } catch (error) {
    console.error('[OneSignal] Erro ao registrar usuário:', error);
    throw error;
  }
}

/**
 * Remove o registro do usuário (logout)
 */
export async function unregisterUser(): Promise<void> {
  if (!isInitialized) {
    console.log('[OneSignal] SDK não inicializado, nada a fazer');
    return;
  }

  try {
    await OneSignal.logout();
    console.log('[OneSignal] Usuário deslogado');
  } catch (error) {
    console.error('[OneSignal] Erro ao deslogar usuário:', error);
  }
}

/**
 * Solicita permissão para push notifications
 */
export async function promptForPushPermission(): Promise<boolean> {
  console.log('[OneSignal] promptForPushPermission chamado');
  console.log('[OneSignal] isInitialized:', isInitialized);

  if (!isInitialized) {
    console.warn('[OneSignal] Não inicializado. Chame initOneSignal primeiro.');
    // Tenta inicializar se ainda não foi
    console.log('[OneSignal] Tentando inicializar...');
    const initResult = await initOneSignal();
    console.log('[OneSignal] Resultado da inicialização:', initResult);
    if (!initResult) {
      return false;
    }
  }

  try {
    console.log('[OneSignal] Chamando OneSignal.Notifications.requestPermission()...');
    // API v16: usa OneSignal.Notifications.requestPermission()
    const permission = await OneSignal.Notifications.requestPermission();
    console.log('[OneSignal] Resultado do prompt:', permission);
    return permission;
  } catch (error) {
    console.error('[OneSignal] Erro ao exibir prompt:', error);
    return false;
  }
}

/**
 * Atualiza as tags do usuário
 * Nota: Desabilitado no plano gratuito do OneSignal
 */
export async function updateUserTags(_tags: Partial<UserTags>): Promise<void> {
  // Tags não disponíveis no plano gratuito do OneSignal
  console.log('[OneSignal] updateUserTags ignorado (plano gratuito não suporta tags)');
}

/**
 * Remove tags específicas do usuário
 * Nota: Desabilitado no plano gratuito do OneSignal
 */
export async function removeUserTags(_tagKeys: string[]): Promise<void> {
  // Tags não disponíveis no plano gratuito do OneSignal
  console.log('[OneSignal] removeUserTags ignorado (plano gratuito não suporta tags)');
}

/**
 * Verifica se o usuário está inscrito nas notificações
 */
export async function isSubscribed(): Promise<boolean> {
  if (!isInitialized) {
    return false;
  }

  try {
    const pushSubscription = OneSignal.User.PushSubscription;
    return pushSubscription.optedIn || false;
  } catch (error) {
    console.error('[OneSignal] Erro ao verificar inscrição:', error);
    return false;
  }
}

/**
 * Obtém o status atual da permissão de notificações
 */
export function getPermissionStatus(): NotificationPermission | 'unsupported' {
  if (!('Notification' in window)) {
    return 'unsupported';
  }

  if (isInitialized) {
    const hasPermission = OneSignal.Notifications.permission;
    return hasPermission ? 'granted' : Notification.permission;
  }

  return Notification.permission;
}

/**
 * Obtém o Player ID (ID único do dispositivo no OneSignal)
 */
export async function getPlayerId(): Promise<string | null> {
  if (!isInitialized) {
    return null;
  }

  try {
    const pushSubscription = OneSignal.User.PushSubscription;
    return pushSubscription.id || null;
  } catch (error) {
    console.error('[OneSignal] Erro ao obter Player ID:', error);
    return null;
  }
}

/**
 * Adiciona listener para eventos de notificação
 */
export function onNotificationReceived(callback: (data: any) => void): () => void {
  if (!isInitialized) {
    console.warn('[OneSignal] SDK não inicializado');
    return () => {};
  }

  OneSignal.Notifications.addEventListener('foregroundWillDisplay', callback);

  return () => {
    OneSignal.Notifications.removeEventListener('foregroundWillDisplay', callback);
  };
}

/**
 * Adiciona listener para cliques em notificação
 */
export function onNotificationClicked(callback: (data: any) => void): () => void {
  if (!isInitialized) {
    console.warn('[OneSignal] SDK não inicializado');
    return () => {};
  }

  OneSignal.Notifications.addEventListener('click', callback);

  return () => {
    OneSignal.Notifications.removeEventListener('click', callback);
  };
}

/**
 * Verifica se o OneSignal está inicializado
 */
export function isOneSignalInitialized(): boolean {
  return isInitialized;
}
