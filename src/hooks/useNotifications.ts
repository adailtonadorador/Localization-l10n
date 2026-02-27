/**
 * useNotifications Hook
 * Hook React para gerenciar Web Push Notifications nativo
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabaseUntyped } from '@/lib/supabase';
import {
  initWebPush,
  subscribeToPush,
  isSubscribed as checkIsSubscribed,
  getPermissionStatus,
  isWebPushSupported,
} from '@/lib/webpush';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export interface NotificationState {
  isInitialized: boolean;
  isSubscribed: boolean;
  permissionStatus: NotificationPermission | 'unsupported';
  isLoading: boolean;
  error: string | null;
}

export interface UseNotificationsReturn extends NotificationState {
  requestPermission: () => Promise<boolean>;
  refreshStatus: () => Promise<void>;
}

export function useNotifications(): UseNotificationsReturn {
  const { profile } = useAuth();
  const [state, setState] = useState<NotificationState>({
    isInitialized: false,
    isSubscribed: false,
    permissionStatus: 'default',
    isLoading: true,
    error: null,
  });

  const hasRegisteredRef = useRef(false);

  // Inicializa o Web Push quando o componente monta
  useEffect(() => {
    let isMounted = true;

    async function initialize() {
      try {
        // Verifica se o navegador suporta
        if (!isWebPushSupported()) {
          setState((prev) => ({
            ...prev,
            isInitialized: false,
            permissionStatus: 'unsupported',
            isLoading: false,
          }));
          return;
        }

        await initWebPush();

        if (!isMounted) return;

        const subscribed = await checkIsSubscribed();
        const permission = getPermissionStatus();

        setState((prev) => ({
          ...prev,
          isInitialized: true,
          isSubscribed: subscribed,
          permissionStatus: permission === 'unsupported' ? 'default' : permission,
          isLoading: false,
        }));
      } catch (error) {
        if (!isMounted) return;

        console.error('[useNotifications] Erro na inicialização:', error);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: 'Falha ao inicializar notificações',
        }));
      }
    }

    initialize();

    return () => {
      isMounted = false;
    };
  }, []);

  // Verifica se o usuário já está inscrito quando o perfil carrega
  useEffect(() => {
    if (!state.isInitialized || !profile?.id) {
      return;
    }

    // Evita registro duplicado
    if (hasRegisteredRef.current) {
      return;
    }

    async function checkSubscription() {
      const subscribed = await checkIsSubscribed();
      setState((prev) => ({
        ...prev,
        isSubscribed: subscribed,
      }));
    }

    checkSubscription();
  }, [state.isInitialized, profile?.id]);

  // Solicita permissão de notificações
  const requestPermission = useCallback(async (): Promise<boolean> => {
    console.log('[useNotifications] requestPermission iniciado');
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    if (!profile?.id) {
      console.error('[useNotifications] Usuário não autenticado');
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: 'Usuário não autenticado',
      }));
      return false;
    }

    try {
      // Tenta inscrever no Web Push
      const success = await subscribeToPush(profile.id);
      console.log('[useNotifications] Resultado subscribeToPush:', success);

      const permission = getPermissionStatus();

      if (success) {
        hasRegisteredRef.current = true;
        setState((prev) => ({
          ...prev,
          isSubscribed: true,
          permissionStatus: permission === 'unsupported' ? 'default' : permission,
          isLoading: false,
        }));
        return true;
      }

      // Se falhou mas a permissão foi negada
      if (permission === 'denied') {
        setState((prev) => ({
          ...prev,
          isSubscribed: false,
          permissionStatus: 'denied',
          isLoading: false,
          error: 'Permissão negada pelo usuário',
        }));
        return false;
      }

      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: 'Falha ao ativar notificações',
      }));
      return false;
    } catch (error) {
      console.error('[useNotifications] Erro ao solicitar permissão:', error);

      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: 'Falha ao solicitar permissão',
      }));
      return false;
    }
  }, [profile?.id]);

  // Atualiza o status manualmente
  const refreshStatus = useCallback(async (): Promise<void> => {
    try {
      const subscribed = await checkIsSubscribed();
      const permission = getPermissionStatus();

      setState((prev) => ({
        ...prev,
        isSubscribed: subscribed,
        permissionStatus: permission === 'unsupported' ? 'default' : permission,
      }));
    } catch (error) {
      console.error('[useNotifications] Erro ao atualizar status:', error);
    }
  }, []);

  return {
    ...state,
    requestPermission,
    refreshStatus,
  };
}

/**
 * Hook para inscrição em eventos Realtime do Supabase
 * Pode ser usado para atualizar dados quando notificações são enviadas
 */
export function useRealtimeSubscription() {
  const { profile } = useAuth();

  useEffect(() => {
    if (!profile?.id) return;

    // Inscrever em novos jobs (para workers aprovados)
    const jobsChannel = supabaseUntyped
      .channel('jobs-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'jobs',
        },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          console.log('[Realtime] Nova vaga criada:', payload.new);
          // Aqui você pode disparar uma notificação local ou atualizar o estado
        }
      )
      .subscribe();

    // Inscrever em assignments do usuário
    const assignmentsChannel = supabaseUntyped
      .channel(`assignments-${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'job_assignments',
          filter: `worker_id=eq.${profile.id}`,
        },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          console.log('[Realtime] Nova atribuição:', payload.new);
        }
      )
      .subscribe();

    return () => {
      supabaseUntyped.removeChannel(jobsChannel);
      supabaseUntyped.removeChannel(assignmentsChannel);
    };
  }, [profile?.id]);
}
