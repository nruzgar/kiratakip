'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function NewTenantPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [properties, setProperties] = useState<any[]>([])

  useEffect(() => {
    async function fetchProperties() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('properties').select('id, name').eq('user_id', user.id).eq('status', 'vacant')
      setProperties(data || [])
    }
    fetchProperties()
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    const formData = new FormData(e.currentTarget)
    const tenantData = {
      full_name: formData.get('full_name') as string, phone: formData.get('phone') as string,
      email: formData.get('email') as string, property_id: formData.get('property_id') as string || null,
      notes: formData.get('notes') as string, is_active: true,
    }
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setMessage('Oturum açmanız gerekiyor'); setLoading(false); return }
    const { error } = await supabase.from('tenants').insert({ ...tenantData, user_id: user.id } as any)
    if (error) { setMessage('Hata: ' + error.message) }
    else {
      if (tenantData.property_id) { await supabase.from('properties').update({ status: 'active' }).eq('id', tenantData.property_id) }
      setMessage('Kiracı başarıyla eklendi!')
      setTimeout(() => router.push('/tenants'), 1500)
    }
    setLoading(false)
  }

  return (
    <div className="page-container max-w-2xl">
      <div className="mb-8 animate-fade-in-up">
        <h1 className="text-2xl font-bold text-white">Yeni Kiracı Ekle</h1>
        <p className="text-slate-400 text-sm mt-1">Yeni bir kiracı kaydı oluşturun</p>
      </div>
      {message && <div className={`mb-4 ${message.includes('Hata') ? 'alert-error' : 'alert-success'}`}>{message}</div>}
      <form onSubmit={handleSubmit} className="glass-card-static p-6 space-y-5 animate-fade-in-up stagger-1">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Ad Soyad *</label>
          <input name="full_name" type="text" required className="input-dark" placeholder="Örn: Ahmet Yılmaz" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Telefon</label>
            <input name="phone" type="tel" className="input-dark" placeholder="05xx xxx xx xx" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
            <input name="email" type="email" className="input-dark" placeholder="ornek@email.com" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Bağlı Mülk (Boş Mülkler)</label>
          <select name="property_id" className="input-dark">
            <option value="">Mülk seçin (opsiyonel)</option>
            {properties.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
          </select>
          {properties.length === 0 && <p className="text-xs text-amber-400 mt-1">⚠️ Boş mülk bulunmuyor. Önce mülk ekleyin.</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Notlar</label>
          <textarea name="notes" rows={3} className="input-dark" placeholder="Kiracı hakkında notlar..."></textarea>
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full py-3">
          {loading ? 'Kaydediliyor...' : 'Kiracı Ekle'}
        </button>
      </form>
    </div>
  )
}
