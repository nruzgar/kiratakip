'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function EditPropertyForm({ property }: { property: any }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

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
    const { error } = await supabase
      .from('properties')
      .update(updates)
      .eq('id', property.id)

    if (error) {
      setMessage('Hata: ' + error.message)
    } else {
      setMessage('Mülk başarıyla güncellendi!')
      setTimeout(() => router.push('/properties'), 1500)
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

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mülk Adı *</label>
          <input name="name" type="text" required defaultValue={property.name}
            className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mülk Tipi *</label>
          <select name="type" required defaultValue={property.type}
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
          <input name="address" type="text" defaultValue={property.address || ''}
            className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Aylık Kira (TL) *</label>
            <input name="monthly_rent" type="number" required min="0" defaultValue={property.monthly_rent}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ödeme Günü (1-31) *</label>
            <input name="payment_day" type="number" required min="1" max="31" defaultValue={property.payment_day}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Durum</label>
          <select name="status" defaultValue={property.status}
            className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500">
            <option value="vacant">Boş</option>
            <option value="active">Dolu</option>
            <option value="maintenance">Bakımda</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Kiracı eklemek için "Boş" seçin
          </p>
        </div>

        <div className="flex space-x-3">
          <button type="submit" disabled={loading}
            className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Güncelleniyor...' : 'Güncelle'}
          </button>
          <Link href="/properties"
            className="py-2 px-4 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">
            İptal
          </Link>
        </div>
      </form>
    </>
  )
}