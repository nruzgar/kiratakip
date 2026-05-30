import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import { sendTelegramMessage } from '@/lib/telegram'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

function formatCurrency(value: number) {
  return value.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })
}

function currentTimeKey() {
  return new Date().toTimeString().slice(0, 5)
}

function todayDateKey() {
  return new Date().toISOString().slice(0, 10)
}

async function buildNotificationForUser(supabase: any, setting: Database['public']['Tables']['notification_settings']['Row'], forceSummary: boolean) {
  if (!setting.telegram_chat_id) {
    return { sent: false, reason: 'chat_id yok' }
  }

  const lines: string[] = []
  const today = todayDateKey()
  const now = currentTimeKey()
  const shouldSendDailySummary = forceSummary || (setting.daily_summary_enabled && setting.daily_summary_time === now)

  if (shouldSendDailySummary) {
    const month = new Date().getMonth() + 1
    const year = new Date().getFullYear()

    const { data: rentPeriods, error: summaryError } = await supabase
      .from('rent_periods')
      .select('expected_amount,paid_amount,status')
      .eq('user_id', setting.user_id)
      .eq('year', year)
      .eq('month', month)

    if (summaryError) {
      throw summaryError
    }

    const rentPeriodsAny = (rentPeriods ?? []) as any[]

    const totalExpected = rentPeriodsAny.reduce((sum, row) => sum + (row.expected_amount || 0), 0) ?? 0
    const totalPaid = rentPeriodsAny.reduce((sum, row) => sum + (row.paid_amount || 0), 0) ?? 0
    const overdueCount = rentPeriodsAny.filter((row) => row.status === 'overdue').length || 0

    lines.push('📋 *Günlük Özet*')
    lines.push(`Beklenen kira: ${formatCurrency(totalExpected)}`)
    lines.push(`Tahsil edilen: ${formatCurrency(totalPaid)}`)
    lines.push(`Kalan: ${formatCurrency(totalExpected - totalPaid)}`)
    lines.push(`Gecikmiş dönem: ${overdueCount} adet`)
    lines.push('')
  }

  if (setting.overdue_alert_enabled) {
    const { data: overdue, error: overdueError } = await supabase
      .from('rent_periods')
      .select('id,due_date,expected_amount,paid_amount,status,tenants(full_name),properties(name)')
      .eq('user_id', setting.user_id)
      .eq('status', 'overdue')
      .order('due_date', { ascending: true })
      .limit(5)

    if (overdueError) {
      throw overdueError
    }
    const overdueAny = (overdue ?? []) as any[]

    if (overdueAny.length > 0) {
      lines.push('⚠️ *Gecikmiş kira uyarısı*')
      overdueAny.forEach((row) => {
        const tenantName = row.tenants?.full_name ?? 'Kiracı'
        const propertyName = row.properties?.name ?? 'Mülk'
        const amount = formatCurrency(row.expected_amount || 0)
        lines.push(`- ${tenantName} / ${propertyName} | ${row.due_date} | ${amount}`)
      })
      lines.push('')
    }
  }

  if (setting.contract_alert_days > 0) {
    const thresholdDate = new Date()
    thresholdDate.setDate(thresholdDate.getDate() + setting.contract_alert_days)
    const thresholdKey = thresholdDate.toISOString().slice(0, 10)

    const { data: contracts, error: contractError } = await supabase
      .from('contracts')
      .select('id,end_date,tenant_id,properties(name),tenants(full_name)')
      .eq('user_id', setting.user_id)
      .gte('end_date', today)
      .lte('end_date', thresholdKey)
      .order('end_date', { ascending: true })
      .limit(5)

    if (contractError) {
      throw contractError
    }
    const contractsAny = (contracts ?? []) as any[]

    if (contractsAny.length > 0) {
      lines.push('📆 *Sözleşme bitiş hatırlatması*')
      contractsAny.forEach((contract) => {
        const name = contract.tenants?.full_name ?? contract.properties?.name ?? 'Sözleşme'
        const daysLeft = Math.ceil((new Date(contract.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        lines.push(`- ${name} | ${contract.end_date} | ${daysLeft} gün kaldı`)
      })
      lines.push('')
    }
  }

  if (lines.length === 0) {
    return { sent: false, reason: 'Gönderilecek bildirim yok' }
  }

  const text = ['*KiraTakip Bildirimleri*', '', ...lines].join('\n')
  await sendTelegramMessage(setting.telegram_chat_id, text)

  return { sent: true }
}

export async function POST(request: Request) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return NextResponse.json({ error: 'Supabase ayarları eksik.' }, { status: 500 })
  }

  const supabase = createSupabaseClient<Database>(SUPABASE_URL, SUPABASE_KEY)
  const body = await request.json().catch(() => null)
  const action = body?.action ?? 'trigger'

  if (action === 'test') {
    const telegramChatId = body?.telegram_chat_id
    if (!telegramChatId || typeof telegramChatId !== 'string') {
      return NextResponse.json({ error: 'telegram_chat_id zorunlu.' }, { status: 400 })
    }

    try {
      await sendTelegramMessage(telegramChatId, '*KiraTakip Test Bildirimi*\nBu, Telegram bildirimlerinin çalıştığını doğrulamak için gönderildi.')
      return NextResponse.json({ success: true })
    } catch (error: any) {
      return NextResponse.json({ error: error.message || 'Test mesajı gönderilemedi.' }, { status: 500 })
    }
  }

  const force = body?.force === true
  const { data: settings, error } = await supabase
    .from('notification_settings')
    .select('id,user_id,telegram_chat_id,daily_summary_enabled,daily_summary_time,overdue_alert_enabled,contract_alert_days')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const results: Array<{ user_id: string; sent: boolean; reason?: string; error?: string }> = []

  for (const setting of settings ?? []) {
    try {
      const result = await buildNotificationForUser(supabase, setting, force)
      results.push({ user_id: setting.user_id, sent: result.sent, reason: result.reason })
    } catch (error: any) {
      results.push({ user_id: setting.user_id, sent: false, error: error.message })
    }
  }

  return NextResponse.json({ success: true, results })
}
