'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function SettingsForm({ settings }: { settings: any }) {
  const [telegramChatId, setTelegramChatId] = useState(settings?.telegram_chat_id ?? '')
  const [dailySummaryEnabled, setDailySummaryEnabled] = useState(settings?.daily_summary_enabled ?? false)
  const [dailySummaryTime, setDailySummaryTime] = useState(settings?.daily_summary_time ?? '09:00')
  const [overdueAlertEnabled, setOverdueAlertEnabled] = useState(settings?.overdue_alert_enabled ?? false)
  const [contractAlertDays, setContractAlertDays] = useState(settings?.contract_alert_days?.toString() ?? '30')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleSave = async () => {
    setLoading(true)
    setMessage('')

    const contractDays = Number(contractAlertDays)
    if (Number.isNaN(contractDays) || contractDays < 0) {
      setMessage('Hata: Sözleşme hatırlatma günü pozitif bir sayı olmalıdır')
      setLoading(false)
      return
    }

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setMessage('Hata: Oturum açmanız gerekiyor')
        setLoading(false)
        return
      }

      const { error } = await supabase
        .from('notification_settings')
        .upsert({
          user_id: user.id,
          telegram_chat_id: telegramChatId || null,
          daily_summary_enabled: dailySummaryEnabled,
          daily_summary_time: dailySummaryTime,
          overdue_alert_enabled: overdueAlertEnabled,
          contract_alert_days: contractDays,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })

      if (error) {
        setMessage('Hata: ' + error.message)
      } else {
        setMessage('Ayarlar başarıyla kaydedildi!')
      }
    } catch (err: any) {
      setMessage('Hata: ' + err.message)
    }

    setLoading(false)
  }

  const handleTest = async () => {
    if (!telegramChatId) {
      setMessage('Hata: Telegram Chat ID boş olamaz.')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test', telegram_chat_id: telegramChatId }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Test mesajı gönderilemedi.')
      }

      setMessage('Test bildirimi gönderildi. Telegram’da kontrol edin.')
    } catch (err: any) {
      setMessage('Hata: ' + err.message)
    }

    setLoading(false)
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-6">
      {message && (
        <div className={`mb-4 p-3 rounded ${message.includes('Hata') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {message}
        </div>
      )}

      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-4">Telegram Bildirimleri</h2>
          <label className="block mb-2 text-sm font-medium text-gray-700">Telegram Chat ID</label>
          <input
            type="text"
            value={telegramChatId}
            onChange={(e) => setTelegramChatId(e.target.value)}
            className="w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none"
            placeholder="Telegram chat ID veya kullanıcı adı"
          />
          <p className="mt-2 text-xs text-gray-500">
            Bu ID ile botunuzun size mesaj göndermesi için Telegram bot token&apos;ını `TELEGRAM_BOT_TOKEN` olarak tanımlayın.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={dailySummaryEnabled}
                onChange={(e) => setDailySummaryEnabled(e.target.checked)}
                className="h-4 w-4"
              />
              Günlük özet bildirimi etkin
            </label>
            <label className="block text-sm font-medium text-gray-700">Özet gönderim saati</label>
            <input
              type="time"
              value={dailySummaryTime}
              onChange={(e) => setDailySummaryTime(e.target.value)}
              className="w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={overdueAlertEnabled}
                onChange={(e) => setOverdueAlertEnabled(e.target.checked)}
                className="h-4 w-4"
              />
              Gecikme bildirimi etkin
            </label>
            <label className="block text-sm font-medium text-gray-700">Sözleşme bitiş hatırlatma günü</label>
            <input
              type="number"
              min="0"
              value={contractAlertDays}
              onChange={(e) => setContractAlertDays(e.target.value)}
              className="w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none"
              placeholder="Gün sayısı"
            />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <button
          onClick={handleSave}
          disabled={loading}
          className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
        >
          {loading ? 'Kaydediliyor...' : 'Ayarları Kaydet'}
        </button>

        <button
          type="button"
          onClick={handleTest}
          disabled={loading}
          className="w-full py-2 px-4 border border-blue-600 text-blue-600 rounded-md hover:bg-blue-50 disabled:opacity-50"
        >
          {loading ? 'Bekleyiniz...' : 'Telegram Test Mesajı Gönder'}
        </button>
      </div>
    </div>
  )
}