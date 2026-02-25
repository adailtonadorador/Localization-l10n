/**
 * OneSignal Push Notifications Module
 * Integração com OneSignal para push notifications no PWA Sama Conecta
 */

// Tipos do OneSignal
declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: OneSignalInstance) => void>;
    OneSignal?: OneSignalInstance;
  }
}

interface OneSignalInstance {
  init(options: OneSignalInitOptions): Promise<void>;
  login(externalId: string): Promise<void>;
  logout(): Promise<void>;
  User: {
    addTags(tags: Record<string, string>): Promise<void>;
    removeTags(tags: string[]): Promise<void>;
    getTags(): Promise<Record<string, string>>;
    PushSubscription: {
      optIn(): Promise<void>;
      optOut(): Promise<void>;
      readonly id: string | null;
      readonly token: string | null;
    };
  };
  Notifications: {
    permission: boolean;
    permissionNative: NotificationPermission;
    requestPermission(): Promise<void>;
    addEventListener(event: string, callback: (data: any) => void): void;
    removeEventListener(event: string, callback: (data: any) => void): void;
  };
  Debug: {
    setLogLevel(level: string): void;
  };
}

interface OneSignalInitOptions {
  appId: string;
  allowLocalhostAsSecureOrigin?: boolean;
  serviceWorkerPath?: string;
  notifyButton?: {
    enable: boolean;
  };
  welcomeNotification?: {
    disable: boolean;
  };
}

export type UserRole = 'worker' | 'client' | 'admin';

export interface UserTags {
  role: UserRole;
  user_id: string;
  approval_status?: 'pending' | 'approved' | 'rejected';
  is_active?: 'true' | 'false';
  [key: string]: string | undefined;
}

// Estado interno
let isInitialized = false;
let initPromise: Promise<void> | null = null;

/**
 * Obtém a instância do OneSignal
 */
function getOneSignal(): OneSignalInstance | null {
  return window.OneSignal || null;
}

/**
 * Aguarda o OneSignal estar pronto
 */
async function waitForOneSignal(): Promise<OneSignalInstance> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('OneSignal não carregou após 10 segundos'));
    }, 10000);

    if (window.OneSignal) {
      clearTimeout(timeout);
      resolve(window.OneSignal);
      return;
    }

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push((OneSignal) => {
      clearTimeout(timeout);
      resolve(OneSignal);
    });
  });
}

/**
 * Inicializa o OneSignal SDK
 */
export async function initOneSignal(): Promise<void> {
  // Evita inicialização duplicada
  if (isInitialized) {
    console.log('[OneSignal] Já inicializado');
    return;
  }

  if (initPromise) {
    return initPromise;
  }

  const appId = import.meta.env.VITE_ONESIGNAL_APP_ID;

  if (!appId || appId === 'seu-app-id-aqui') {
    console.warn('[OneSignal] App ID não configurado. Configure VITE_ONESIGNAL_APP_ID no .env');
    return;
  }

  initPromise = (async () => {
    try {
      const OneSignal = await waitForOneSignal();

      await OneSignal.init({
        appId,
        allowLocalhostAsSecureOrigin: import.meta.env.DEV,
        serviceWorkerPath: '/OneSignalSDKWorker.js',
        notifyButton: {
          enable: false, // Usamos nosso próprio UI
        },
        welcomeNotification: {
          disable: true, // Desativamos notificação de boas-vindas
        },
      });

      isInitialized = true;
      console.log('[OneSignal] Inicializado com sucesso');
    } catch (error) {
      console.error('[OneSignal] Erro ao inicializar:', error);
      initPromise = null;
      throw error;
    }
  })();

  return initPromise;
}

/**
 * Registra o usuário no OneSignal com external_id e tags
 */
export async function registerUser(
  userId: string,
  role: UserRole,
  additionalTags?: Partial<UserTags>
): Promise<void> {
  const OneSignal = getOneSignal();

  if (!OneSignal || !isInitialized) {
    console.warn('[OneSignal] SDK não inicializado. Chamando initOneSignal primeiro.');
    await initOneSignal();
  }

  const os = getOneSignal();
  if (!os) {
    console.error('[OneSignal] SDK não disponível após inicialização');
    return;
  }

  try {
    // Login com external_id
    await os.login(userId);

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

    await os.User.addTags(tags);

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
  const OneSignal = getOneSignal();

  if (!OneSignal || !isInitialized) {
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
  const OneSignal = getOneSignal();

  if (!OneSignal || !isInitialized) {
    console.warn('[OneSignal] SDK não inicializado');
    return false;
  }

  try {
    await OneSignal.Notifications.requestPermission();
    await OneSignal.User.PushSubscription.optIn();

    const permission = OneSignal.Notifications.permission;
    console.log('[OneSignal] Permissão solicitada:', permission);

    return permission;
  } catch (error) {
    console.error('[OneSignal] Erro ao solicitar permissão:', error);
    return false;
  }
}

/**
 * Atualiza as tags do usuário
 */
export async function updateUserTags(tags: Partial<UserTags>): Promise<void> {
  const OneSignal = getOneSignal();

  if (!OneSignal || !isInitialized) {
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
  const OneSignal = getOneSignal();

  if (!OneSignal || !isInitialized) {
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
  const OneSignal = getOneSignal();

  if (!OneSignal || !isInitialized) {
    return false;
  }

  try {
    const subscriptionId = OneSignal.User.PushSubscription.id;
    return !!subscriptionId;
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

  const OneSignal = getOneSignal();

  if (OneSignal && isInitialized) {
    return OneSignal.Notifications.permissionNative;
  }

  return Notification.permission;
}

/**
 * Adiciona listener para eventos de notificação
 */
export function onNotificationReceived(callback: (data: any) => void): () => void {
  const OneSignal = getOneSignal();

  if (!OneSignal || !isInitialized) {
    console.warn('[OneSignal] SDK não inicializado');
    return () => {};
  }

  OneSignal.Notifications.addEventListener('foregroundWillDisplay', callback);

  // Retorna função para remover o listener
  return () => {
    OneSignal.Notifications.removeEventListener('foregroundWillDisplay', callback);
  };
}

/**
 * Adiciona listener para cliques em notificação
 */
export function onNotificationClicked(callback: (data: any) => void): () => void {
  const OneSignal = getOneSignal();

  if (!OneSignal || !isInitialized) {
    console.warn('[OneSignal] SDK não inicializado');
    return () => {};
  }

  OneSignal.Notifications.addEventListener('click', callback);

  // Retorna função para remover o listener
  return () => {
    OneSignal.Notifications.removeEventListener('click', callback);
  };
}
