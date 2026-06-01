'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'

function NewPaymentContent() {
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
      const { data } = await supabase.from('tenants').select('id, full_name, property_id, properties(id, name)').eq('user_id', user.id).eq('is_active', true)
      setTenants(data || [])
      if (preSelectedTenant) setSelectedTenant(preSelectedTenant)
    }
    fetchTenants()
  }, [preSelectedTenant])

  useEffect(() => {
    async function fetchPeriods() {
      if (!selectedTenant) { setRentPeriods([]); return }
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('rent_periods').select('*, properties(id, name)')
        .eq('tenant_id', selectedTenant).eq('user_id', user.id)
        .in('status', ['pending', 'partial', 'overdue'])
        .order('year', { ascending: false }).order('month', { ascending: false })
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
    const period = rentPeriods.find(p => p.id === rentPeriodId)
    if (!period) { setMessage('Hata: Kira dönemi bulunamadı'); setLoading(false); return }
    const remaining = period.expected_amount - period.paid_amount
    if (amount > remaining) { setMessage(`Hata: Maksimum ödenebilecek tutar: ${remaining.toLocaleString('tr-TR')} TL`); setLoading(false); return }

    // Server action ile ödemeyi kaydet (paid_amount ve status otomatik güncellenir)
    const { createPayment } = await import('@/lib/actions/payments')
    const result = await createPayment({
      rent_period_id: rentPeriodId,
      tenant_id: selectedTenant,
      property_id: period.property_id,
      payment_date: formData.get('payment_date') as string,
      amount,
      method: formData.get('method') as string,
      description: formData.get('description') as string,
    })

    if (result.success) { setMessage('Ödeme başarıyla eklendi!'); setTimeout(() => router.push('/dashboard'), 1500) }
    else { setMessage('Hata: Ödeme eklenemedi'); }
    setLoading(false)
  }

  return (
    <div className="page-container max-w-2xl">
      <div className="mb-8 animate-fade-in-up">
        <h1 className="text-2xl font-bold text-white">Yeni Ödeme Ekle</h1>
        <p className="text-slate-400 text-sm mt-1">Kiracıdan gelen ödemeyi kaydedin</p>
      </div>
      {message && <div className={`mb-4 ${message.includes('Hata') ? 'alert-error' : 'alert-success'}`}>{message}</div>}
      <form onSubmit={handleSubmit} className="glass-card-static p-6 space-y-5 animate-fade-in-up stagger-1">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Kiracı *</label>
          <select name="tenant_id" required value={selectedTenant} onChange={(e) => setSelectedTenant(e.target.value)} className="input-dark">
            <option value="">Kiracı seçin</option>
            {tenants.map((t) => (<option key={t.id} value={t.id}>{t.full_name} {t.properties?.name ? `- ${t.properties.name}` : ''}</option>))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Kira Dönemi *</label>
          <select name="rent_period_id" required defaultValue={preSelectedPeriod || ''} className="input-dark">
            <option value="">Dönem seçin</option>
            {rentPeriods.map((p) => {
              const remaining = p.expected_amount - p.paid_amount
              return (<option key={p.id} value={p.id}>{p.month}/{p.year} - {p.properties?.name} - Kalan: {remaining.toLocaleString('tr-TR')} TL{p.status === 'overdue' ? ' ⚠️ GECİKMİŞ' : ''}</option>)
            })}
          </select>
          {rentPeriods.length === 0 && selectedTenant && <p className="text-xs text-slate-500 mt-1">Bu kiracı için ödenecek kira dönemi yok.</p>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Ödeme Tarihi *</label>
            <input name="payment_date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="input-dark" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Tutar (TL) *</label>
            <input name="amount" type="number" required min="0.01" step="0.01" className="input-dark" placeholder="15000" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Ödeme Yöntemi *</label>
          <select name="method" required className="input-dark">
            <option value="bank">Banka Transferi</option><option value="cash">Nakit</option>
            <option value="credit_card">Kredi Kartı</option><option value="other">Diğer</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Açıklama</label>
          <input name="description" type="text" className="input-dark" placeholder="Örn: Mayıs 2024 kira ödemesi" />
        </div>
        <button type="submit" disabled={loading} className="btn-success w-full py-3">
          {loading ? 'Kaydediliyor...' : 'Ödeme Ekle'}
        </button>
      </form>
    </div>
  )
}

export default function NewPaymentPage() {
  return (
    <Suspense fallback={<div className="page-container"><div className="text-slate-400 animate-pulse">Yükleniyor...</div></div>}>
      <NewPaymentContent />
    </Suspense>
  )
}
