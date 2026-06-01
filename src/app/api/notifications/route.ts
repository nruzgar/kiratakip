import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import { sendTelegramMessage } from '@/lib/telegram'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

function formatCurrency(value: number) {
  return value.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function currentTimeKey() {
  const now = new Date()
  return now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/Istanbul' })
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

    const { data: thisMonthPeriods, error: monthError } = await supabase
      .from('rent_periods')
      .select('expected_amount,paid_amount,status,tenants(full_name),properties(name),due_date')
      .eq('user_id', setting.user_id)
      .eq('year', year)
      .eq('month', month)

    if (monthError) { throw monthError }

    const thisMonthAny = (thisMonthPeriods ?? []) as any[]
    const totalExpected = thisMonthAny.reduce((sum, row) => sum + (row.expected_amount || 0), 0)
    const totalPaid = thisMonthAny.reduce((sum, row) => sum + (row.paid_amount || 0), 0)
    const overdueThisMonth = thisMonthAny.filter((row) => row.status === 'overdue').length

    const tenantMap = new Map<string, { name: string; property: string; expected: number; paid: number; status: string }[]>()
    for (const row of thisMonthAny) {
      const tenantName = row.tenants?.full_name ?? 'Bilinmeyen Kiracı'
      if (!tenantMap.has(tenantName)) { tenantMap.set(tenantName, []) }
      tenantMap.get(tenantName)!.push({
        name: tenantName,
        property: row.properties?.name ?? '-',
        expected: row.expected_amount || 0,
        paid: row.paid_amount || 0,
        status: row.status,
      })
    }

    const { data: endingContracts, error: endError } = await supabase
      .from('contracts')
      .select('end_date,tenants(full_name),properties(name)')
      .eq('user_id', setting.user_id)
      .gte('end_date', today)
      .lte('end_date', new Date(year, month, 0).toISOString().slice(0, 10))
      .order('end_date', { ascending: true })

    if (endError) throw endError
    const endingAny = (endingContracts ?? []) as any[]

    const monthName = new Date(year, month - 1).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })
    lines.push(`📋 *${monthName} Kira Özeti*`)
    lines.push('')
    lines.push(`🏢 Toplam kira: *${formatCurrency(totalExpected)}*`)
    lines.push(`✅ Tahsil edilen: *${formatCurrency(totalPaid)}*`)
    lines.push(`⏳ Kalan: *${formatCurrency(totalExpected - totalPaid)}*`)
    const collectionRate = totalExpected > 0 ? Math.round((totalPaid / totalExpected) * 100) : 0
    lines.push(`📊 Tahsilat oranı: *%${collectionRate}*`)
    lines.push(`⚠️ Geciken: *${overdueThisMonth}* adet`)
    lines.push('')

    if (thisMonthAny.length > 0) {
      lines.push('*👥 Kiracı Bazında Durum:*')
      for (const [tenantName, periods] of tenantMap) {
        const tenantTotalExpected = periods.reduce((s, p) => s + p.expected, 0)
        const tenantTotalPaid = periods.reduce((s, p) => s + p.paid, 0)
        const tenantRemaining = tenantTotalExpected - tenantTotalPaid
        const propertyName = periods[0]?.property ?? '-'
        let statusEmoji = '✅'
        const allPaid = periods.every(p => p.status === 'paid')
        const anyOverdue = periods.some(p => p.status === 'overdue')
        const anyPartial = periods.some(p => p.status === 'partial')
        if (allPaid) statusEmoji = '✅'
        else if (anyOverdue) statusEmoji = '🔴'
        else if (anyPartial) statusEmoji = '🟡'
        else statusEmoji = '⚪'
        lines.push(`${statusEmoji} *${tenantName}* — ${propertyName}`)
        lines.push(`   Kira: ${formatCurrency(tenantTotalExpected)} | Ödenen: ${formatCurrency(tenantTotalPaid)} | Kalan: ${formatCurrency(tenantRemaining)}`)
      }
      lines.push('')
    }

    const { data: todayPayments, error: todayError } = await supabase
      .from('payments')
      .select('amount,payment_date,method,tenants(full_name)')
      .eq('user_id', setting.user_id)
      .gte('payment_date', today)
      .lte('payment_date', today)
      .order('payment_date', { ascending: false })

    if (todayError) throw todayError
    const todayPaymentsAny = (todayPayments ?? []) as any[]
    if (todayPaymentsAny.length > 0) {
      const todayTotal = todayPaymentsAny.reduce((s, p) => s + (p.amount || 0), 0)
      lines.push(`*💳 Bugünkü Tahsilatlar (${formatDate(today)})*`)
      for (const payment of todayPaymentsAny) {
        const methodLabel = payment.method === 'bank' ? '🏦' : payment.method === 'cash' ? '💵' : payment.method === 'credit_card' ? '💳' : '📄'
        lines.push(`${methodLabel} ${payment.tenants?.full_name ?? 'Kiracı'}: +${formatCurrency(payment.amount || 0)}`)
      }
      lines.push(`Toplam bugün: *${formatCurrency(todayTotal)}*`)
      lines.push('')
    }

    if (endingAny.length > 0) {
      lines.push(`*📆 Bu Ay Sona Eren Sözleşmeler*`)
      for (const contract of endingAny) {
        const daysLeft = Math.ceil((new Date(contract.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        const name = contract.tenants?.full_name ?? contract.properties?.name ?? 'Sözleşme'
        lines.push(`- ${name}: ${formatDate(contract.end_date)} (${daysLeft} gün kaldı)`)
      }
      lines.push('')
    }

    if (totalExpected - totalPaid <= 0) {
      lines.push('🎉 *Bu ay tüm kiracılar ödemelerini tamamladı!*')
    } else if (overdueThisMonth > 0) {
      lines.push('⚠️ *Gecikmiş ödemeler için kiracılarınızla iletişime geçmeyi unutmayın.*')
    }
    lines.push('')
  }

  if (setting.overdue_alert_enabled) {
    const { data: overdue, error: overdueError } = await supabase
      .from('rent_periods')
      .select('id,due_date,expected_amount,paid_amount,status,tenants(full_name),properties(name)')
      .eq('user_id', setting.user_id)
      .eq('status', 'overdue')
      .order('due_date', { ascending: true })
      .limit(10)

    if (overdueError) { throw overdueError }
    const overdueAny = (overdue ?? []) as any[]

    if (overdueAny.length > 0) {
      const overdueTotal = overdueAny.reduce((s, r) => s + (r.expected_amount - r.paid_amount), 0)
      lines.push('⚠️ *Gecikmiş Kira Uyarısı*')
      lines.push(`Toplam gecikmiş alacak: *${formatCurrency(overdueTotal)}* (${overdueAny.length} dönem)`)
      lines.push('')
      overdueAny.forEach((row) => {
        const tenantName = row.tenants?.full_name ?? 'Kiracı'
        const propertyName = row.properties?.name ?? 'Mülk'
        const debt = formatCurrency(row.expected_amount - (row.paid_amount || 0))
        const dueDate = formatDate(row.due_date)
        lines.push(`🔴 *${tenantName}* — ${propertyName}`)
        lines.push(`   Vade: ${dueDate} | Borç: ${debt}`)
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

    if (contractError) { throw contractError }
    const contractsAny = (contracts ?? []) as any[]

    if (contractsAny.length > 0) {
      lines.push('📆 *Sözleşme Bitiş Hatırlatması*')
      contractsAny.forEach((contract) => {
        const name = contract.tenants?.full_name ?? contract.properties?.name ?? 'Sözleşme'
        const daysLeft = Math.ceil((new Date(contract.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        lines.push(`- *${name}* | ${formatDate(contract.end_date)} | ⏳ ${daysLeft} gün kaldı`)
      })
      lines.push('')
    }
  }

  if (lines.length === 0) {
    return { sent: false, reason: 'Gönderilecek bildirim yok' }
  }

  const header = lines.join('\n')
  const text = ['*🏠 KiraTakip Bildirimleri*', '', header].join('\n')
  await sendTelegramMessage(setting.telegram_chat_id, text)

  return { sent: true }
}

export async function POST(request: Request) {
  if (!SUPABASE_URL) {
    return NextResponse.json({ error: 'NEXT_PUBLIC_SUPABASE_URL eksik.' }, { status: 500 })
  }

  // STRATEJİ: Önce service_role_key dene, yoksa anon_key kullan
  // RLS policy'ler user_id'ye göre izin veriyor, user_id filter ile sorguluyoruz
  const keyToUse = SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!keyToUse) {
    return NextResponse.json({ error: 'Supabase API key eksik.' }, { status: 500 })
  }

  const usedKeySource = SUPABASE_SERVICE_KEY ? 'SUPABASE_SERVICE_ROLE_KEY' : 'NEXT_PUBLIC_SUPABASE_ANON_KEY'

  // Supabase bağlantısını test et - raw response ile
  try {
    const testUrl = `${SUPABASE_URL}/rest/v1/notification_settings?select=id&limit=1`
    const testResponse = await fetch(testUrl, {
      headers: {
        'apikey': keyToUse,
        'Authorization': `Bearer ${keyToUse}`,
        'Content-Type': 'application/json',
      }
    })
    if (!testResponse.ok) {
      const testText = await testResponse.text()
      return NextResponse.json({
        error: `Supabase bağlantı hatası (HTTP ${testResponse.status})`,
        hata_detay: testText.substring(0, 500),
        kullanilan_key: usedKeySource,
        cozum: `1. Supabase Dashboard > Settings > API sayfasından service_role key'i kopyalayın (jwt-bashed: service_role).\n2. Vercel Dashboard > Settings > Environment Variables > SUPABASE_SERVICE_ROLE_KEY'e yapıştırın.\n3. Projeyi Redeploy edin.`
      }, { status: 500 })
    }
  } catch (connError: any) {
    return NextResponse.json({
      error: `Supabase bağlantı hatası`,
      hata_detay: connError?.message || JSON.stringify(connError),
      kullanilan_key: usedKeySource,
      cozum: `NEXT_PUBLIC_SUPABASE_URL değerini kontrol edin (https://xxxxx.supabase.co). Vercel'de doğru tanımlandığından emin olun.`
    }, { status: 500 })
  }

  const supabase = createSupabaseClient<Database>(SUPABASE_URL, keyToUse)
  const body = await request.json().catch(() => null)
  const action = body?.action ?? 'trigger'

  if (action === 'test') {
    const telegramChatId = body?.telegram_chat_id
    if (!telegramChatId || typeof telegramChatId !== 'string') {
      return NextResponse.json({ error: 'telegram_chat_id zorunlu.' }, { status: 400 })
    }
    try {
      await sendTelegramMessage(telegramChatId, '*🏠 KiraTakip Test Bildirimi*\n\nTelegram bildirimleriniz başarıyla çalışıyor! 🎉\n\nKullanabileceğiniz özellikler:\n• 📋 Günlük kira özeti\n• ⚠️ Gecikmiş ödeme uyarıları\n• 📆 Sözleşme bitiş hatırlatmaları\n\nAyarlar sayfasından detayları yapılandırabilirsiniz.')
      return NextResponse.json({ success: true, key_source: usedKeySource })
    } catch (error: any) {
      return NextResponse.json({ error: `Telegram hatası: ${error.message}` }, { status: 500 })
    }
  }

  const force = body?.force === true
  const { data: settings, error } = await supabase
    .from('notification_settings')
    .select('id,user_id,telegram_chat_id,daily_summary_enabled,daily_summary_time,overdue_alert_enabled,contract_alert_days')

  if (error) {
    const errorMsg = error.message?.toLowerCase() || ''
    if (errorMsg.includes('invalid api key') || errorMsg.includes('api key')) {
      return NextResponse.json({
        error: `❌ Supabase API key geçersiz. Kullanılan: ${usedKeySource}.`,
        cozum: `Vercel'e SUPABASE_SERVICE_ROLE_KEY ekleyin. Supabase Dashboard > Settings > API > service_role key kopyalayın.`
      }, { status: 500 })
    }
    return NextResponse.json({ error: `Supabase sorgu hatası: ${error.message}` }, { status: 500 })
  }

  const results: Array<{ user_id: string; sent: boolean; reason?: string; error?: string }> = []
  const settingsAny = (settings ?? []) as any[]

  for (const setting of settingsAny) {
    try {
      const result = await buildNotificationForUser(supabase, setting, force)
      results.push({ user_id: setting.user_id, sent: result.sent, reason: result.reason })
    } catch (error: any) {
      results.push({ user_id: setting.user_id, sent: false, error: error.message })
    }
  }

  return NextResponse.json({ success: true, results })
}

export async function GET() {
  if (!SUPABASE_URL) {
    return NextResponse.json({ error: 'NEXT_PUBLIC_SUPABASE_URL eksik.' }, { status: 500 })
  }

  const keyToUse = SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!keyToUse) {
    return NextResponse.json({ error: 'Supabase API key eksik.' }, { status: 500 })
  }

  const supabase = createSupabaseClient<Database>(SUPABASE_URL, keyToUse)

  const { data: settings, error } = await supabase
    .from('notification_settings')
    .select('id,user_id,telegram_chat_id,daily_summary_enabled,daily_summary_time,overdue_alert_enabled,contract_alert_days')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const results: Array<{ user_id: string; sent: boolean; reason?: string; error?: string }> = []
  const settingsAny = (settings ?? []) as any[]

  for (const setting of settingsAny) {
    try {
      const result = await buildNotificationForUser(supabase, setting, false)
      results.push({ user_id: setting.user_id, sent: result.sent, reason: result.reason })
    } catch (error: any) {
      results.push({ user_id: setting.user_id, sent: false, error: error.message })
    }
  }

  return NextResponse.json({ success: true, results })
}