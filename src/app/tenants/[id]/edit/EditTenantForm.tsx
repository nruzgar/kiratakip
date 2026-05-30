'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function EditTenantForm({ tenant, properties }: { tenant: any, properties: any[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const formData = new FormData(e.currentTarget)
    
    const propertyId = formData.get('property_id') as string
    const oldPropertyId = tenant.property_id

    const updates = {
      full_name: formData.get('full_name') as string,
      phone: formData.get('phone') as string,
      email: formData.get('email') as string,
      property_id: propertyId || null,
      notes: formData.get('notes') as string,
      is_active: formData.get('is_active') === 'on',
    }

    const supabase = createClient()

    const { error: tenantError } = await supabase
      .from('tenants')
      .update(updates)
      .eq('id', tenant.id)

    if (tenantError) {
      setMessage('Hata: ' + tenantError.message)
      setLoading(false)
      return
    }

    if (oldPropertyId && oldPropertyId !== propertyId) {
      await supabase
        .from('properties')
        .update({ status: 'vacant' })
        .eq('id', oldPropertyId)
    }

    if (propertyId) {
      await supabase
        .from('properties')
        .update({ status: 'active' })
        .eq('id', propertyId)
    }

    setMessage('Kiracı başarıyla güncellendi!')
    setTimeout(() => router.push('/tenants'), 1500)
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Ad Soyad *</label>
          <input name="full_name" type="text" required defaultValue={tenant.full_name}
            className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
            <input name="phone" type="tel" defaultValue={tenant.phone || ''}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input name="email" type="email" defaultValue={tenant.email || ''}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Bağlı Mülk</label>
          <select name="property_id" defaultValue={tenant.property_id || ''}
            className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500">
            <option value="">Mülk seçin (boş bırak)</option>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name} {property.status === 'active' && property.id !== tenant.property_id ? '(Dolu)' : property.status === 'vacant' ? '(Boş)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notlar</label>
          <textarea name="notes" rows={3} defaultValue={tenant.notes || ''}
            className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"></textarea>
        </div>

        <div className="flex items-center">
          <input name="is_active" type="checkbox" defaultChecked={tenant.is_active}
            className="w-4 h-4 text-blue-600 rounded" />
          <label className="ml-2 text-sm text-gray-700">Aktif Kiracı</label>
        </div>

        <div className="flex space-x-3">
          <button type="submit" disabled={loading}
            className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Güncelleniyor...' : 'Güncelle'}
          </button>
          <Link href="/tenants"
            className="py-2 px-4 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">
            İptal
          </Link>
        </div>
      </form>
    </>
  )
}