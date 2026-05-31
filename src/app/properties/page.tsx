import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function PropertiesPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: properties } = await supabase
    .from('properties')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link href="/dashboard" className="text-xl font-bold text-blue-600">KiraTakip</Link>
              <Link href="/dashboard" className="text-gray-700 hover:text-blue-600">Dashboard</Link>
              <Link href="/properties" className="text-blue-600 font-medium">Mülkler</Link>
              <Link href="/tenants" className="text-gray-700 hover:text-blue-600">Kiracılar</Link>
              <Link href="/contracts" className="text-gray-700 hover:text-blue-600">Sözleşmeler</Link>
              <Link href="/payments" className="text-gray-700 hover:text-blue-600">Ödemeler</Link>
              <Link href="/settings" className="text-gray-700 hover:text-blue-600">Ayarlar</Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Mülklerim</h1>
          <Link 
            href="/properties/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            + Yeni Mülk Ekle
          </Link>
        </div>

        {properties && properties.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map((property) => (
              <div key={property.id} className="bg-white p-6 rounded-lg shadow">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold">{property.name}</h3>
                  <div className="flex space-x-2">
                    <Link 
                      href={`/properties/${property.id}/edit`}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Düzenle
                    </Link>
                    <span className={`px-2 py-1 text-xs rounded ${
                      property.status === 'active' ? 'bg-green-100 text-green-800' :
                      property.status === 'vacant' ? 'bg-gray-100 text-gray-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {property.status === 'active' ? 'Dolu' :
                       property.status === 'vacant' ? 'Boş' : 'Bakımda'}
                    </span>
                  </div>
                </div>
                <p className="text-gray-600 text-sm mb-2">{property.type}</p>
                <p className="text-gray-500 text-sm mb-4">{property.address}</p>
                <div className="border-t pt-4">
                  <p className="text-sm text-gray-600">
                    Aylık Kira: <span className="font-semibold text-blue-600">
                      {property.monthly_rent.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                    </span>
                  </p>
                  <p className="text-sm text-gray-600">
                    Ödeme Günü: Her ayın <span className="font-semibold">{property.payment_day}</span>. günü
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500 mb-4">Henüz mülk eklenmemiş.</p>
            <Link 
              href="/properties/new"
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              İlk Mülkünü Ekle
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}