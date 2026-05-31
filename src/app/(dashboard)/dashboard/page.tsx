import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1

  const { data: rentPeriods } = await supabase
    .from('rent_periods')
    .select('expected_amount, paid_amount, status')
    .eq('user_id', user.id)
    .eq('year', currentYear)
    .eq('month', currentMonth)
  const rentPeriodsAny = (rentPeriods ?? []) as any[]

  const totalExpected = rentPeriodsAny.reduce((sum, r) => sum + (r.expected_amount || 0), 0) || 0
  const totalCollected = rentPeriodsAny.reduce((sum, r) => sum + (r.paid_amount || 0), 0) || 0
  const remainingDebt = totalExpected - totalCollected
  const overdueCount = rentPeriodsAny.filter(r => r.status === 'overdue').length || 0

  const thirtyDaysLater = new Date()
  thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30)
  
  const { data: upcomingContracts } = await supabase
    .from('contracts')
    .select('*, tenants(full_name), properties(name)')
    .eq('user_id', user.id)
    .lte('end_date', thirtyDaysLater.toISOString().split('T')[0])
    .gte('end_date', new Date().toISOString().split('T')[0])
    .order('end_date', { ascending: true })

  const upcomingContractsAny = (upcomingContracts ?? []) as any[]

  return (
    <div className="page-container">
      <div className="mb-8 animate-fade-in-up">
        <h1 className="text-3xl font-bold text-white mb-1">Dashboard</h1>
        <p className="text-slate-400">Kira durumunuza genel bakış</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        <div className="stat-card stat-blue animate-fade-in-up stagger-1">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">💎</span>
            <p className="text-sm text-slate-400 font-medium">Bu Ay Beklenen</p>
          </div>
          <p className="text-2xl font-bold text-white">
            {totalExpected.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
          </p>
        </div>
        
        <div className="stat-card stat-green animate-fade-in-up stagger-2">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">✅</span>
            <p className="text-sm text-slate-400 font-medium">Tahsil Edilen</p>
          </div>
          <p className="text-2xl font-bold text-white">
            {totalCollected.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
          </p>
        </div>
        
        <div className="stat-card stat-orange animate-fade-in-up stagger-3">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">⏳</span>
            <p className="text-sm text-slate-400 font-medium">Kalan Alacak</p>
          </div>
          <p className="text-2xl font-bold text-white">
            {remainingDebt.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
          </p>
        </div>
        
        <div className="stat-card stat-red animate-fade-in-up stagger-4">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">⚠️</span>
            <p className="text-sm text-slate-400 font-medium">Geciken Kiracı</p>
          </div>
          <p className="text-2xl font-bold text-red-400">{overdueCount}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8 animate-fade-in-up stagger-3">
        <Link href="/properties/new" className="glass-card p-4 text-center hover:border-indigo-500/30 block">
          <span className="text-2xl block mb-2">🏠</span>
          <span className="text-sm text-slate-300 font-medium">Mülk Ekle</span>
        </Link>
        <Link href="/tenants/new" className="glass-card p-4 text-center hover:border-indigo-500/30 block">
          <span className="text-2xl block mb-2">👤</span>
          <span className="text-sm text-slate-300 font-medium">Kiracı Ekle</span>
        </Link>
        <Link href="/contracts/new" className="glass-card p-4 text-center hover:border-indigo-500/30 block">
          <span className="text-2xl block mb-2">📄</span>
          <span className="text-sm text-slate-300 font-medium">Sözleşme Ekle</span>
        </Link>
        <Link href="/payments/new" className="glass-card p-4 text-center hover:border-indigo-500/30 block">
          <span className="text-2xl block mb-2">💰</span>
          <span className="text-sm text-slate-300 font-medium">Ödeme Ekle</span>
        </Link>
      </div>

      {/* Upcoming Contracts */}
      <div className="glass-card-static animate-fade-in-up stagger-4">
        <div className="px-6 py-4 border-b border-white/[0.08]">
          <h2 className="text-lg font-semibold text-white">📆 Yaklaşan Sözleşme Bitişleri</h2>
        </div>
        <div className="p-6">
          {upcomingContractsAny.length > 0 ? (
            <div className="space-y-3">
              {upcomingContractsAny.map((contract) => {
                const daysLeft = Math.ceil((new Date(contract.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                return (
                  <div key={contract.id} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-colors">
                    <div>
                      <p className="font-medium text-white">{contract.tenants?.full_name}</p>
                      <p className="text-sm text-slate-400">{contract.properties?.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-red-400">{daysLeft} gün kaldı</p>
                      <p className="text-xs text-slate-500">{new Date(contract.end_date).toLocaleDateString('tr-TR')}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-slate-500 text-center py-4">Yaklaşan sözleşme bitişi yok.</p>
          )}
        </div>
      </div>
    </div>
  )
}