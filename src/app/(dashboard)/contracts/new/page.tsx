'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'

function NewContractContent() {
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
      const { data: tenantData } = await supabase.from('tenants').select('id, full_name, property_id').eq('user_id', user.id).eq('is_active', true)
      const { data: propertyData } = await supabase.from('properties').select('id, name').eq('user_id', user.id)
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
    const contractData = {
      tenant_id: formData.get('tenant_id') as string, property_id: formData.get('property_id') as string,
      start_date: formData.get('start_date') as string, end_date: formData.get('end_date') as string,
      rent_amount: Number(formData.get('rent_amount')), deposit_amount: Number(formData.get('deposit_amount')),
      notes: formData.get('notes') as string,
    }
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setMessage('Hata: Oturum açmanız gerekiyor'); setLoading(false); return }
    const { error } = await supabase.from('contracts').insert({ ...contractData, user_id: user.id } as any)
    if (error) { setMessage('Hata: ' + error.message) }
    else { setMessage('Sözleşme başarıyla eklendi!'); setTimeout(() => router.push('/contracts'), 2000) }
    setLoading(false)
  }

  const selectedTenant = tenants.find(t => t.id === preSelectedTenant)
  const defaultProperty = selectedTenant?.property_id || ''

  return (
    <div className="page-container max-w-2xl">
      <div className="mb-8 animate-fade-in-up">
        <h1 className="text-2xl font-bold text-white">Yeni Sözleşme Ekle</h1>
        <p className="text-slate-400 text-sm mt-1">Kiracı ve mülk arasında sözleşme oluşturun</p>
      </div>
      {message && <div className={`mb-4 ${message.includes('Hata') ? 'alert-error' : 'alert-success'}`}>{message}</div>}
      <form onSubmit={handleSubmit} className="glass-card-static p-6 space-y-5 animate-fade-in-up stagger-1">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Kiracı *</label>
          <select name="tenant_id" required defaultValue={preSelectedTenant || ''} className="input-dark">
            <option value="">Kiracı seçin</option>
            {tenants.map((t) => (<option key={t.id} value={t.id}>{t.full_name}</option>))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Mülk *</label>
          <select name="property_id" required defaultValue={defaultProperty} className="input-dark">
            <option value="">Mülk seçin</option>
            {properties.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
          </select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Başlangıç Tarihi *</label>
            <input name="start_date" type="date" required className="input-dark" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Bitiş Tarihi *</label>
            <input name="end_date" type="date" required className="input-dark" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Aylık Kira (TL) *</label>
            <input name="rent_amount" type="number" required min="0" className="input-dark" placeholder="15000" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Depozito (TL)</label>
            <input name="deposit_amount" type="number" min="0" defaultValue="0" className="input-dark" placeholder="30000" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Notlar</label>
          <textarea name="notes" rows={3} className="input-dark" placeholder="Sözleşme hakkında notlar..."></textarea>
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full py-3">
          {loading ? 'Kaydediliyor...' : 'Sözleşme Ekle'}
        </button>
      </form>
    </div>
  )
}

export default function NewContractPage() {
  return (
    <Suspense fallback={<div className="page-container"><div className="text-slate-400 animate-pulse">Yükleniyor...</div></div>}>
      <NewContractContent />
    </Suspense>
  )
}
