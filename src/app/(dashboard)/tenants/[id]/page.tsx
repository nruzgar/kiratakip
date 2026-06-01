import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getSignedFileUrl } from '@/lib/actions/storage'
import DebtStatementButton from './DebtStatementButton'

export default async function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { id } = await params

  const { data: tenant } = await supabase
    .from('tenants')
    .select('*, properties(id, name, monthly_rent, payment_day, address), contracts(*), rent_periods(*, payments(*, receipts(*)))')
    .eq('id', id).eq('user_id', user.id).single()

  if (!tenant) notFound()

  const periods = (tenant.rent_periods || []) as any[]
  const contracts = (tenant.contracts || []) as any[]

  // Borç hesaplamaları
  const totalExpected = periods.reduce((sum: number, p: any) => sum + (p.expected_amount || 0), 0)
  const totalPaid = periods.reduce((sum: number, p: any) => sum + (p.paid_amount || 0), 0)
  const totalDebt = totalExpected - totalPaid
  const overduePeriods = periods.filter((p: any) => p.status === 'overdue')
  const overdueCount = overduePeriods.length
  const overdueAmount = overduePeriods.reduce((sum: number, p: any) => sum + (p.expected_amount - p.paid_amount), 0)

  // Ortalama gecikme süresi
  const payments = periods.flatMap((p: any) => (p.payments || [])).filter((p: any) => p.payment_date)
  const delayDays = payments
    .map((p: any) => {
      const period = periods.find((rp: any) => rp.id === p.rent_period_id)
      if (!period) return 0
      const dueDate = new Date(period.due_date)
      const payDate = new Date(p.payment_date)
      return Math.ceil((payDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
    })
    .filter((d: number) => d > 0)
  const avgDelay = delayDays.length > 0
    ? Math.round(delayDays.reduce((a: number, b: number) => a + b, 0) / delayDays.length)
    : 0

  // Aktif sözleşme
  const activeContract = contracts.find((c: any) => c.status === 'active')
  // Sözleşme dosya URL'leri
  let contractSignedUrls: Record<string, string | null> = {}
  for (const c of contracts) {
    if (c.file_url) {
      contractSignedUrls[c.id] = await getSignedFileUrl(c.file_url)
    }
  }

  return (
    <div className="page-container">
      {/* Kiracı Kartı */}
      <div className="glass-card-static p-6 mb-6 animate-fade-in-up">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-white">{tenant.full_name}</h1>
              <span className={`badge ${tenant.is_active ? 'badge-success' : 'badge-neutral'}`}>
                {tenant.is_active ? 'Aktif Kiracı' : 'Pasif'}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-slate-400">
              <p>📞 {tenant.phone || 'Telefon yok'}</p>
              <p>📧 {tenant.email || 'Email yok'}</p>
              <p>🏠 {tenant.properties?.name || 'Mülk atanmamış'}</p>
            </div>
            {tenant.properties?.address && (
              <p className="text-sm text-slate-500 mt-1">
                📍 {tenant.properties.address}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex gap-2">
              <Link href={`/tenants/${id}/edit`} className="btn-primary text-sm py-2 px-4">
                ✏️ Düzenle
              </Link>
              <DebtStatementButton tenantId={id} tenantName={tenant.full_name} />
            </div>
            <p className={`text-2xl font-bold ${totalDebt > 0 ? 'text-red-400' : 'text-green-400'}`}>
              {totalDebt > 0
                ? `${totalDebt.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })} Borç`
                : 'Borç Yok ✓'}
            </p>
          </div>
        </div>
        {tenant.notes && (
          <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-sm text-amber-200">
            <strong>Notlar:</strong> {tenant.notes}
          </div>
        )}
      </div>

      {/* KPI Kartları */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-6 animate-fade-in-up stagger-1">
        <div className="stat-card stat-blue p-4">
          <p className="text-xs text-slate-400 mb-1">Toplam Beklenen</p>
          <p className="text-lg font-bold text-white">{totalExpected.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>
        </div>
        <div className="stat-card stat-green p-4">
          <p className="text-xs text-slate-400 mb-1">Tahsil Edilen</p>
          <p className="text-lg font-bold text-white">{totalPaid.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>
        </div>
        <div className="stat-card stat-orange p-4">
          <p className="text-xs text-slate-400 mb-1">Kalan Borç</p>
          <p className={`text-lg font-bold ${totalDebt > 0 ? 'text-red-400' : 'text-green-400'}`}>
            {totalDebt.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
          </p>
        </div>
        <div className="stat-card stat-red p-4">
          <p className="text-xs text-slate-400 mb-1">Geciken Ay</p>
          <p className="text-lg font-bold text-red-400">{overdueCount}</p>
        </div>
        <div className="stat-card p-4" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(99,102,241,0.08))', border: '1px solid rgba(139,92,246,0.2)' }}>
          <p className="text-xs text-slate-400 mb-1">Gecikmiş Alacak</p>
          <p className="text-lg font-bold text-red-400">{overdueAmount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>
        </div>
        <div className="stat-card p-4" style={{ background: 'linear-gradient(135deg, rgba(56,189,248,0.15), rgba(14,165,233,0.08))', border: '1px solid rgba(56,189,248,0.2)' }}>
          <p className="text-xs text-slate-400 mb-1">Ort. Gecikme</p>
          <p className={`text-lg font-bold ${avgDelay > 0 ? 'text-red-400' : 'text-green-400'}`}>
            {avgDelay > 0 ? `${avgDelay} gün` : 'Yok'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Aktif Sözleşme */}
        <div className="glass-card-static p-6 animate-fade-in-up stagger-2">
          <h2 className="text-lg font-semibold text-white mb-4">📋 Aktif Sözleşme</h2>
          {activeContract ? (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-sm text-slate-400">{new Date(activeContract.start_date).toLocaleDateString('tr-TR')} - {new Date(activeContract.end_date).toLocaleDateString('tr-TR')}</p>
                    <p className="text-white font-semibold mt-1">
                      {activeContract.rent_amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })} / ay
                    </p>
                  </div>
                  <span className="badge badge-success">Aktif</span>
                </div>
                <p className="text-sm text-slate-400 mb-1">Ödeme Günü: Her ay {activeContract.payment_day || 5}. gün</p>
                <p className="text-sm text-slate-400">Depozito: {activeContract.deposit_amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>
                {activeContract.notes && <p className="text-xs text-slate-500 mt-2">{activeContract.notes}</p>}
              </div>
              <Link href={`/contracts/${activeContract.id}`} className="btn-primary text-sm py-2 px-4 w-full text-center block">
                📄 Sözleşme Detayı
              </Link>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-slate-500 mb-4">Aktif sözleşme bulunmuyor.</p>
              <Link href={`/contracts/new?tenant=${id}`} className="btn-primary text-sm py-2 px-4 inline-block">
                + Sözleşme Ekle
              </Link>
            </div>
          )}

          {/* Sözleşme Belgeleri */}
          {contracts.filter((c: any) => c.file_url).length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/[0.08]">
              <h3 className="text-sm font-medium text-slate-300 mb-3">📎 Sözleşme Belgeleri</h3>
              <div className="space-y-2">
                {contracts.filter((c: any) => c.file_url).map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.03]">
                    <span className="text-sm text-slate-400">
                      {new Date(c.start_date).toLocaleDateString('tr-TR')} - {new Date(c.end_date).toLocaleDateString('tr-TR')}
                    </span>
                    {contractSignedUrls[c.id] && (
                      <a href={contractSignedUrls[c.id]!} target="_blank" rel="noopener noreferrer"
                        className="text-indigo-400 hover:text-indigo-300 text-sm">
                        📄 Görüntüle
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Kira Dönemleri ve Ödemeler */}
        <div className="lg:col-span-2 glass-card-static p-6 animate-fade-in-up stagger-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">💰 Kira Dönemleri ve Ödemeler</h2>
            <Link href={`/payments/new?tenant=${id}`} className="btn-success text-sm py-2 px-4">+ Ödeme Ekle</Link>
          </div>

          {periods.length > 0 ? (
            <div className="space-y-3">
              {periods.map((period: any) => {
                const periodPayments = (period.payments || []) as any[]
                const remaining = period.expected_amount - period.paid_amount
                return (
                  <div key={period.id} className={`p-4 rounded-xl border ${period.status === 'paid' ? 'bg-green-500/10 border-green-500/20' :
                      period.status === 'overdue' ? 'bg-red-500/10 border-red-500/20' :
                        period.status === 'partial' ? 'bg-amber-500/10 border-amber-500/20' :
                          'bg-white/[0.03] border-white/[0.06]'
                    }`}>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-white">
                            {new Date(period.year, period.month - 1).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}
                          </p>
                          <span className={`badge ${period.status === 'paid' ? 'badge-success' :
                              period.status === 'overdue' ? 'badge-danger' :
                                period.status === 'partial' ? 'badge-warning' : 'badge-neutral'
                            }`}>
                            {period.status === 'paid' ? 'Ödendi' : period.status === 'overdue' ? 'Gecikti' : period.status === 'partial' ? 'Kısmi' : 'Bekliyor'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">Vade: {new Date(period.due_date).toLocaleDateString('tr-TR')}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">
                          Kira: <span className="text-white font-medium">{period.expected_amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
                        </p>
                        <p className="text-sm">
                          Ödenen: <span className="text-green-400 font-medium">{period.paid_amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
                        </p>
                        {remaining > 0 && (
                          <p className="text-sm">
                            Kalan: <span className="text-red-400 font-medium">{remaining.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
                          </p>
                        )}
                      </div>
                    </div>
                    {/* Ödeme detayları */}
                    {periodPayments.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-white/[0.08] space-y-1">
                        {periodPayments.map((payment: any) => (
                          <div key={payment.id} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-slate-400">{new Date(payment.payment_date).toLocaleDateString('tr-TR')}</span>
                              <span className="badge badge-info text-xs">
                                {payment.method === 'bank' ? 'Banka' : payment.method === 'cash' ? 'Nakit' : 'K.Kartı'}
                              </span>
                              {payment.receipt_file_url && (
                                <span className="text-green-400 text-xs" title="Dekont var">📎</span>
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
            <div className="text-center py-8">
              <p className="text-slate-500">Henüz kira dönemi oluşturulmamış. Sözleşme ekleyin.</p>
            </div>
          )}
        </div>
      </div>

      {/* Tüm Sözleşmeler */}
      <div className="glass-card-static p-6 animate-fade-in-up stagger-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">📄 Tüm Sözleşmeler</h2>
          <Link href={`/contracts/new?tenant=${id}`} className="btn-primary text-sm py-2 px-4">+ Yeni Sözleşme</Link>
        </div>
        {contracts.length > 0 ? (
          <div className="space-y-3">
            {contracts.map((contract: any) => {
              const daysLeft = Math.ceil((new Date(contract.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
              const isExpired = daysLeft < 0
              const statusLabel = isExpired ? 'Sona Erdi' : contract.status === 'cancelled' ? 'İptal' : `${daysLeft} gün kaldı`
              const statusClass = isExpired ? 'badge-danger' : contract.status === 'cancelled' ? 'badge-neutral' : daysLeft <= 30 ? 'badge-warning' : 'badge-success'
              return (
                <Link key={contract.id} href={`/contracts/${contract.id}`}
                  className="block p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-colors">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                    <div>
                      <p className="font-medium text-white">
                        {new Date(contract.start_date).toLocaleDateString('tr-TR')} - {new Date(contract.end_date).toLocaleDateString('tr-TR')}
                      </p>
                      <p className="text-sm text-slate-400">
                        Kira: {contract.rent_amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                        {contract.deposit_amount > 0 && ` | Depozito: ${contract.deposit_amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`badge ${statusClass}`}>{statusLabel}</span>
                      {contract.file_url && <span className="text-indigo-400 text-sm">📄</span>}
                    </div>
                  </div>
                  {contract.notes && <p className="text-xs text-slate-500 mt-2">{contract.notes}</p>}
                </Link>
              )
            })}
          </div>
        ) : (
          <p className="text-slate-500 text-center py-4">Henüz sözleşme eklenmemiş.</p>
        )}
      </div>
    </div>
  )
}