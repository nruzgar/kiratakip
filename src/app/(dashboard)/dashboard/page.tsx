import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1
  const todayStr = new Date().toISOString().split('T')[0]

  // Bu ay kira dönemleri
  const { data: monthlyPeriods } = await supabase
    .from('rent_periods')
    .select('expected_amount, paid_amount, status')
    .eq('user_id', user.id)
    .eq('year', currentYear)
    .eq('month', currentMonth)
  const monthlyPeriodsAny = (monthlyPeriods ?? []) as any[]

  const monthlyExpected = monthlyPeriodsAny.reduce((sum, r) => sum + (r.expected_amount || 0), 0) || 0
  const monthlyCollected = monthlyPeriodsAny.reduce((sum, r) => sum + (r.paid_amount || 0), 0) || 0
  const monthlyRemaining = monthlyExpected - monthlyCollected
  const overdueCount = monthlyPeriodsAny.filter(r => r.status === 'overdue').length || 0

  // Tüm gecikmiş dönemler
  const { data: allOverduePeriods } = await supabase
    .from('rent_periods')
    .select('expected_amount, paid_amount, status, tenants(full_name, id), properties(name)')
    .eq('user_id', user.id)
    .eq('status', 'overdue')
    .order('due_date', { ascending: false })
  const allOverdueAny = (allOverduePeriods ?? []) as any[]
  const totalOverdueAmount = allOverdueAny.reduce((sum, r) => sum + (r.expected_amount - r.paid_amount), 0)

  // Toplam özellikler
  const { data: properties } = await supabase
    .from('properties')
    .select('id, status')
    .eq('user_id', user.id)
  const totalProperties = properties?.length || 0
  const activeProperties = properties?.filter(p => p.status === 'active').length || 0

  // Toplam kiracı (aktif)
  const { count: activeTenants } = await supabase
    .from('tenants')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_active', true)

  // 30 gün içinde bitecek sözleşmeler
  const thirtyDaysLater = new Date()
  thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30)
  const thirtyDaysLaterStr = thirtyDaysLater.toISOString().split('T')[0]

  const { data: upcomingContracts } = await supabase
    .from('contracts')
    .select('*, tenants(full_name, id), properties(name)')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .lte('end_date', thirtyDaysLaterStr)
    .gte('end_date', todayStr)
    .order('end_date', { ascending: true })
  const upcomingContractsAny = (upcomingContracts ?? []) as any[]

  // En çok borcu olan kiracılar (tüm dönemler)
  const { data: topDebtTenants } = await supabase
    .from('rent_periods')
    .select('tenant_id, tenants!inner(full_name), expected_amount, paid_amount')
    .eq('user_id', user.id)
    .neq('status', 'paid')

  const debtByTenant = new Map<string, { name: string; debt: number; count: number }>()
  const topDebtAny = (topDebtTenants ?? []) as any[]
  topDebtAny.forEach((r: any) => {
    const id = r.tenant_id
    const current = debtByTenant.get(id) || { name: r.tenants?.full_name || 'Bilinmeyen', debt: 0, count: 0 }
    current.debt += (r.expected_amount - r.paid_amount)
    current.count++
    debtByTenant.set(id, current)
  })
  const topDebtList = Array.from(debtByTenant.entries())
    .sort((a, b) => b[1].debt - a[1].debt)
    .slice(0, 5)

  // Biten ama borcu kalan sözleşmeler
  const { data: expiredWithDebt } = await supabase
    .from('contracts')
    .select('*, tenants(full_name), properties(name)')
    .eq('user_id', user.id)
    .lt('end_date', todayStr)
    .neq('status', 'cancelled')
    .order('end_date', { ascending: false })
    .limit(5)
  const expiredWithDebtAny = (expiredWithDebt ?? []) as any[]

  const hasData = monthlyExpected > 0 || totalProperties > 0 || (activeTenants ?? 0) > 0

  return (
    <div className="page-container">
      <div className="mb-8 animate-fade-in-up">
        <h1 className="text-3xl font-bold text-white mb-1">Dashboard</h1>
        <p className="text-slate-400">Kira durumunuza genel bakış</p>
      </div>

      {!hasData ? (
        <div className="glass-card-static empty-state animate-fade-in-up">
          <div className="empty-state-icon">📊</div>
          <h2 className="text-xl font-semibold text-white mb-2">Hoş Geldiniz!</h2>
          <p className="text-slate-400 mb-6 max-w-md mx-auto">
            Henüz hiç veri eklenmemiş. Başlamak için ilk mülkünüzü ve kiracınızı ekleyin, ardından sözleşme oluşturun. Dashboard otomatik olarak dolacak.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/properties/new" className="btn-primary inline-block">🏠 İlk Mülkü Ekle</Link>
            <Link href="/tenants/new" className="btn-primary inline-block">👤 İlk Kiracıyı Ekle</Link>
          </div>
        </div>
      ) : (
        <>
          {/* KPI Kartları */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 md:gap-6 mb-8">
            <div className="stat-card stat-blue animate-fade-in-up stagger-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">🏠</span>
                <p className="text-sm text-slate-400 font-medium">Toplam Mülk</p>
              </div>
              <p className="text-2xl font-bold text-white">{totalProperties}</p>
              <p className="text-xs text-slate-500 mt-1">{activeProperties} dolu</p>
            </div>

            <div className="stat-card stat-green animate-fade-in-up stagger-2">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">👤</span>
                <p className="text-sm text-slate-400 font-medium">Aktif Kiracı</p>
              </div>
              <p className="text-2xl font-bold text-white">{activeTenants ?? 0}</p>
              <p className="text-xs text-slate-500 mt-1">Toplam kiracı sayısı</p>
            </div>

            <div className="stat-card animate-fade-in-up stagger-3"
              style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.08))', border: '1px solid rgba(99,102,241,0.2)' }}>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">💰</span>
                <p className="text-sm text-slate-400 font-medium">Bu Ay Beklenen</p>
              </div>
              <p className="text-2xl font-bold text-white">
                {monthlyExpected.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
              </p>
              <p className="text-xs text-slate-500 mt-1">{currentMonth}/{currentYear} dönemi</p>
            </div>

            <div className="stat-card stat-orange animate-fade-in-up stagger-4">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">⏳</span>
                <p className="text-sm text-slate-400 font-medium">Bu Ay Kalan</p>
              </div>
              <p className={`text-2xl font-bold ${monthlyRemaining > 0 ? 'text-red-400' : 'text-green-400'}`}>
                {monthlyRemaining.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
              </p>
              <p className="text-xs text-slate-500 mt-1">{monthlyCollected.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })} tahsil edildi</p>
            </div>
          </div>

          {/* İkinci sıra KPI */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 md:gap-6 mb-8">
            <div className="stat-card stat-green animate-fade-in-up stagger-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">✅</span>
                <p className="text-sm text-slate-400 font-medium">Tahsil Edilen (Bu Ay)</p>
              </div>
              <p className="text-2xl font-bold text-white">
                {monthlyCollected.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
              </p>
            </div>

            <div className="stat-card stat-red animate-fade-in-up stagger-2">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">⚠️</span>
                <p className="text-sm text-slate-400 font-medium">Geciken Kiracı (Bu Ay)</p>
              </div>
              <p className="text-2xl font-bold text-red-400">{overdueCount}</p>
            </div>

            <div className="stat-card animate-fade-in-up stagger-3"
              style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(248,113,113,0.08))', border: '1px solid rgba(239,68,68,0.2)' }}>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">📉</span>
                <p className="text-sm text-slate-400 font-medium">Toplam Gecikmiş Alacak</p>
              </div>
              <p className="text-2xl font-bold text-red-400">
                {totalOverdueAmount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
              </p>
              <p className="text-xs text-slate-500 mt-1">{allOverdueAny.length} gecikmiş dönem</p>
            </div>

            <div className="stat-card animate-fade-in-up stagger-4"
              style={{ background: 'linear-gradient(135deg, rgba(251,191,36,0.15), rgba(245,158,11,0.08))', border: '1px solid rgba(251,191,36,0.2)' }}>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">📆</span>
                <p className="text-sm text-slate-400 font-medium">Bitecek Sözleşme</p>
              </div>
              <p className="text-2xl font-bold text-white">{upcomingContractsAny.length}</p>
              <p className="text-xs text-slate-500 mt-1">30 gün içinde</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* En Çok Borcu Olan Kiracılar */}
            <div className="glass-card-static animate-fade-in-up stagger-2">
              <div className="px-6 py-4 border-b border-white/[0.08]">
                <h2 className="text-lg font-semibold text-white">🏆 En Çok Borcu Olan Kiracılar</h2>
              </div>
              <div className="p-6">
                {topDebtList.length > 0 ? (
                  <div className="space-y-3">
                    {topDebtList.map(([id, data], i) => (
                      <Link key={id} href={`/tenants/${id}`}
                        className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="text-slate-500 text-sm font-mono w-5">#{i + 1}</span>
                          <div>
                            <p className="font-medium text-white text-sm">{data.name}</p>
                            <p className="text-xs text-slate-500">{data.count} dönem</p>
                          </div>
                        </div>
                        <span className="text-red-400 font-semibold text-sm">
                          {data.debt.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                        </span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-center py-4 text-sm">Borçlu kiracı bulunmuyor. ✅</p>
                )}
              </div>
            </div>

            {/* Gecikmiş Kira Dönemleri */}
            <div className="glass-card-static animate-fade-in-up stagger-3">
              <div className="px-6 py-4 border-b border-white/[0.08]">
                <h2 className="text-lg font-semibold text-white">⚠️ Gecikmiş Kira Dönemleri</h2>
              </div>
              <div className="p-6">
                {allOverdueAny.length > 0 ? (
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {allOverdueAny.slice(0, 10).map((period: any, i: number) => (
                      <Link key={i} href={`/tenants/${period.tenants?.id}`}
                        className="flex items-center justify-between p-3 rounded-xl bg-red-500/5 border border-red-500/10 hover:bg-red-500/10 transition-colors">
                        <div>
                          <p className="font-medium text-white text-sm">{period.tenants?.full_name}</p>
                          <p className="text-xs text-slate-500">{period.properties?.name}</p>
                        </div>
                        <span className="text-red-400 font-semibold text-sm">
                          {(period.expected_amount - period.paid_amount).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                        </span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-center py-4 text-sm">Gecikmiş kira dönemi yok. ✅</p>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Yaklaşan Sözleşme Bitişleri */}
            <div className="glass-card-static animate-fade-in-up stagger-3">
              <div className="px-6 py-4 border-b border-white/[0.08]">
                <h2 className="text-lg font-semibold text-white">📆 Yaklaşan Sözleşme Bitişleri</h2>
              </div>
              <div className="p-6">
                {upcomingContractsAny.length > 0 ? (
                  <div className="space-y-3">
                    {upcomingContractsAny.map((contract: any) => {
                      const daysLeft = Math.ceil((new Date(contract.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                      return (
                        <Link key={contract.id} href={`/tenants/${contract.tenants?.id}`}
                          className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-colors">
                          <div>
                            <p className="font-medium text-white text-sm">{contract.tenants?.full_name}</p>
                            <p className="text-xs text-slate-500">{contract.properties?.name}</p>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm font-semibold ${daysLeft <= 7 ? 'text-red-400' : 'text-amber-400'}`}>
                              {daysLeft} gün kaldı
                            </p>
                            <p className="text-xs text-slate-500">{new Date(contract.end_date).toLocaleDateString('tr-TR')}</p>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-slate-500 text-center py-4 text-sm">Yaklaşan sözleşme bitişi yok.</p>
                )}
              </div>
            </div>

            {/* Biten Ama Borcu Kalan Sözleşmeler */}
            <div className="glass-card-static animate-fade-in-up stagger-4">
              <div className="px-6 py-4 border-b border-white/[0.08]">
                <h2 className="text-lg font-semibold text-white">📄 Biten Sözleşmeler (Borçlu)</h2>
              </div>
              <div className="p-6">
                {expiredWithDebtAny.length > 0 ? (
                  <div className="space-y-3">
                    {expiredWithDebtAny.map((contract: any) => (
                      <Link key={contract.id} href={`/tenants/${contract.tenant_id}`}
                        className="flex items-center justify-between p-3 rounded-xl bg-amber-500/5 border border-amber-500/10 hover:bg-amber-500/10 transition-colors">
                        <div>
                          <p className="font-medium text-white text-sm">{contract.tenants?.full_name}</p>
                          <p className="text-xs text-slate-500">{contract.properties?.name}</p>
                          <p className="text-xs text-slate-500">Bitiş: {new Date(contract.end_date).toLocaleDateString('tr-TR')}</p>
                        </div>
                        <span className="text-red-400 font-semibold text-sm">
                          {contract.rent_amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}/ay
                        </span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-center py-4 text-sm">Borçlu biten sözleşme yok. ✅</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}