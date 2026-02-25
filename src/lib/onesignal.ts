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
    await OneSignal.init({
      appId: ONESIGNAL_APP_ID,
      allowLocalhostAsSecureOrigin: true,
      serviceWorkerParam: { scope: '/' },
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
 * Registra o usuário no OneSignal com external_id e tags
 */
export async function registerUser(
  userId: string,
  role: UserRole,
  additionalTags?: Partial<UserTags>
): Promise<void> {
  if (!isInitialized) {
    console.warn('[OneSignal] Não inicializado. Chame initOneSignal primeiro.');
    return;
  }

  try {
    // Login com external_id
    await OneSignal.login(userId);

    // Configurar tags
    const tags: Record<string, string> = {
      role,
      user_id: userId,
    };

    if (additionalTags) {
      Object.entries(additionalTags).forEach(([key, value]) => {
        if (value !== undefined) {
          tags[key] = value;
        }
      });
    }

    await OneSignal.User.addTags(tags);

    console.log('[OneSignal] Usuário registrado:', { userId, role, tags });
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
  if (!isInitialized) {
    console.warn('[OneSignal] Não inicializado. Chame initOneSignal primeiro.');
    return false;
  }

  try {
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
 */
export async function updateUserTags(tags: Partial<UserTags>): Promise<void> {
  if (!isInitialized) {
    console.warn('[OneSignal] SDK não inicializado');
    return;
  }

  try {
    const cleanTags: Record<string, string> = {};
    Object.entries(tags).forEach(([key, value]) => {
      if (value !== undefined) {
        cleanTags[key] = value;
      }
    });

    await OneSignal.User.addTags(cleanTags);
    console.log('[OneSignal] Tags atualizadas:', cleanTags);
  } catch (error) {
    console.error('[OneSignal] Erro ao atualizar tags:', error);
    throw error;
  }
}

/**
 * Remove tags específicas do usuário
 */
export async function removeUserTags(tagKeys: string[]): Promise<void> {
  if (!isInitialized) {
    console.warn('[OneSignal] SDK não inicializado');
    return;
  }

  try {
    await OneSignal.User.removeTags(tagKeys);
    console.log('[OneSignal] Tags removidas:', tagKeys);
  } catch (error) {
    console.error('[OneSignal] Erro ao remover tags:', error);
    throw error;
  }
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
