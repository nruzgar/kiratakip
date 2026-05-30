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
    .select(`
      *,
      properties(id, name, monthly_rent, payment_day),
      contracts(*),
      rent_periods(*, payments(*, receipts(*)))
    `)
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!tenant) notFound()

  // Borç hesaplama
  const totalDebt = tenant.rent_periods?.reduce((sum: number, period: any) => {
    return sum + (period.expected_amount - period.paid_amount)
  }, 0) || 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigasyon */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 space-x-8">
            <Link href="/dashboard" className="text-xl font-bold text-blue-600">KiraTakip</Link>
            <Link href="/tenants" className="text-gray-700 hover:text-blue-600">← Kiracılar'a Dön</Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Kiracı Kartı */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{tenant.full_name}</h1>
              <div className="mt-2 space-y-1 text-gray-600">
                <p>📞 {tenant.phone || 'Telefon yok'}</p>
                <p>📧 {tenant.email || 'Email yok'}</p>
                <p>🏠 {tenant.properties?.name || 'Mülk atanmamış'}</p>
              </div>
            </div>
            <div className="text-right">
              <span className={`px-3 py-1 rounded-full text-sm ${
                tenant.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {tenant.is_active ? 'Aktif Kiracı' : 'Pasif'}
              </span>
              <p className="mt-2 text-2xl font-bold text-red-600">
                {totalDebt > 0 ? `${totalDebt.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })} Borç` : 'Borç Yok'}
              </p>
            </div>
          </div>
          {tenant.notes && (
            <div className="mt-4 p-3 bg-yellow-50 rounded text-sm text-gray-700">
              <strong>Notlar:</strong> {tenant.notes}
            </div>
          )}
        </div>

        {/* Kira Dönemleri */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b px-6 py-4">
            <h2 className="text-lg font-semibold">Kira Dönemleri ve Ödemeler</h2>
          </div>
          <div className="p-6">
            {tenant.rent_periods && tenant.rent_periods.length > 0 ? (
              <div className="space-y-3">
                {tenant.rent_periods.map((period: any) => (
                  <div key={period.id} className={`p-4 rounded-lg border ${
                    period.status === 'paid' ? 'bg-green-50 border-green-200' :
                    period.status === 'overdue' ? 'bg-red-50 border-red-200' :
                    period.status === 'partial' ? 'bg-yellow-50 border-yellow-200' :
                    'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">
                          {period.month}/{period.year} - Son Ödeme: {new Date(period.due_date).toLocaleDateString('tr-TR')}
                        </p>
                        <p className="text-sm text-gray-600">
                          Beklenen: {period.expected_amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-1 text-xs rounded ${
                          period.status === 'paid' ? 'bg-green-200 text-green-800' :
                          period.status === 'overdue' ? 'bg-red-200 text-red-800' :
                          period.status === 'partial' ? 'bg-yellow-200 text-yellow-800' :
                          'bg-gray-200 text-gray-800'
                        }`}>
                          {period.status === 'paid' ? 'Ödendi' :
                           period.status === 'overdue' ? 'Gecikti' :
                           period.status === 'partial' ? 'Kısmi' : 'Bekliyor'}
                        </span>
                        <p className="text-sm mt-1">
                          Ödenen: {period.paid_amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">Henüz kira dönemi oluşturulmamış. Sözleşme ekleyin.</p>
            )}
          </div>
        </div>

        {/* Sözleşmeler */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b px-6 py-4 flex justify-between items-center">
            <h2 className="text-lg font-semibold">Sözleşmeler</h2>
            <Link 
              href={`/contracts/new?tenant=${tenant.id}`}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              + Sözleşme Ekle
            </Link>
          </div>
          <div className="p-6">
            {tenant.contracts && tenant.contracts.length > 0 ? (
              <div className="space-y-3">
                {tenant.contracts.map((contract: any) => {
                  const daysLeft = Math.ceil((new Date(contract.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                  return (
                    <div key={contract.id} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex justify-between">
                        <div>
                          <p className="font-medium">
                            {new Date(contract.start_date).toLocaleDateString('tr-TR')} - {new Date(contract.end_date).toLocaleDateString('tr-TR')}
                          </p>
                          <p className="text-sm text-gray-600">
                            Kira: {contract.rent_amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })} | 
                            Depozito: {contract.deposit_amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-medium ${daysLeft < 30 ? 'text-red-600' : 'text-green-600'}`}>
                            {daysLeft > 0 ? `${daysLeft} gün kaldı` : 'Sona erdi'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-gray-500">Henüz sözleşme eklenmemiş.</p>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}