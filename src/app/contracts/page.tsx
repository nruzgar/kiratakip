import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function ContractsPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: contracts } = await supabase
    .from('contracts')
    .select(`
      *,
      tenants(full_name),
      properties(name)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const contractsAny = (contracts ?? []) as any[]

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link href="/dashboard" className="text-xl font-bold text-blue-600">KiraTakip</Link>
              <Link href="/dashboard" className="text-gray-700 hover:text-blue-600">Dashboard</Link>
              <Link href="/properties" className="text-gray-700 hover:text-blue-600">Mülkler</Link>
              <Link href="/tenants" className="text-gray-700 hover:text-blue-600">Kiracılar</Link>
              <Link href="/contracts" className="text-blue-600 font-medium">Sözleşmeler</Link>
              <Link href="/payments" className="text-gray-700 hover:text-blue-600">Ödemeler</Link>
              <Link href="/settings" className="text-gray-700 hover:text-blue-600">Ayarlar</Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Sözleşmelerim</h1>
          <Link 
            href="/contracts/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            + Yeni Sözleşme Ekle
          </Link>
        </div>

        {contractsAny.length > 0 ? (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kiracı</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mülk</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Başlangıç</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bitiş</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kira</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {contractsAny.map((contract) => {
                  const endDate = new Date(contract.end_date)
                  const now = new Date()
                  const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                  const isExpired = daysLeft < 0
                  const isExpiringSoon = !isExpired && daysLeft <= 30

                  return (
                    <tr key={contract.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {contract.tenants?.full_name || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {contract.properties?.name || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(contract.start_date).toLocaleDateString('tr-TR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {endDate.toLocaleDateString('tr-TR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                        {(contract.rent_amount || 0).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isExpired ? (
                          <span className="px-2 py-1 text-xs rounded bg-red-100 text-red-800">Süresi Dolmuş</span>
                        ) : isExpiringSoon ? (
                          <span className="px-2 py-1 text-xs rounded bg-orange-100 text-orange-800">{daysLeft} gün kaldı</span>
                        ) : (
                          <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-800">Aktif</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500 mb-4">Henüz sözleşme eklenmemiş.</p>
            <Link 
              href="/contracts/new"
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              İlk Sözleşmeni Ekle
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
