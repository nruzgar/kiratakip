'use client'

import { useState, useEffect } from 'react'
import { use } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function EditPropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [property, setProperty] = useState<any>(null)
  const { id } = use(params)

  useEffect(() => {
    async function fetchProperty() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('properties').select('*').eq('id', id).eq('user_id', user.id).single()
      if (data) setProperty(data)
    }
    fetchProperty()
  }, [id])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    const formData = new FormData(e.currentTarget)
    const updates = {
      name: formData.get('name') as string,
      type: formData.get('type') as string,
      address: formData.get('address') as string,
      monthly_rent: Number(formData.get('monthly_rent')),
      payment_day: Number(formData.get('payment_day')),
      status: formData.get('status') as string,
    }
    const supabase = createClient()
    const { error } = await (supabase as any).from('properties').update(updates as any).eq('id', id)
    if (error) { setMessage('Hata: ' + error.message) }
    else { setMessage('Mülk başarıyla güncellendi!'); setTimeout(() => router.push('/properties'), 1500) }
    setLoading(false)
  }

  if (!property) return <div className="page-container"><div className="text-slate-400 animate-pulse">Yükleniyor...</div></div>

  return (
    <div className="page-container max-w-2xl">
      <div className="mb-8 animate-fade-in-up">
        <h1 className="text-2xl font-bold text-white">Mülk Düzenle: {property.name}</h1>
      </div>
      {message && <div className={`mb-4 ${message.includes('Hata') ? 'alert-error' : 'alert-success'}`}>{message}</div>}
      <form onSubmit={handleSubmit} className="glass-card-static p-6 space-y-5 animate-fade-in-up stagger-1">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Mülk Adı *</label>
          <input name="name" type="text" required defaultValue={property.name} className="input-dark" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Mülk Tipi *</label>
          <select name="type" required defaultValue={property.type} className="input-dark">
            <option value="apartment">Daire</option><option value="office">Ofis</option>
            <option value="shop">Dükkan</option><option value="villa">Villa</option><option value="other">Diğer</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Adres</label>
          <input name="address" type="text" defaultValue={property.address || ''} className="input-dark" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Aylık Kira (TL) *</label>
            <input name="monthly_rent" type="number" required min="0" defaultValue={property.monthly_rent} className="input-dark" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Ödeme Günü (1-31) *</label>
            <input name="payment_day" type="number" required min="1" max="31" defaultValue={property.payment_day} className="input-dark" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Durum</label>
          <select name="status" defaultValue={property.status} className="input-dark">
            <option value="vacant">Boş</option><option value="active">Dolu</option><option value="maintenance">Bakımda</option>
          </select>
        </div>
        <div className="flex gap-3">
          <button type="submit" disabled={loading} className="btn-primary flex-1 py-3">
            {loading ? 'Güncelleniyor...' : 'Güncelle'}
          </button>
          <Link href="/properties" className="py-3 px-6 rounded-xl bg-white/[0.06] text-slate-300 hover:bg-white/[0.1] border border-white/[0.1] transition-colors text-center">
            İptal
          </Link>
        </div>
      </form>
    </div>
  )
}