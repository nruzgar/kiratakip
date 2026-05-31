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

    if (!user) {
      setMessage('Hata: Oturum açmanız gerekiyor')
      setLoading(false)
      return
    }

    const { error } = await supabase
      .from('notification_settings')
      .upsert({
        user_id: user.id,
        ...formValues,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })

    if (error) {
      setMessage('Hata: ' + error.message)
    } else {
      setMessage('Ayarlar başarıyla kaydedildi!')
    }

    setLoading(false)
  }

  return (
    <>
      {message && (
        <div className={`mb-4 p-3 rounded ${message.includes('Hata') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-4">Telegram Bildirimleri</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telegram Chat ID</label>
              <input 
                name="telegram_chat_id" 
                type="text" 
                defaultValue={settings?.telegram_chat_id || ''}
                placeholder="Örn: 123456789"
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <div>
                <p className="font-medium">Günlük Özet</p>
                <p className="text-sm text-gray-500">Her gün kira durumunu al</p>
              </div>
              <input 
                name="daily_summary_enabled" 
                type="checkbox" 
                defaultChecked={settings?.daily_summary_enabled || false}
                className="w-5 h-5 text-blue-600 rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Günlük Özet Saati</label>
              <input 
                name="daily_summary_time" 
                type="time" 
                defaultValue={settings?.daily_summary_time || '09:00'}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <div>
                <p className="font-medium">Gecikme Uyarısı</p>
                <p className="text-sm text-gray-500">Geciken kiracılar için uyarı al</p>
              </div>
              <input 
                name="overdue_alert_enabled" 
                type="checkbox" 
                defaultChecked={settings?.overdue_alert_enabled !== false}
                className="w-5 h-5 text-blue-600 rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sözleşme Bitiş Uyarısı</label>
              <select 
                name="contract_alert_days"
                defaultValue={settings?.contract_alert_days || 30}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="30">30 gün önce</option>
                <option value="60">60 gün önce</option>
                <option value="90">90 gün önce</option>
              </select>
            </div>
          </div>
        </div>

        <div className="border-t pt-6">
          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Kaydediliyor...' : 'Ayarları Kaydet'}
          </button>
        </div>
      </form>
    </>
  )
}