/**
 * Edge Function: Send Push Notification
 * Envia notificações push para trabalhadores quando uma nova vaga é criada
 *
 * Para usar, faça uma requisição POST com:
 * {
 *   "title": "Nova Vaga Disponível",
 *   "body": "Confira a nova oportunidade de trabalho!",
 *   "url": "/worker/jobs",
 *   "userIds": ["uuid1", "uuid2"] // opcional, se não informado envia para todos os workers aprovados
 * }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

// Configuração CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Interface para subscription
interface PushSubscription {
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
}

// Interface para o body da requisição
interface RequestBody {
  title: string
  body: string
  url?: string
  icon?: string
  userIds?: string[]
  tag?: string
  type?: string // 'new_job', 'assignment', 'approval', 'general'
  saveToHistory?: boolean // Se deve salvar no histórico (default: true)
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verifica variáveis de ambiente
    const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')
    const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')
    const VAPID_EMAIL = Deno.env.get('VAPID_EMAIL') || 'mailto:contato@samaconecta.com.br'

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      throw new Error('VAPID keys não configuradas')
    }

    // Configura web-push
    webpush.setVapidDetails(
      VAPID_EMAIL,
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    )

    // Cria cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parseia o body da requisição
    const body: RequestBody = await req.json()

    if (!body.title || !body.body) {
      return new Response(
        JSON.stringify({ error: 'title e body são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Busca as subscriptions
    let query = supabase
      .from('push_subscriptions')
      .select('user_id, endpoint, p256dh, auth')

    // Se userIds foi informado, filtra por eles
    if (body.userIds && body.userIds.length > 0) {
      query = query.in('user_id', body.userIds)
    }

    const { data: subscriptions, error: fetchError } = await query

    if (fetchError) {
      console.error('Erro ao buscar subscriptions:', fetchError)
      throw new Error('Erro ao buscar subscriptions')
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: 'Nenhuma subscription encontrada', sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Salva notificações no histórico (se não for explicitamente desabilitado)
    if (body.saveToHistory !== false) {
      // Pega os user_ids únicos das subscriptions
      const userIds = [...new Set(subscriptions.map((s: PushSubscription) => s.user_id))]

      // Cria uma notificação para cada usuário
      const notificationsToInsert = userIds.map(userId => ({
        user_id: userId,
        title: body.title,
        body: body.body,
        url: body.url || null,
        type: body.type || 'general',
        read: false,
      }))

      const { error: insertError } = await supabase
        .from('notifications')
        .insert(notificationsToInsert)

      if (insertError) {
        console.error('Erro ao salvar notificações no histórico:', insertError)
        // Continua mesmo com erro, pois as push notifications podem funcionar
      } else {
        console.log(`${notificationsToInsert.length} notificações salvas no histórico`)
      }
    }

    // Payload da notificação
    const notificationPayload = JSON.stringify({
      title: body.title,
      body: body.body,
      icon: body.icon || '/pwa-192x192.png',
      badge: '/pwa-64x64.png',
      url: body.url || '/',
      tag: body.tag || 'new-job',
      data: {
        url: body.url || '/',
      },
    })

    // Envia para cada subscription
    const results = await Promise.allSettled(
      subscriptions.map(async (sub: PushSubscription) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        }

        try {
          await webpush.sendNotification(pushSubscription, notificationPayload)
          return { userId: sub.user_id, success: true }
        } catch (error: any) {
          console.error(`Erro ao enviar para ${sub.user_id}:`, error.message)

          // Se a subscription expirou, remove do banco
          if (error.statusCode === 410 || error.statusCode === 404) {
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('endpoint', sub.endpoint)
            console.log(`Subscription removida: ${sub.endpoint}`)
          }

          return { userId: sub.user_id, success: false, error: error.message }
        }
      })
    )

    // Conta sucessos e falhas
    const sent = results.filter(
      (r) => r.status === 'fulfilled' && (r.value as any).success
    ).length
    const failed = results.length - sent

    return new Response(
      JSON.stringify({
        message: `Notificações enviadas`,
        sent,
        failed,
        total: subscriptions.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Erro na Edge Function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
