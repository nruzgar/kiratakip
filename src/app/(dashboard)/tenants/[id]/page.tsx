import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'

export default async function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { id } = await params

  const { data: tenant } = await supabase
    .from('tenants')
    .select('*, properties(id, name, monthly_rent, payment_day), contracts(*), rent_periods(*, payments(*, receipts(*)))')
    .eq('id', id).eq('user_id', user.id).single()

  if (!tenant) notFound()

  const totalDebt = tenant.rent_periods?.reduce((sum: number, period: any) => sum + (period.expected_amount - period.paid_amount), 0) || 0

  return (
    <div className="page-container">
      {/* Kiracı Kartı */}
      <div className="glass-card-static p-6 mb-6 animate-fade-in-up">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">{tenant.full_name}</h1>
            <div className="mt-3 space-y-1 text-slate-400">
              <p>📞 {tenant.phone || 'Telefon yok'}</p>
              <p>📧 {tenant.email || 'Email yok'}</p>
              <p>🏠 {tenant.properties?.name || 'Mülk atanmamış'}</p>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <span className={`badge ${tenant.is_active ? 'badge-success' : 'badge-neutral'}`}>
              {tenant.is_active ? 'Aktif Kiracı' : 'Pasif'}
            </span>
            <p className={`mt-2 text-2xl font-bold ${totalDebt > 0 ? 'text-red-400' : 'text-green-400'}`}>
              {totalDebt > 0 ? `${totalDebt.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })} Borç` : 'Borç Yok ✓'}
            </p>
          </div>
        </div>
        {tenant.notes && (
          <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-sm text-amber-200">
            <strong>Notlar:</strong> {tenant.notes}
          </div>
        )}
      </div>

      {/* Kira Dönemleri */}
      <div className="glass-card-static mb-6 animate-fade-in-up stagger-2">
        <div className="border-b border-white/[0.08] px-6 py-4">
          <h2 className="text-lg font-semibold text-white">💰 Kira Dönemleri ve Ödemeler</h2>
        </div>
        <div className="p-6">
          {tenant.rent_periods && tenant.rent_periods.length > 0 ? (
            <div className="space-y-3">
              {tenant.rent_periods.map((period: any) => (
                <div key={period.id} className={`p-4 rounded-xl border ${
                  period.status === 'paid' ? 'bg-green-500/10 border-green-500/20' :
                  period.status === 'overdue' ? 'bg-red-500/10 border-red-500/20' :
                  period.status === 'partial' ? 'bg-amber-500/10 border-amber-500/20' :
                  'bg-white/[0.03] border-white/[0.06]'
                }`}>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                    <div>
                      <p className="font-medium text-white">{period.month}/{period.year} - Son Ödeme: {new Date(period.due_date).toLocaleDateString('tr-TR')}</p>
                      <p className="text-sm text-slate-400">Beklenen: {period.expected_amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>
                    </div>
                    <div className="sm:text-right">
                      <span className={`badge ${
                        period.status === 'paid' ? 'badge-success' : period.status === 'overdue' ? 'badge-danger' :
                        period.status === 'partial' ? 'badge-warning' : 'badge-neutral'
                      }`}>
                        {period.status === 'paid' ? 'Ödendi' : period.status === 'overdue' ? 'Gecikti' : period.status === 'partial' ? 'Kısmi' : 'Bekliyor'}
                      </span>
                      <p className="text-sm mt-1 text-slate-400">Ödenen: {period.paid_amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500">Henüz kira dönemi oluşturulmamış. Sözleşme ekleyin.</p>
          )}
        </div>
      </div>

      {/* Sözleşmeler */}
      <div className="glass-card-static animate-fade-in-up stagger-3">
        <div className="border-b border-white/[0.08] px-6 py-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <h2 className="text-lg font-semibold text-white">📄 Sözleşmeler</h2>
          <Link href={`/contracts/new?tenant=${tenant.id}`} className="btn-primary text-sm py-2 px-4 text-center">+ Sözleşme Ekle</Link>
        </div>
        <div className="p-6">
          {tenant.contracts && tenant.contracts.length > 0 ? (
            <div className="space-y-3">
              {tenant.contracts.map((contract: any) => {
                const daysLeft = Math.ceil((new Date(contract.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                return (
                  <div key={contract.id} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-2">
                      <div>
                        <p className="font-medium text-white">{new Date(contract.start_date).toLocaleDateString('tr-TR')} - {new Date(contract.end_date).toLocaleDateString('tr-TR')}</p>
                        <p className="text-sm text-slate-400">Kira: {contract.rent_amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })} | Depozito: {contract.deposit_amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>
                      </div>
                      <div className="sm:text-right">
                        <p className={`text-sm font-medium ${daysLeft < 30 ? 'text-red-400' : 'text-green-400'}`}>
                          {daysLeft > 0 ? `${daysLeft} gün kaldı` : 'Sona erdi'}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-slate-500">Henüz sözleşme eklenmemiş.</p>
          )}
        </div>
      </div>
    </div>
  )
}