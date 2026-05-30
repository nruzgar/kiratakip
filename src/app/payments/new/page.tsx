'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function NewPaymentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preSelectedTenant = searchParams.get('tenant')
  const preSelectedPeriod = searchParams.get('period')

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [tenants, setTenants] = useState<any[]>([])
  const [rentPeriods, setRentPeriods] = useState<any[]>([])
  const [selectedTenant, setSelectedTenant] = useState('')

  useEffect(() => {
    async function fetchTenants() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('tenants')
        .select('id, full_name, property_id, properties(id, name)')
        .eq('user_id', user.id)
        .eq('is_active', true)

      setTenants(data || [])
      if (preSelectedTenant) {
        setSelectedTenant(preSelectedTenant)
      }
    }
    fetchTenants()
  }, [preSelectedTenant])

  useEffect(() => {
    async function fetchPeriods() {
      if (!selectedTenant) {
        setRentPeriods([])
        return
      }

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('rent_periods')
        .select('*, properties(id, name)')
        .eq('tenant_id', selectedTenant)
        .eq('user_id', user.id)
        .in('status', ['pending', 'partial', 'overdue'])
        .order('year', { ascending: false })
        .order('month', { ascending: false })

      setRentPeriods(data || [])
    }
    fetchPeriods()
  }, [selectedTenant])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const formData = new FormData(e.currentTarget)
    
    const rentPeriodId = formData.get('rent_period_id') as string
    const amount = Number(formData.get('amount'))

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setMessage('Hata: Oturum açmanız gerekiyor')
      setLoading(false)
      return
    }

    // Seçili dönemin bilgilerini al
    const period = rentPeriods.find(p => p.id === rentPeriodId)
    if (!period) {
      setMessage('Hata: Kira dönemi bulunamadı')
      setLoading(false)
      return
    }

    // Kalan borç kontrolü
    const remaining = period.expected_amount - period.paid_amount
    if (amount > remaining) {
      setMessage(`Hata: Maksimum ödenebilecek tutar: ${remaining.toLocaleString('tr-TR')} TL`)
      setLoading(false)
      return
    }

    // Ödemeyi ekle
    const { error } = await (supabase as any)
      .from('payments')
      .insert({
        rent_period_id: rentPeriodId,
        tenant_id: selectedTenant,
        property_id: period.property_id,
        payment_date: formData.get('payment_date') as string,
        amount: amount,
        method: formData.get('method') as string,
        description: formData.get('description') as string,
        user_id: user.id,
      })

    if (error) {
      setMessage('Hata: ' + error.message)
    } else {
      setMessage('Ödeme başarıyla eklendi!')
      setTimeout(() => router.push('/dashboard'), 1500)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 space-x-8">
            <Link href="/dashboard" className="text-xl font-bold text-blue-600">KiraTakip</Link>
            <Link href="/dashboard" className="text-gray-700 hover:text-blue-600">← Dashboard'a Dön</Link>
          </div>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Yeni Ödeme Ekle</h1>

        {message && (
          <div className={`mb-4 p-3 rounded ${message.includes('Hata') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kiracı *</label>
            <select 
              name="tenant_id" 
              required 
              value={selectedTenant}
              onChange={(e) => setSelectedTenant(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Kiracı seçin</option>
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.full_name} {tenant.properties?.name ? `- ${tenant.properties.name}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kira Dönemi *</label>
            <select name="rent_period_id" required defaultValue={preSelectedPeriod || ''}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500">
              <option value="">Dönem seçin</option>
              {rentPeriods.map((period) => {
                const remaining = period.expected_amount - period.paid_amount
                return (
                  <option key={period.id} value={period.id}>
                    {period.month}/{period.year} - {period.properties?.name} - 
                    Kalan: {remaining.toLocaleString('tr-TR')} TL
                    {period.status === 'overdue' ? ' ⚠️ GECİKMİŞ' : ''}
                  </option>
                )
              })}
            </select>
            {rentPeriods.length === 0 && selectedTenant && (
              <p className="text-xs text-gray-500 mt-1">Bu kiracı için ödenecek kira dönemi yok.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ödeme Tarihi *</label>
              <input name="payment_date" type="date" required
                defaultValue={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tutar (TL) *</label>
              <input name="amount" type="number" required min="0.01" step="0.01"
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                placeholder="15000" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ödeme Yöntemi *</label>
            <select name="method" required
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500">
              <option value="bank">Banka Transferi</option>
              <option value="cash">Nakit</option>
              <option value="credit_card">Kredi Kartı</option>
              <option value="other">Diğer</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
            <input name="description" type="text"
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="Örn: Mayıs 2024 kira ödemesi" />
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-2 px-4 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50">
            {loading ? 'Kaydediliyor...' : 'Ödeme Ekle'}
          </button>
        </form>
      </main>
    </div>
  )
}