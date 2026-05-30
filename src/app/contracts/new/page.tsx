'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function NewContractPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preSelectedTenant = searchParams.get('tenant')

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [tenants, setTenants] = useState<any[]>([])
  const [properties, setProperties] = useState<any[]>([])

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: tenantData } = await supabase
        .from('tenants')
        .select('id, full_name, property_id')
        .eq('user_id', user.id)
        .eq('is_active', true)

      const { data: propertyData } = await supabase
        .from('properties')
        .select('id, name')
        .eq('user_id', user.id)

      setTenants(tenantData || [])
      setProperties(propertyData || [])
    }
    fetchData()
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const formData = new FormData(e.currentTarget)
    
    const tenantId = formData.get('tenant_id') as string
    const propertyId = formData.get('property_id') as string

    const contractData = {
      tenant_id: tenantId,
      property_id: propertyId,
      start_date: formData.get('start_date') as string,
      end_date: formData.get('end_date') as string,
      rent_amount: Number(formData.get('rent_amount')),
      deposit_amount: Number(formData.get('deposit_amount')),
      notes: formData.get('notes') as string,
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setMessage('Hata: Oturum açmanız gerekiyor')
      setLoading(false)
      return
    }

    const { error } = await (supabase as any)
      .from('contracts')
      .insert({ ...contractData, user_id: user.id })

    if (error) {
      setMessage('Hata: ' + error.message)
    } else {
      setMessage('Sözleşme başarıyla eklendi! Kira dönemleri otomatik oluşturuldu.')
      setTimeout(() => router.push('/tenants'), 2000)
    }
    setLoading(false)
  }

  const selectedTenant = tenants.find(t => t.id === preSelectedTenant)
  const defaultProperty = selectedTenant?.property_id || ''

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
        <h1 className="text-2xl font-bold mb-6">Yeni Sözleşme Ekle</h1>

        {message && (
          <div className={`mb-4 p-3 rounded ${message.includes('Hata') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kiracı *</label>
            <select name="tenant_id" required defaultValue={preSelectedTenant || ''}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500">
              <option value="">Kiracı seçin</option>
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.full_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mülk *</label>
            <select name="property_id" required defaultValue={defaultProperty}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500">
              <option value="">Mülk seçin</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Başlangıç Tarihi *</label>
              <input name="start_date" type="date" required
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bitiş Tarihi *</label>
              <input name="end_date" type="date" required
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Aylık Kira (TL) *</label>
              <input name="rent_amount" type="number" required min="0"
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                placeholder="15000" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Depozito (TL)</label>
              <input name="deposit_amount" type="number" min="0" defaultValue="0"
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                placeholder="30000" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notlar</label>
            <textarea name="notes" rows={3}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="Sözleşme hakkında notlar..."></textarea>
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Kaydediliyor...' : 'Sözleşme Ekle'}
          </button>
        </form>
      </main>
    </div>
  )
}