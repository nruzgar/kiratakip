'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function SettingsForm({ settings }: { settings: any }) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    const formData = new FormData(e.currentTarget)
    const formValues = {
      telegram_chat_id: formData.get('telegram_chat_id') as string || null,
      daily_summary_enabled: formData.get('daily_summary_enabled') === 'on',
      daily_summary_time: formData.get('daily_summary_time') as string || '09:00',
      overdue_alert_enabled: formData.get('overdue_alert_enabled') === 'on',
      contract_alert_days: Number(formData.get('contract_alert_days')) || 30,
    }
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setMessage('Hata: Oturum açmanız gerekiyor'); setLoading(false); return }
    const { error } = await supabase.from('notification_settings').upsert({
      user_id: user.id, ...formValues, updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' })
    if (error) { setMessage('Hata: ' + error.message) }
    else { setMessage('Ayarlar başarıyla kaydedildi!') }
    setLoading(false)
  }

  return (
    <>
      {message && <div className={`mb-4 ${message.includes('Hata') ? 'alert-error' : 'alert-success'}`}>{message}</div>}

      <form onSubmit={handleSubmit} className="glass-card-static p-6 space-y-6 animate-fade-in-up">
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">📱 Telegram Bildirimleri</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Telegram Chat ID</label>
              <input name="telegram_chat_id" type="text" defaultValue={settings?.telegram_chat_id || ''}
                placeholder="Örn: 123456789" className="input-dark" />
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <div>
                <p className="font-medium text-white">Günlük Özet</p>
                <p className="text-sm text-slate-400">Her gün kira durumunu al</p>
              </div>
              <input name="daily_summary_enabled" type="checkbox"
                defaultChecked={settings?.daily_summary_enabled || false}
                className="w-5 h-5 rounded bg-slate-700 border-slate-600 text-indigo-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Günlük Özet Saati</label>
              <input name="daily_summary_time" type="time"
                defaultValue={settings?.daily_summary_time || '09:00'} className="input-dark" />
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <div>
                <p className="font-medium text-white">Gecikme Uyarısı</p>
                <p className="text-sm text-slate-400">Geciken kiracılar için uyarı al</p>
              </div>
              <input name="overdue_alert_enabled" type="checkbox"
                defaultChecked={settings?.overdue_alert_enabled !== false}
                className="w-5 h-5 rounded bg-slate-700 border-slate-600 text-indigo-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Sözleşme Bitiş Uyarısı</label>
              <select name="contract_alert_days" defaultValue={settings?.contract_alert_days || 30} className="input-dark">
                <option value="30">30 gün önce</option>
                <option value="60">60 gün önce</option>
                <option value="90">90 gün önce</option>
              </select>
            </div>
          </div>
        </div>

        <div className="border-t border-white/[0.08] pt-6">
          <button type="submit" disabled={loading} className="btn-primary w-full py-3">
            {loading ? 'Kaydediliyor...' : 'Ayarları Kaydet'}
          </button>
        </div>
      </form>

      {/* Telegram Test & Manuel Bildirim */}
      <div className="glass-card-static p-6 mt-6 space-y-4 animate-fade-in-up stagger-2">
        <h2 className="text-lg font-semibold text-white">🔔 Telegram Bildirim Test</h2>
        <button
          onClick={async () => {
            setLoading(true); setMessage('')
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { setMessage('Hata: Oturum açın'); setLoading(false); return }
            const { data: currentSettings } = await supabase.from('notification_settings').select('telegram_chat_id').eq('user_id', user.id).single()
            const chatId = currentSettings?.telegram_chat_id
            if (!chatId) { setMessage('Hata: Önce Telegram Chat ID kaydedin'); setLoading(false); return }
            try {
              const res = await fetch('/api/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'test', telegram_chat_id: chatId }) })
              const data = await res.json()
              if (data.success) { setMessage('✅ Test mesajı Telegram\'a gönderildi!') }
              else { setMessage('Hata: ' + (data.error || 'Bilinmeyen hata')) }
            } catch (err: any) { setMessage('Hata: ' + (err.message || 'Bağlantı hatası')) }
            setLoading(false)
          }}
          disabled={loading}
          className="btn-success w-full py-3"
        >
          {loading ? 'Gönderiliyor...' : '🔔 Test Bildirimi Gönder'}
        </button>

        <button
          onClick={async () => {
            setLoading(true); setMessage('')
            try {
              const res = await fetch('/api/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'trigger', force: true }) })
              const data = await res.json()
              if (data.success) { const sent = data.results?.filter((r: any) => r.sent).length || 0; setMessage(`✅ Günlük özet gönderildi! (${sent} bildirim)`) }
              else {
                const errorParts = []
                if (data.error) errorParts.push(data.error)
                if (data.hata_detay) errorParts.push(`\n📄 Detay: ${data.hata_detay}`)
                if (data.kullanilan_key) errorParts.push(`\n🔑 Key: ${data.kullanilan_key}`)
                if (data.cozum) errorParts.push(`\n💡 Çözüm: ${data.cozum}`)
                setMessage('Hata: ' + errorParts.join(''))
              }
            } catch (err: any) { setMessage('Hata: ' + (err.message || 'Bağlantı hatası')) }
            setLoading(false)
          }}
          disabled={loading}
          className="btn-purple w-full py-3"
        >
          {loading ? 'Gönderiliyor...' : '📋 Günlük Özeti Şimdi Gönder'}
        </button>
      </div>
    </>
  )
}