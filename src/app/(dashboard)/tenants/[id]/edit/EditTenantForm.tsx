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
      full_name: formData.get('full_name') as string, phone: formData.get('phone') as string,
      email: formData.get('email') as string, property_id: propertyId || null,
      notes: formData.get('notes') as string, is_active: formData.get('is_active') === 'on',
    }
    const supabase = createClient()
    const { error: tenantError } = await supabase.from('tenants').update(updates).eq('id', tenant.id)
    if (tenantError) { setMessage('Hata: ' + tenantError.message); setLoading(false); return }
    if (oldPropertyId && oldPropertyId !== propertyId) { await supabase.from('properties').update({ status: 'vacant' }).eq('id', oldPropertyId) }
    if (propertyId) { await supabase.from('properties').update({ status: 'active' }).eq('id', propertyId) }
    setMessage('Kiracı başarıyla güncellendi!')
    setTimeout(() => router.push('/tenants'), 1500)
    setLoading(false)
  }

  return (
    <>
      {message && <div className={`mb-4 ${message.includes('Hata') ? 'alert-error' : 'alert-success'}`}>{message}</div>}
      <form onSubmit={handleSubmit} className="glass-card-static p-6 space-y-5 animate-fade-in-up">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Ad Soyad *</label>
          <input name="full_name" type="text" required defaultValue={tenant.full_name} className="input-dark" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Telefon</label>
            <input name="phone" type="tel" defaultValue={tenant.phone || ''} className="input-dark" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
            <input name="email" type="email" defaultValue={tenant.email || ''} className="input-dark" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Bağlı Mülk</label>
          <select name="property_id" defaultValue={tenant.property_id || ''} className="input-dark">
            <option value="">Mülk seçin (boş bırak)</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} {p.status === 'active' && p.id !== tenant.property_id ? '(Dolu)' : p.status === 'vacant' ? '(Boş)' : ''}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Notlar</label>
          <textarea name="notes" rows={3} defaultValue={tenant.notes || ''} className="input-dark"></textarea>
        </div>
        <div className="flex items-center gap-2">
          <input name="is_active" type="checkbox" defaultChecked={tenant.is_active} className="w-4 h-4 rounded bg-slate-700 border-slate-600" />
          <label className="text-sm text-slate-300">Aktif Kiracı</label>
        </div>
        <div className="flex gap-3">
          <button type="submit" disabled={loading} className="btn-primary flex-1 py-3">{loading ? 'Güncelleniyor...' : 'Güncelle'}</button>
          <Link href="/tenants" className="py-3 px-6 rounded-xl bg-white/[0.06] text-slate-300 hover:bg-white/[0.1] border border-white/[0.1] transition-colors text-center">İptal</Link>
        </div>
      </form>
    </>
  )
}