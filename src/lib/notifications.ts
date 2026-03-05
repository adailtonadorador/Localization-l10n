/**
 * Funções para enviar notificações push
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

interface NotificationPayload {
  title: string;
  body: string;
  url?: string;
  userIds?: string[]; // Se especificado, envia apenas para estes usuários
  funcao?: string; // Se especificado, a Edge Function busca workers com essa funcao server-side
  targetRole?: string; // Se especificado, envia para todos os usuários com essa role (ex: 'admin')
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
 * Notifica workers com a função correspondente sobre uma nova diária.
 * A busca por workers é feita server-side na Edge Function (com service role, bypassa RLS).
 */
export async function notifyNewJob(jobTitle: string, location?: string): Promise<void> {
  const body = location
    ? `Nova diária: ${jobTitle} em ${location}`
    : `Nova diária disponível: ${jobTitle}`;

  sendPushNotification({
    title: 'Nova Diária Disponível!',
    body,
    url: '/worker/jobs',
    funcao: jobTitle,
    type: 'new_job',
  }).catch(err => console.error('[Notifications] Erro ao notificar nova diária:', err));
}

/**
 * Notifica workers com a função correspondente que uma diária ficou disponível após desistência.
 * A busca por workers é feita server-side na Edge Function (com service role, bypassa RLS).
 */
export async function notifyJobAvailableAfterWithdrawal(jobTitle: string, location?: string): Promise<void> {
  const body = location
    ? `Diária disponível: ${jobTitle} em ${location}`
    : `Diária disponível: ${jobTitle}`;

  sendPushNotification({
    title: 'Diária Disponível!',
    body,
    url: '/worker/jobs',
    funcao: jobTitle,
    type: 'new_job',
  }).catch(err => console.error('[Notifications] Erro ao notificar diária disponível:', err));
}

/**
 * Notifica todos os admins quando um worker aceita uma diária.
 * Inclui nome do worker, título, data e local da diária.
 */
export async function notifyAdminJobAssigned(
  workerName: string,
  jobTitle: string,
  jobDate: string,
  location: string
): Promise<void> {
  const formattedDate = new Date(jobDate + 'T00:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  sendPushNotification({
    title: '✅ Diária Aceita',
    body: `${workerName} aceitou "${jobTitle}" em ${formattedDate} — ${location}`,
    url: '/admin/monitoring',
    targetRole: 'admin',
    type: 'assignment',
  }).catch(err => console.error('[Notifications] Erro ao notificar admin sobre atribuição:', err));
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

/**
 * Notifica admins sobre saída antecipada de um prestador
 */
export async function notifyAdminEarlyCheckout(
  workerName: string,
  jobTitle: string,
  workDate: string,
  details: string
): Promise<void> {
  const formattedDate = new Date(workDate + 'T00:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  });

  sendPushNotification({
    title: '⚠️ Saída Antecipada',
    body: `${workerName} — "${jobTitle}" (${formattedDate}). ${details}`,
    url: '/admin/monitoring',
    targetRole: 'admin',
    type: 'general',
  }).catch(err => console.error('[Notifications] Erro ao notificar saída antecipada:', err));
}
