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
 * Notifica todos os workers aprovados sobre uma nova vaga
 */
export async function notifyNewJob(jobTitle: string, location?: string): Promise<void> {
  const body = location
    ? `Nova vaga: ${jobTitle} em ${location}`
    : `Nova vaga disponível: ${jobTitle}`;

  // Envia em background, não bloqueia a UI
  sendPushNotification({
    title: 'Nova Vaga Disponível!',
    body,
    url: '/worker/jobs',
    type: 'new_job',
  }).catch(err => console.error('[Notifications] Erro ao notificar nova vaga:', err));
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
