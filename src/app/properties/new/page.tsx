'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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
      setMessage('Oturum açmanız gerekiyor')
      setLoading(false)
      return
    }

    const { error } = await supabase
      .from('properties')
      .insert({ ...propertyData, user_id: user.id })

    if (error) {
      setMessage('Hata: ' + error.message)
    } else {
      setMessage('Mülk başarıyla eklendi!')
      setTimeout(() => router.push('/properties'), 1500)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 space-x-8">
            <Link href="/dashboard" className="text-xl font-bold text-blue-600">KiraTakip</Link>
            <Link href="/properties" className="text-gray-700 hover:text-blue-600">← Mülkler'e Dön</Link>
          </div>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Yeni Mülk Ekle</h1>

        {message && (
          <div className={`mb-4 p-3 rounded ${message.includes('Hata') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mülk Adı *</label>
            <input name="name" type="text" required
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="Örn: Daire 3" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mülk Tipi *</label>
            <select name="type" required
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500">
              <option value="apartment">Daire</option>
              <option value="office">Ofis</option>
              <option value="shop">Dükkan</option>
              <option value="villa">Villa</option>
              <option value="other">Diğer</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Adres</label>
            <input name="address" type="text"
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="Örn: Atatürk Cad. No:15, Yalova" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Aylık Kira (TL) *</label>
              <input name="monthly_rent" type="number" required min="0"
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                placeholder="15000" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ödeme Günü (1-31) *</label>
              <input name="payment_day" type="number" required min="1" max="31"
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                placeholder="5" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Durum</label>
            <select name="status"
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500">
              <option value="vacant">Boş</option>
              <option value="active">Dolu</option>
              <option value="maintenance">Bakımda</option>
            </select>
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Kaydediliyor...' : 'Mülk Ekle'}
          </button>
        </form>
      </main>
    </div>
  )
}