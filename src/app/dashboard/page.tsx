import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1

  // Bu ay beklenen kira
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

  // Yaklaşan sözleşmeler
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
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <span className="text-xl font-bold text-blue-600">KiraTakip</span>
              <Link href="/dashboard" className="text-gray-700 hover:text-blue-600">Dashboard</Link>
              <Link href="/properties" className="text-gray-700 hover:text-blue-600">Mülkler</Link>
              <Link href="/tenants" className="text-gray-700 hover:text-blue-600">Kiracılar</Link>
              <Link href="/contracts" className="text-gray-700 hover:text-blue-600">Sözleşmeler</Link>
              <Link href="/payments" className="text-gray-700 hover:text-blue-600">Ödemeler</Link>
              <Link href="/settings" className="text-gray-700 hover:text-blue-600">Ayarlar</Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>

        {/* Kartlar */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-sm text-gray-500 mb-1">Bu Ay Beklenen Kira</p>
            <p className="text-2xl font-bold text-blue-600">
              {totalExpected.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-sm text-gray-500 mb-1">Bu Ay Tahsil Edilen</p>
            <p className="text-2xl font-bold text-green-600">
              {totalCollected.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-sm text-gray-500 mb-1">Kalan Alacak</p>
            <p className="text-2xl font-bold text-orange-600">
              {remainingDebt.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-sm text-gray-500 mb-1">Geciken Kiracı</p>
            <p className="text-2xl font-bold text-red-600">{overdueCount}</p>
          </div>
        </div>

        {/* Yaklaşan Sözleşmeler */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold">Yaklaşan Sözleşme Bitişleri</h2>
          </div>
          <div className="p-6">
            {upcomingContracts && upcomingContracts.length > 0 ? (
              <div className="space-y-3">
                {upcomingContractsAny.map((contract) => {
                  const daysLeft = Math.ceil((new Date(contract.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                  return (
                    <div key={contract.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div>
                        <p className="font-medium">{contract.tenants?.full_name}</p>
                        <p className="text-sm text-gray-500">{contract.properties?.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-red-600">{daysLeft} gün kaldı</p>
                        <p className="text-xs text-gray-500">{new Date(contract.end_date).toLocaleDateString('tr-TR')}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-gray-500">Yaklaşan sözleşme bitişi yok.</p>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}