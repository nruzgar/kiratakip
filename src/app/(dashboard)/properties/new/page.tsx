'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function NewPropertyPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const formData = new FormData(e.currentTarget)
    
    const propertyData = {
      name: formData.get('name') as string,
      type: formData.get('type') as string,
      address: formData.get('address') as string,
      monthly_rent: Number(formData.get('monthly_rent')),
      payment_day: Number(formData.get('payment_day')),
      status: formData.get('status') as string,
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setMessage('Hata: Oturum açmanız gerekiyor')
      setLoading(false)
      return
    }

    const { error } = await supabase
      .from('properties')
      .insert({ ...propertyData, user_id: user.id } as any)

    if (error) {
      setMessage('Hata: ' + error.message)
    } else {
      setMessage('Mülk başarıyla eklendi!')
      setTimeout(() => router.push('/properties'), 1500)
    }
    setLoading(false)
  }

  return (
    <div className="page-container max-w-2xl">
      <div className="mb-8 animate-fade-in-up">
        <h1 className="text-2xl font-bold text-white">Yeni Mülk Ekle</h1>
        <p className="text-slate-400 text-sm mt-1">Yeni bir mülk kaydı oluşturun</p>
      </div>

      {message && (
        <div className={`mb-4 ${message.includes('Hata') ? 'alert-error' : 'alert-success'}`}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="glass-card-static p-6 space-y-5 animate-fade-in-up stagger-1">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Mülk Adı *</label>
          <input name="name" type="text" required className="input-dark" placeholder="Örn: Daire 3" />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Mülk Tipi *</label>
          <select name="type" required className="input-dark">
            <option value="apartment">Daire</option>
            <option value="office">Ofis</option>
            <option value="shop">Dükkan</option>
            <option value="villa">Villa</option>
            <option value="other">Diğer</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Adres</label>
          <input name="address" type="text" className="input-dark" placeholder="Örn: Atatürk Cad. No:15, Yalova" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Aylık Kira (TL) *</label>
            <input name="monthly_rent" type="number" required min="0" className="input-dark" placeholder="15000" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Ödeme Günü (1-31) *</label>
            <input name="payment_day" type="number" required min="1" max="31" className="input-dark" placeholder="5" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Durum</label>
          <select name="status" className="input-dark">
            <option value="vacant">Boş</option>
            <option value="active">Dolu</option>
            <option value="maintenance">Bakımda</option>
          </select>
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full py-3">
          {loading ? 'Kaydediliyor...' : 'Mülk Ekle'}
        </button>
      </form>
    </div>
  )
}
