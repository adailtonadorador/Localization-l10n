/**
 * Web Push Nativo
 * Implementação de Push Notifications sem dependência de terceiros
 */

import { supabaseUntyped } from './supabase';

// Chave VAPID pública (será gerada e configurada)
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

// Estado
let isInitialized = false;
let swRegistration: ServiceWorkerRegistration | null = null;

/**
 * Converte a chave VAPID de base64 para Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Verifica se o navegador suporta Web Push
 */
export function isWebPushSupported(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Inicializa o Web Push
 */
export async function initWebPush(): Promise<boolean> {
  if (isInitialized) {
    console.log('[WebPush] Já inicializado');
    return true;
  }

  if (!isWebPushSupported()) {
    console.warn('[WebPush] Navegador não suporta Web Push');
    return false;
  }

  if (!VAPID_PUBLIC_KEY) {
    console.warn('[WebPush] VITE_VAPID_PUBLIC_KEY não configurada');
    return false;
  }

  try {
    // Aguarda o Service Worker estar pronto
    swRegistration = await navigator.serviceWorker.ready;
    console.log('[WebPush] Service Worker pronto');

    isInitialized = true;
    return true;
  } catch (error) {
    console.error('[WebPush] Erro ao inicializar:', error);
    return false;
  }
}

/**
 * Solicita permissão e inscreve o usuário para receber notificações
 */
export async function subscribeToPush(userId: string): Promise<boolean> {
  console.log('[WebPush] Iniciando inscrição para usuário:', userId);

  if (!isInitialized) {
    const initialized = await initWebPush();
    if (!initialized) {
      console.error('[WebPush] Falha ao inicializar');
      return false;
    }
  }

  try {
    // Solicita permissão
    const permission = await Notification.requestPermission();
    console.log('[WebPush] Permissão:', permission);

    if (permission !== 'granted') {
      console.warn('[WebPush] Permissão negada');
      return false;
    }

    if (!swRegistration) {
      console.error('[WebPush] Service Worker não disponível');
      return false;
    }

    // Verifica se já existe uma subscription
    let subscription = await swRegistration.pushManager.getSubscription();

    if (!subscription) {
      // Cria nova subscription
      console.log('[WebPush] Criando nova subscription...');
      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      subscription = await swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
      });
      console.log('[WebPush] Subscription criada');
    } else {
      console.log('[WebPush] Subscription existente encontrada');
    }

    // Salva no Supabase
    const subscriptionJson = subscription.toJSON();
    const keys = subscriptionJson.keys as { p256dh: string; auth: string };

    const { error } = await supabaseUntyped
      .from('push_subscriptions')
      .upsert(
        {
          user_id: userId,
          endpoint: subscription.endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
        },
        {
          onConflict: 'user_id,endpoint',
        }
      );

    if (error) {
      console.error('[WebPush] Erro ao salvar subscription:', error);
      return false;
    }

    console.log('[WebPush] Subscription salva com sucesso');
    return true;
  } catch (error) {
    console.error('[WebPush] Erro ao inscrever:', error);
    return false;
  }
}

/**
 * Remove a inscrição do usuário
 */
export async function unsubscribeFromPush(userId: string): Promise<boolean> {
  try {
    if (!swRegistration) {
      swRegistration = await navigator.serviceWorker.ready;
    }

    const subscription = await swRegistration.pushManager.getSubscription();

    if (subscription) {
      // Remove do navegador
      await subscription.unsubscribe();
      console.log('[WebPush] Unsubscribed do navegador');
    }

    // Remove do Supabase
    const { error } = await supabaseUntyped
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('[WebPush] Erro ao remover subscription:', error);
      return false;
    }

    console.log('[WebPush] Subscription removida');
    return true;
  } catch (error) {
    console.error('[WebPush] Erro ao cancelar inscrição:', error);
    return false;
  }
}

/**
 * Verifica se o usuário está inscrito
 */
export async function isSubscribed(): Promise<boolean> {
  try {
    if (!isWebPushSupported()) {
      return false;
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    return subscription !== null;
  } catch (error) {
    console.error('[WebPush] Erro ao verificar inscrição:', error);
    return false;
  }
}

/**
 * Retorna o status da permissão
 */
export function getPermissionStatus(): NotificationPermission | 'unsupported' {
  if (!('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

/**
 * Verifica se está inicializado
 */
export function isWebPushInitialized(): boolean {
  return isInitialized;
}
