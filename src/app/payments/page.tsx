import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function PaymentsPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: payments } = await supabase
    .from('payments')
    .select(`
      *,
      tenants(id, full_name),
      properties(id, name),
      rent_periods(id, year, month)
    `)
    .eq('user_id', user.id)
    .order('payment_date', { ascending: false })

  const paymentsAny = (payments ?? []) as any[]

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
              <Link href="/payments" className="text-blue-600 font-medium">Ödemeler</Link>
              <Link href="/settings" className="text-gray-700 hover:text-blue-600">Ayarlar</Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Ödemeler</h1>
          <Link 
            href="/payments/new"
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            + Yeni Ödeme Ekle
          </Link>
        </div>

        {paymentsAny && paymentsAny.length > 0 ? (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tarih</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kiracı</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mülk</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dönem</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tutar</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Yöntem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paymentsAny.map((payment) => (
                  <tr key={payment.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(payment.payment_date).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payment.tenants?.full_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {payment.properties?.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {payment.rent_periods?.month}/{payment.rent_periods?.year}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                      {payment.amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {payment.method === 'bank' ? 'Banka' : 
                       payment.method === 'cash' ? 'Nakit' : 
                       payment.method === 'credit_card' ? 'K.Kartı' : 'Diğer'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500 mb-4">Henüz ödeme kaydı yok.</p>
            <Link 
              href="/payments/new"
              className="inline-block px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              İlk Ödemeyi Ekle
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}