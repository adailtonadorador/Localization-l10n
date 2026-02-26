/**
 * useNotifications Hook
 * Hook React para gerenciar push notifications com OneSignal
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabaseUntyped } from '@/lib/supabase';
import {
  initOneSignal,
  registerUser,
  promptForPushPermission,
  updateUserTags,
  isSubscribed,
  getPermissionStatus,
  onNotificationReceived,
  onNotificationClicked,
  type UserRole,
  type UserTags,
} from '@/lib/onesignal';
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
  const { profile, workerProfile } = useAuth();
  const [state, setState] = useState<NotificationState>({
    isInitialized: false,
    isSubscribed: false,
    permissionStatus: 'default',
    isLoading: true,
    error: null,
  });

  const hasRegisteredRef = useRef(false);
  const previousWorkerProfileRef = useRef<typeof workerProfile>(null);

  // Inicializa o OneSignal quando o componente monta
  useEffect(() => {
    let isMounted = true;

    async function initialize() {
      try {
        await initOneSignal();

        if (!isMounted) return;

        const subscribed = await isSubscribed();
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

  // Registra o usuário quando o perfil está disponível
  useEffect(() => {
    if (!state.isInitialized || !profile?.id) {
      return;
    }

    // Para workers, aguarda workerProfile estar disponível
    if (profile.role === 'worker' && !workerProfile) {
      return;
    }

    // Evita registro duplicado
    if (hasRegisteredRef.current) {
      return;
    }

    async function register() {
      // Marca como registrando antes da chamada async para evitar race conditions
      hasRegisteredRef.current = true;

      try {
        const role = profile!.role as UserRole;
        const tags: Partial<UserTags> = {};

        // Tags específicas para workers
        if (role === 'worker' && workerProfile) {
          tags.approval_status = workerProfile.approval_status;
          tags.is_active = workerProfile.is_active ? 'true' : 'false';
        }

        await registerUser(profile!.id, role, tags);

        // Salva estado do workerProfile para comparação futura
        if (workerProfile) {
          previousWorkerProfileRef.current = workerProfile;
        }

        // Atualiza status de inscrição após registrar
        const subscribed = await isSubscribed();
        setState((prev) => ({
          ...prev,
          isSubscribed: subscribed,
        }));
      } catch (error) {
        console.error('[useNotifications] Erro ao registrar usuário:', error);
        // Em caso de erro, permite nova tentativa
        hasRegisteredRef.current = false;
      }
    }

    register();
  }, [state.isInitialized, profile?.id, profile?.role, workerProfile]);

  // Atualiza tags APENAS quando workerProfile muda APÓS registro inicial
  useEffect(() => {
    // Só atualiza se já foi registrado anteriormente
    if (!hasRegisteredRef.current) {
      return;
    }

    if (!state.isInitialized || !profile?.id || profile.role !== 'worker' || !workerProfile) {
      return;
    }

    // Verifica se workerProfile realmente mudou
    const prev = previousWorkerProfileRef.current;
    if (
      prev &&
      prev.approval_status === workerProfile.approval_status &&
      prev.is_active === workerProfile.is_active
    ) {
      return;
    }

    previousWorkerProfileRef.current = workerProfile;

    async function updateTags() {
      try {
        await updateUserTags({
          approval_status: workerProfile!.approval_status,
          is_active: workerProfile!.is_active ? 'true' : 'false',
        });
      } catch (error) {
        console.error('[useNotifications] Erro ao atualizar tags:', error);
      }
    }

    updateTags();
  }, [state.isInitialized, profile?.id, profile?.role, workerProfile?.approval_status, workerProfile?.is_active]);

  // Configura listeners de notificação
  useEffect(() => {
    if (!state.isInitialized) return;

    // Listener para notificações recebidas (app em foreground)
    const removeReceivedListener = onNotificationReceived((event) => {
      console.log('[useNotifications] Notificação recebida:', event);
    });

    // Listener para cliques em notificações
    const removeClickedListener = onNotificationClicked((event) => {
      console.log('[useNotifications] Notificação clicada:', event);

      // Navegar com base nos dados da notificação
      const data = event?.notification?.additionalData;
      if (data?.url) {
        window.location.href = data.url;
      }
    });

    return () => {
      removeReceivedListener();
      removeClickedListener();
    };
  }, [state.isInitialized]);

  // Solicita permissão de notificações
  const requestPermission = useCallback(async (): Promise<boolean> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const granted = await promptForPushPermission();
      const permission = getPermissionStatus();

      // Se a permissão do navegador foi concedida, consideramos sucesso
      const browserGranted = Notification.permission === 'granted';

      setState((prev) => ({
        ...prev,
        isSubscribed: granted || browserGranted,
        permissionStatus: permission === 'unsupported' ? 'default' : permission,
        isLoading: false,
      }));

      return granted || browserGranted;
    } catch (error) {
      console.error('[useNotifications] Erro ao solicitar permissão:', error);

      // Mesmo com erro, verifica se permissão do navegador foi concedida
      const browserGranted = Notification.permission === 'granted';
      if (browserGranted) {
        setState((prev) => ({
          ...prev,
          isSubscribed: true,
          permissionStatus: 'granted',
          isLoading: false,
        }));
        return true;
      }

      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: 'Falha ao solicitar permissão',
      }));
      return false;
    }
  }, []);

  // Atualiza o status manualmente
  const refreshStatus = useCallback(async (): Promise<void> => {
    try {
      const subscribed = await isSubscribed();
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
