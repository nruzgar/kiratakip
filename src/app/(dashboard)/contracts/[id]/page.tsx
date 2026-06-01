import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getSignedFileUrl } from '@/lib/actions/storage'
import ContractActions from './ContractActions'

export default async function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')
    const { id } = await params

    const { data: contract } = await supabase
        .from('contracts')
        .select('*, tenants(full_name, phone, email), properties(name, address, monthly_rent, payment_day)')
        .eq('id', id)
        .eq('user_id', user.id)
        .single()

    if (!contract) notFound()

    const { data: rentPeriods } = await (supabase
        .from('rent_periods')
        .select('*, payments(*, receipts(*))')
        .eq('tenant_id' as any, contract.tenant_id)
        .eq('user_id', user.id)
        .order('year', { ascending: false })
        .order('month', { ascending: false }) as any)

    const rentPeriodsAny = (rentPeriods ?? []) as any[]
    const totalExpected = rentPeriodsAny.reduce((sum, p) => sum + (p.expected_amount || 0), 0) || 0
    const totalPaid = rentPeriodsAny.reduce((sum, p) => sum + (p.paid_amount || 0), 0) || 0
    const totalDebt = totalExpected - totalPaid
    const overdueCount = rentPeriodsAny.filter(p => p.status === 'overdue').length || 0

    let signedUrl: string | null = null
    if (contract.file_url) {
        signedUrl = await getSignedFileUrl(contract.file_url)
    }

    const startDate = new Date(contract.start_date)
    const endDate = new Date(contract.end_date)
    const daysLeft = Math.ceil((endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    const isExpired = daysLeft < 0

    // status NULL ise ve bitiş tarihi geçmemişse aktif say
    const isActive = (contract as any).status === 'active' || (!(contract as any).status && !isExpired)
    const isCancelled = (contract as any).status === 'cancelled'
    const statusLabel = isActive ? 'Aktif' : isCancelled ? 'İptal Edildi' : 'Süresi Dolmuş'
    const statusBadge = isActive ? 'badge-success' : isCancelled ? 'badge-neutral' : 'badge-danger'

    return (
        <div className="page-container">
            {/* Üst Bilgi */}
            <div className="glass-card-static p-6 mb-6 animate-fade-in-up">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-2xl font-bold text-white">Sözleşme Detayı</h1>
                            <span className={`badge ${statusBadge}`}>{statusLabel}</span>
                        </div>
                        <p className="text-slate-400">
                            {contract.tenants?.full_name} — {contract.properties?.name}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        {isActive && (
                            <Link href={`/contracts/${id}/edit`} className="btn-primary text-sm py-2 px-4">
                                ✏️ Düzenle
                            </Link>
                        )}
                        <ContractActions contractId={id} isActive={isActive} />
                    </div>
                </div>

                {/* Özet Kartları */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                        <p className="text-xs text-slate-500 mb-1">Toplam Kira</p>
                        <p className="text-lg font-bold text-white">{totalExpected.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                        <p className="text-xs text-slate-500 mb-1">Tahsil Edilen</p>
                        <p className="text-lg font-bold text-green-400">{totalPaid.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                        <p className="text-xs text-slate-500 mb-1">Kalan Borç</p>
                        <p className={`text-lg font-bold ${totalDebt > 0 ? 'text-red-400' : 'text-green-400'}`}>
                            {totalDebt.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                        </p>
                    </div>
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                        <p className="text-xs text-slate-500 mb-1">Geciken Dönem</p>
                        <p className={`text-lg font-bold ${overdueCount > 0 ? 'text-red-400' : 'text-green-400'}`}>
                            {overdueCount}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* Sözleşme Bilgileri */}
                <div className="glass-card-static p-6 animate-fade-in-up stagger-1">
                    <h2 className="text-lg font-semibold text-white mb-4">📋 Sözleşme Bilgileri</h2>
                    <div className="space-y-3">
                        <div>
                            <p className="text-xs text-slate-500 uppercase">Kiracı</p>
                            <Link href={`/tenants/${contract.tenant_id}`} className="text-white font-medium hover:text-indigo-400 transition-colors">
                                {contract.tenants?.full_name}
                            </Link>
                            {contract.tenants?.phone && <p className="text-sm text-slate-400">{contract.tenants.phone}</p>}
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 uppercase">Mülk</p>
                            <p className="text-white font-medium">{contract.properties?.name}</p>
                            {contract.properties?.address && <p className="text-sm text-slate-400">{contract.properties.address}</p>}
                        </div>
                        <div className="border-t border-white/[0.08] pt-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <p className="text-xs text-slate-500 uppercase">Başlangıç</p>
                                    <p className="text-white">{startDate.toLocaleDateString('tr-TR')}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase">Bitiş</p>
                                    <p className="text-white">{endDate.toLocaleDateString('tr-TR')}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase">Aylık Kira</p>
                                    <p className="text-white font-semibold">{(contract.rent_amount || 0).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase">Depozito</p>
                                    <p className="text-white">{(contract.deposit_amount || 0).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase">Ödeme Günü</p>
                                    <p className="text-white">Her ay {contract.properties?.payment_day || 5}. gün</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase">Kalan Süre</p>
                                    <p className={`${isExpired ? 'text-red-400' : daysLeft <= 30 ? 'text-amber-400' : 'text-green-400'}`}>
                                        {isExpired ? 'Sona erdi' : `${daysLeft} gün`}
                                    </p>
                                </div>
                            </div>
                        </div>
                        {contract.notes && (
                            <div className="border-t border-white/[0.08] pt-3">
                                <p className="text-xs text-slate-500 uppercase mb-1">Notlar</p>
                                <p className="text-sm text-slate-300">{contract.notes}</p>
                            </div>
                        )}
                        {signedUrl && (
                            <div className="border-t border-white/[0.08] pt-3">
                                <p className="text-xs text-slate-500 uppercase mb-1">Sözleşme Dosyası</p>
                                <a href={signedUrl} target="_blank" rel="noopener noreferrer"
                                    className="btn-primary text-sm py-2 px-4 inline-flex items-center gap-2">
                                    📄 Dosyayı Görüntüle
                                </a>
                            </div>
                        )}
                    </div>
                </div>

                {/* Kira Dönemleri */}
                <div className="lg:col-span-2 glass-card-static p-6 animate-fade-in-up stagger-2">
                    <h2 className="text-lg font-semibold text-white mb-4">💰 Kira Dönemleri</h2>
                    {rentPeriodsAny.length > 0 ? (
                        <div className="space-y-2">
                            {rentPeriodsAny.map((period) => {
                                const payments = (period.payments || []) as any[]
                                return (
                                    <div key={period.id} className={`p-4 rounded-xl border ${period.status === 'paid' ? 'bg-green-500/10 border-green-500/20' :
                                        period.status === 'overdue' ? 'bg-red-500/10 border-red-500/20' :
                                            period.status === 'partial' ? 'bg-amber-500/10 border-amber-500/20' :
                                                'bg-white/[0.03] border-white/[0.06]'
                                        }`}>
                                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-medium text-white">{period.month}/{period.year}</p>
                                                    <span className={`badge text-xs ${period.status === 'paid' ? 'badge-success' :
                                                        period.status === 'overdue' ? 'badge-danger' :
                                                            period.status === 'partial' ? 'badge-warning' : 'badge-neutral'
                                                        }`}>
                                                        {period.status === 'paid' ? 'Ödendi' :
                                                            period.status === 'overdue' ? 'Gecikti' :
                                                                period.status === 'partial' ? 'Kısmi' : 'Bekliyor'}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-500 mt-1">
                                                    Vade: {new Date(period.due_date).toLocaleDateString('tr-TR')}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm">
                                                    Kira: <span className="text-white font-medium">{period.expected_amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
                                                </p>
                                                <p className="text-sm">
                                                    Ödenen: <span className="text-green-400 font-medium">{period.paid_amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
                                                </p>
                                                {(period.expected_amount - period.paid_amount) > 0 && (
                                                    <p className="text-sm">
                                                        Kalan: <span className="text-red-400 font-medium">{(period.expected_amount - period.paid_amount).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        {/* Ödeme detayları */}
                                        {payments.length > 0 && (
                                            <div className="mt-3 pt-3 border-t border-white/[0.08] space-y-1">
                                                {payments.map((payment: any) => (
                                                    <div key={payment.id} className="flex items-center justify-between text-sm">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-slate-400">{new Date(payment.payment_date).toLocaleDateString('tr-TR')}</span>
                                                            <span className="badge badge-info text-xs">
                                                                {payment.method === 'bank' ? 'Banka' : payment.method === 'cash' ? 'Nakit' : 'K.Kartı'}
                                                            </span>
                                                            {payment.receipt_file_url && (
                                                                <span className="text-green-400 text-xs">📎 Dekont</span>
                                                            )}
                                                        </div>
                                                        <span className="text-green-400 font-medium">
                                                            +{payment.amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        <p className="text-slate-500 text-center py-8">Henüz kira dönemi oluşturulmamış.</p>
                    )}
                </div>
            </div>
        </div>
    )
}