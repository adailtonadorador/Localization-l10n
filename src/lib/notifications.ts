/**
 * Funções para enviar notificações push
 */

import { supabaseUntyped } from '@/lib/supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Busca IDs dos workers aprovados com a função correspondente ao título da diária
 */
async function fetchWorkerIdsByFuncao(funcao: string): Promise<string[]> {
  try {
    const { data, error } = await supabaseUntyped
      .from('workers')
      .select('id')
      .eq('funcao', funcao)
      .eq('approval_status', 'approved')
      .eq('is_active', true);

    if (error || !data) return [];
    return data.map((w: { id: string }) => w.id);
  } catch {
    return [];
  }
}

interface NotificationPayload {
  title: string;
  body: string;
  url?: string;
  userIds?: string[]; // Se especificado, envia apenas para estes usuários
  type?: 'new_job' | 'assignment' | 'approval' | 'general';
}

/**
 * Envia notificação push via Edge Function
 */
export async function sendPushNotification(payload: NotificationPayload): Promise<boolean> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-push-notification`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error('[Notifications] Erro ao enviar:', await response.text());
      return false;
    }

    const result = await response.json();
    console.log('[Notifications] Resultado:', result);
    return result.sent > 0;
  } catch (error) {
    console.error('[Notifications] Erro:', error);
    return false;
  }
}

/**
 * Notifica workers com a função correspondente sobre uma nova diária
 */
export async function notifyNewJob(jobTitle: string, location?: string): Promise<void> {
  const body = location
    ? `Nova diária: ${jobTitle} em ${location}`
    : `Nova diária disponível: ${jobTitle}`;

  const userIds = await fetchWorkerIdsByFuncao(jobTitle);
  if (userIds.length === 0) return;

  sendPushNotification({
    title: 'Nova Diária Disponível!',
    body,
    url: '/worker/jobs',
    userIds,
    type: 'new_job',
  }).catch(err => console.error('[Notifications] Erro ao notificar nova diária:', err));
}

/**
 * Notifica workers com a função correspondente que uma diária ficou disponível após desistência
 */
export async function notifyJobAvailableAfterWithdrawal(jobTitle: string, location?: string): Promise<void> {
  const body = location
    ? `Diária disponível: ${jobTitle} em ${location}`
    : `Diária disponível: ${jobTitle}`;

  const userIds = await fetchWorkerIdsByFuncao(jobTitle);
  if (userIds.length === 0) return;

  sendPushNotification({
    title: 'Diária Disponível!',
    body,
    url: '/worker/jobs',
    userIds,
    type: 'new_job',
  }).catch(err => console.error('[Notifications] Erro ao notificar diária disponível:', err));
}

/**
 * Notifica um worker específico sobre atribuição de vaga
 */
export async function notifyJobAssignment(
  workerId: string,
  jobTitle: string,
  date: string
): Promise<void> {
  const formattedDate = new Date(date).toLocaleDateString('pt-BR');

  sendPushNotification({
    title: 'Você foi selecionado!',
    body: `Vaga: ${jobTitle} - ${formattedDate}`,
    url: '/worker/my-jobs',
    userIds: [workerId],
    type: 'assignment',
  }).catch(err => console.error('[Notifications] Erro ao notificar atribuição:', err));
}

/**
 * Notifica um worker sobre aprovação do cadastro
 */
export async function notifyWorkerApproved(workerId: string): Promise<void> {
  sendPushNotification({
    title: 'Cadastro Aprovado!',
    body: 'Seu cadastro foi aprovado. Você já pode se candidatar às vagas.',
    url: '/worker',
    userIds: [workerId],
    type: 'approval',
  }).catch(err => console.error('[Notifications] Erro ao notificar aprovação:', err));
}
