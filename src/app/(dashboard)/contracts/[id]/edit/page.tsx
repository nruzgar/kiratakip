'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { uploadContractFile } from '@/lib/actions/storage'
import { regenerateRentPeriods } from '@/lib/actions/rentPeriods'

export default function EditContractPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter()
    const [contractId, setContractId] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')
    const [contract, setContract] = useState<any>(null)
    const [tenants, setTenants] = useState<any[]>([])
    const [properties, setProperties] = useState<any[]>([])
    const [file, setFile] = useState<File | null>(null)

    useEffect(() => {
        params.then(p => setContractId(p.id))
    }, [params])

    useEffect(() => {
        const cid = contractId
        if (!cid) return
        async function fetchData() {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: c } = await supabase.from('contracts').select('*').eq('id', cid!).eq('user_id', user.id).single()
            setContract(c)

            const { data: t } = await supabase.from('tenants').select('id, full_name, property_id').eq('user_id', user.id).eq('is_active', true)
            setTenants(t || [])

            const { data: p } = await supabase.from('properties').select('id, name').eq('user_id', user.id)
            setProperties(p || [])
        }
        fetchData()
    }, [contractId])

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        setMessage('')

        if (!contractId) {
            setMessage('Hata: Sözleşme ID bulunamadı')
            setLoading(false)
            return
        }

        const formData = new FormData(e.currentTarget)
        const contractData = {
            tenant_id: formData.get('tenant_id') as string,
            property_id: formData.get('property_id') as string,
            start_date: formData.get('start_date') as string,
            end_date: formData.get('end_date') as string,
            rent_amount: Number(formData.get('rent_amount')),
            deposit_amount: Number(formData.get('deposit_amount')),
            notes: formData.get('notes') as string,
        }

        const supabase = createClient()
        const { error } = await supabase.from('contracts').update(contractData as any).eq('id', contractId)

        if (error) {
            setMessage('Hata: ' + error.message)
            setLoading(false)
            return
        }

        // Dosya varsa yükle
        if (file) {
            const fileFormData = new FormData()
            fileFormData.append('file', file)
            const result = await uploadContractFile(contractId, fileFormData)
            if (!result.success) {
                setMessage('Uyarı: Sözleşme güncellendi ancak dosya yüklenemedi: ' + result.error)
                setLoading(false)
                return
            }
        }

        // Kira dönemlerini yeniden oluştur
        try {
            await regenerateRentPeriods(contractId)
        } catch (e: any) {
            // Ödeme varsa kira dönemleri korunur
        }

        setMessage('Sözleşme güncellendi!')
        setTimeout(() => router.push(`/contracts/${contractId}`), 1500)
        setLoading(false)
    }

    if (!contract) {
        return (
            <div className="page-container">
                <div className="text-slate-400 animate-pulse">Yükleniyor...</div>
            </div>
        )
    }

    return (
        <div className="page-container max-w-2xl">
            <div className="mb-8 animate-fade-in-up">
                <h1 className="text-2xl font-bold text-white">Sözleşme Düzenle</h1>
                <p className="text-slate-400 text-sm mt-1">Sözleşme bilgilerini güncelleyin</p>
            </div>

            {message && (
                <div className={`mb-4 ${message.includes('Hata') || message.includes('Uyarı') ? 'alert-error' : 'alert-success'}`}>
                    {message}
                </div>
            )}

            <form onSubmit={handleSubmit} className="glass-card-static p-6 space-y-5 animate-fade-in-up stagger-1">
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Kiracı *</label>
                    <select name="tenant_id" required defaultValue={contract.tenant_id} className="input-dark">
                        <option value="">Kiracı seçin</option>
                        {tenants.map((t) => (<option key={t.id} value={t.id}>{t.full_name}</option>))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Mülk *</label>
                    <select name="property_id" required defaultValue={contract.property_id} className="input-dark">
                        <option value="">Mülk seçin</option>
                        {properties.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
                    </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Başlangıç Tarihi *</label>
                        <input name="start_date" type="date" required defaultValue={contract.start_date} className="input-dark" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Bitiş Tarihi *</label>
                        <input name="end_date" type="date" required defaultValue={contract.end_date} className="input-dark" />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Aylık Kira (TL) *</label>
                        <input name="rent_amount" type="number" required min="0" defaultValue={contract.rent_amount} className="input-dark" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Depozito (TL)</label>
                        <input name="deposit_amount" type="number" min="0" defaultValue={contract.deposit_amount} className="input-dark" />
                    </div>
                </div>
                <p className="text-xs text-slate-500">Ödeme günü mülk bilgilerinden alınır.</p>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        Sözleşme Dosyası {contract.file_url ? '(Mevcut dosya var, üzerine yazmak için yeni dosya seçin)' : ''}
                    </label>
                    <input
                        type="file"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                        className="input-dark file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-indigo-500/20 file:text-indigo-300 hover:file:bg-indigo-500/30"
                    />
                    <p className="text-xs text-slate-500 mt-1">PDF, DOC, DOCX, JPG, PNG — maks 10MB</p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Notlar</label>
                    <textarea name="notes" rows={3} defaultValue={contract.notes || ''} className="input-dark" placeholder="Sözleşme hakkında notlar..."></textarea>
                </div>

                <div className="flex gap-3">
                    <button type="submit" disabled={loading} className="btn-primary flex-1 py-3">
                        {loading ? 'Kaydediliyor...' : '💾 Değişiklikleri Kaydet'}
                    </button>
                    <button type="button" onClick={() => router.back()}
                        className="px-6 py-3 rounded-xl bg-white/[0.06] text-slate-300 hover:bg-white/[0.1] transition-colors">
                        İptal
                    </button>
                </div>
            </form>
        </div>
    )
}