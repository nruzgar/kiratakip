import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function ContractsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: contracts } = await supabase
    .from('contracts')
    .select('*, tenants(full_name), properties(name)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const contractsAny = (contracts ?? []) as any[]

  return (
    <div className="page-container">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8 animate-fade-in-up">
        <div>
          <h1 className="text-3xl font-bold text-white">Sözleşmelerim</h1>
          <p className="text-slate-400 text-sm mt-1">{contractsAny.length} sözleşme kayıtlı</p>
        </div>
        <Link href="/contracts/new" className="btn-primary inline-flex items-center gap-2 text-center justify-center">
          <span>+</span> Yeni Sözleşme Ekle
        </Link>
      </div>

      {contractsAny.length > 0 ? (
        <>
          {/* Desktop Table */}
          <div className="glass-card-static overflow-hidden hidden md:block animate-fade-in-up stagger-1">
            <table className="premium-table">
              <thead>
                <tr>
                  <th>Kiracı</th><th>Mülk</th><th>Başlangıç</th><th>Bitiş</th><th>Kira</th><th>Durum</th>
                </tr>
              </thead>
              <tbody>
                {contractsAny.map((contract) => {
                  const endDate = new Date(contract.end_date)
                  const daysLeft = Math.ceil((endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                  const isExpired = daysLeft < 0
                  const isExpiringSoon = !isExpired && daysLeft <= 30
                  return (
                    <tr key={contract.id}>
                      <td className="font-medium">{contract.tenants?.full_name || '—'}</td>
                      <td className="text-slate-400">{contract.properties?.name || '—'}</td>
                      <td className="text-slate-400">{new Date(contract.start_date).toLocaleDateString('tr-TR')}</td>
                      <td className="text-slate-400">{endDate.toLocaleDateString('tr-TR')}</td>
                      <td className="font-medium">{(contract.rent_amount || 0).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</td>
                      <td>
                        <span className={`badge ${isExpired ? 'badge-danger' : isExpiringSoon ? 'badge-warning' : 'badge-success'}`}>
                          {isExpired ? 'Süresi Dolmuş' : isExpiringSoon ? `${daysLeft} gün kaldı` : 'Aktif'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3 animate-fade-in-up stagger-1">
            {contractsAny.map((contract) => {
              const endDate = new Date(contract.end_date)
              const daysLeft = Math.ceil((endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
              const isExpired = daysLeft < 0
              const isExpiringSoon = !isExpired && daysLeft <= 30
              return (
                <div key={contract.id} className="glass-card p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-medium text-white">{contract.tenants?.full_name || '—'}</p>
                      <p className="text-sm text-slate-400">{contract.properties?.name || '—'}</p>
                    </div>
                    <span className={`badge ${isExpired ? 'badge-danger' : isExpiringSoon ? 'badge-warning' : 'badge-success'}`}>
                      {isExpired ? 'Dolmuş' : isExpiringSoon ? `${daysLeft}g` : 'Aktif'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-400">
                    <span>{new Date(contract.start_date).toLocaleDateString('tr-TR')} - {endDate.toLocaleDateString('tr-TR')}</span>
                    <span className="font-medium text-white">{(contract.rent_amount || 0).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      ) : (
        <div className="glass-card-static empty-state animate-fade-in-up">
          <div className="empty-state-icon">📄</div>
          <p className="text-slate-400 mb-4">Henüz sözleşme eklenmemiş.</p>
          <Link href="/contracts/new" className="btn-primary inline-block">İlk Sözleşmeni Ekle</Link>
        </div>
      )}
    </div>
  )
}
