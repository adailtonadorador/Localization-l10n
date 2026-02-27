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
let initializationPromise: Promise<boolean> | null = null;

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
 * Usa escopo separado para evitar conflito com PWA
 */
export async function initOneSignal(): Promise<boolean> {
  // Se já está inicializado, retorna
  if (isInitialized) {
    console.log('[OneSignal] Já inicializado');
    return true;
  }

  // Se já está inicializando, aguarda
  if (initializationPromise) {
    console.log('[OneSignal] Aguardando inicialização em andamento...');
    return initializationPromise;
  }

  if (!ONESIGNAL_APP_ID) {
    console.warn('[OneSignal] VITE_ONESIGNAL_APP_ID não configurado');
    return false;
  }

  // Cria promise de inicialização para evitar múltiplas chamadas
  initializationPromise = (async () => {
    try {
      console.log('[OneSignal] Iniciando inicialização...');

      // Usa configuração mínima - deixa o OneSignal usar as configurações do painel
      await OneSignal.init({
        appId: ONESIGNAL_APP_ID,
        allowLocalhostAsSecureOrigin: true,
      });

      isInitialized = true;
      console.log('[OneSignal] Inicializado com sucesso');

      // Log do estado atual
      const permission = OneSignal.Notifications.permission;
      const optedIn = OneSignal.User.PushSubscription.optedIn;
      console.log('[OneSignal] Estado atual:', { permission, optedIn });

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
    } finally {
      initializationPromise = null;
    }
  })();

  return initializationPromise;
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
    console.warn('[OneSignal] Não inicializado. Tentando inicializar...');
    const success = await initOneSignal();
    if (!success) {
      console.error('[OneSignal] Falha ao inicializar, não é possível registrar usuário');
      return;
    }
  }

  try {
    // Login com external_id - funciona no plano gratuito
    await OneSignal.login(userId);
    console.log('[OneSignal] Usuário registrado:', { userId, role });
  } catch (error) {
    console.error('[OneSignal] Erro ao registrar usuário:', error);
    // Não lança erro para não quebrar o fluxo da aplicação
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

  if (!isInitialized) {
    console.log('[OneSignal] Tentando inicializar...');
    const initResult = await initOneSignal();
    if (!initResult) {
      console.error('[OneSignal] Falha ao inicializar');
      return false;
    }
  }

  try {
    // Verifica se já tem permissão
    if (Notification.permission === 'granted' && OneSignal.User.PushSubscription.optedIn) {
      console.log('[OneSignal] Já tem permissão e está inscrito');
      return true;
    }

    console.log('[OneSignal] Solicitando permissão...');
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
export function onNotificationReceived(callback: (data: unknown) => void): () => void {
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
export function onNotificationClicked(callback: (data: unknown) => void): () => void {
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
