'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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

      const { data } = await supabase
        .from('properties')
        .select('id, name')
        .eq('user_id', user.id)
        .eq('status', 'vacant')

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
      full_name: formData.get('full_name') as string,
      phone: formData.get('phone') as string,
      email: formData.get('email') as string,
      property_id: formData.get('property_id') as string || null,
      notes: formData.get('notes') as string,
      is_active: true,
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setMessage('Oturum açmanız gerekiyor')
      setLoading(false)
      return
    }

    const { error } = await supabase
      .from('tenants')
      .insert({ ...tenantData, user_id: user.id })

    if (error) {
      setMessage('Hata: ' + error.message)
    } else {
      // Eğer mülk seçildiyse, mülk durumunu "active" yap
      if (tenantData.property_id) {
        await supabase
          .from('properties')
          .update({ status: 'active' })
          .eq('id', tenantData.property_id)
      }
      
      setMessage('Kiracı başarıyla eklendi!')
      setTimeout(() => router.push('/tenants'), 1500)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 space-x-8">
            <Link href="/dashboard" className="text-xl font-bold text-blue-600">KiraTakip</Link>
            <Link href="/tenants" className="text-gray-700 hover:text-blue-600">← Kiracılar'a Dön</Link>
          </div>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Yeni Kiracı Ekle</h1>

        {message && (
          <div className={`mb-4 p-3 rounded ${message.includes('Hata') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ad Soyad *</label>
            <input name="full_name" type="text" required
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="Örn: Ahmet Yılmaz" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
              <input name="phone" type="tel"
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                placeholder="05xx xxx xx xx" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input name="email" type="email"
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                placeholder="ornek@email.com" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bağlı Mülk (Boş Mülkler)</label>
            <select name="property_id"
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500">
              <option value="">Mülk seçin (opsiyonel)</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>
            {properties.length === 0 && (
              <p className="text-xs text-orange-600 mt-1">
                ⚠️ Boş mülk bulunmuyor. Önce mülk ekleyin.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notlar</label>
            <textarea name="notes" rows={3}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="Kiracı hakkında notlar..."></textarea>
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Kaydediliyor...' : 'Kiracı Ekle'}
          </button>
        </form>
      </main>
    </div>
  )
}