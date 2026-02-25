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
 * Aguarda o OneSignal estar pronto (inicializado pelo HTML)
 */
async function waitForOneSignal(): Promise<OneSignalInstance> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('OneSignal não carregou após 10 segundos'));
    }, 10000);

    // Se já existe e está inicializado
    if (window.OneSignal) {
      clearTimeout(timeout);
      resolve(window.OneSignal);
      return;
    }

    // Aguarda a inicialização via OneSignalDeferred (feita no HTML)
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push((OneSignal) => {
      clearTimeout(timeout);
      resolve(OneSignal);
    });
  });
}

/**
 * Inicializa o OneSignal SDK (aguarda inicialização feita no HTML)
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

  initPromise = (async () => {
    try {
      // Aguarda o OneSignal estar pronto (inicializado pelo script no HTML)
      await waitForOneSignal();
      isInitialized = true;
      console.log('[OneSignal] Pronto para uso');
    } catch (error) {
      console.error('[OneSignal] Erro ao aguardar inicialização:', error);
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
  console.log('[OneSignal] promptForPushPermission chamado');
  console.log('[OneSignal] isInitialized:', isInitialized);
  console.log('[OneSignal] window.OneSignal:', !!window.OneSignal);

  const OneSignal = getOneSignal();

  if (!OneSignal || !isInitialized) {
    console.warn('[OneSignal] SDK não inicializado, tentando inicializar...');
    try {
      await initOneSignal();
    } catch (e) {
      console.error('[OneSignal] Falha ao inicializar:', e);
      return false;
    }
  }

  const os = getOneSignal();
  if (!os) {
    console.error('[OneSignal] SDK não disponível após tentativa de inicialização');
    return false;
  }

  try {
    console.log('[OneSignal] Chamando requestPermission...');
    console.log('[OneSignal] Notifications object:', os.Notifications);
    console.log('[OneSignal] Permissão atual do navegador:', Notification.permission);

    // Se ainda não tem permissão, solicita via API nativa
    if ('Notification' in window && Notification.permission === 'default') {
      console.log('[OneSignal] Solicitando permissão via API nativa...');
      const nativePermission = await Notification.requestPermission();
      console.log('[OneSignal] Resultado permissão nativa:', nativePermission);

      if (nativePermission !== 'granted') {
        console.log('[OneSignal] Permissão negada pelo usuário');
        return false;
      }
    }

    // Se a permissão foi concedida, faz opt-in no OneSignal
    if (Notification.permission === 'granted') {
      console.log('[OneSignal] Permissão concedida, chamando optIn...');
      console.log('[OneSignal] PushSubscription object:', os.User.PushSubscription);
      console.log('[OneSignal] PushSubscription.id:', os.User.PushSubscription.id);
      console.log('[OneSignal] PushSubscription.token:', os.User.PushSubscription.token);

      // Verifica se o Service Worker está registrado
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        console.log('[OneSignal] Service Workers registrados:', registrations.length);
        registrations.forEach((reg, i) => {
          console.log(`[OneSignal] SW ${i}:`, reg.scope, reg.active?.scriptURL);
        });
      }

      try {
        // Aumenta timeout para 15 segundos e adiciona mais diagnóstico
        console.log('[OneSignal] Iniciando optIn...');
        const startTime = Date.now();
        const optInPromise = os.User.PushSubscription.optIn();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('optIn timeout após 15s')), 15000)
        );

        await Promise.race([optInPromise, timeoutPromise]);
        console.log('[OneSignal] optIn concluído com sucesso em', Date.now() - startTime, 'ms');
        console.log('[OneSignal] PushSubscription.id após optIn:', os.User.PushSubscription.id);
        console.log('[OneSignal] PushSubscription.token após optIn:', os.User.PushSubscription.token);
      } catch (optInError: any) {
        console.error('[OneSignal] Erro no optIn:', optInError?.message || optInError);
        console.log('[OneSignal] PushSubscription.id após erro:', os.User.PushSubscription.id);
        console.log('[OneSignal] PushSubscription.token após erro:', os.User.PushSubscription.token);
        // Mesmo com erro no optIn, a permissão foi concedida
        console.log('[OneSignal] Continuando mesmo com erro no optIn...');
      }
      return true;
    }

    console.log('[OneSignal] Permissão não concedida:', Notification.permission);
    return false;
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
