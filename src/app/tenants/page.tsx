import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function TenantsPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: tenants } = await supabase
    .from('tenants')
    .select(`
      *,
      properties(id, name)
    `)
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
              <Link href="/properties" className="text-gray-700 hover:text-blue-600">Mülkler</Link>
              <Link href="/tenants" className="text-blue-600 font-medium">Kiracılar</Link>
              <Link href="/payments" className="text-gray-700 hover:text-blue-600">Ödemeler</Link>
              <Link href="/settings" className="text-gray-700 hover:text-blue-600">Ayarlar</Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Kiracılarım</h1>
          <Link 
            href="/tenants/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            + Yeni Kiracı Ekle
          </Link>
        </div>

        {tenants && tenants.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tenants.map((tenant) => (
              <div key={tenant.id} className="bg-white p-6 rounded-lg shadow hover:shadow-md transition">
                <div className="flex justify-between items-start mb-4">
                  <Link href={`/tenants/${tenant.id}`} className="flex-1">
                    <h3 className="text-lg font-semibold hover:text-blue-600">{tenant.full_name}</h3>
                  </Link>
                  <div className="flex space-x-2">
                    <Link 
                      href={`/tenants/${tenant.id}/edit`}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Düzenle
                    </Link>
                    <span className={`px-2 py-1 text-xs rounded ${
                      tenant.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {tenant.is_active ? 'Aktif' : 'Pasif'}
                    </span>
                  </div>
                </div>
                <p className="text-gray-600 text-sm mb-1">
                  📞 {tenant.phone || 'Telefon yok'}
                </p>
                <p className="text-gray-600 text-sm mb-1">
                  📧 {tenant.email || 'Email yok'}
                </p>
                <p className="text-gray-500 text-sm">
                  🏠 {tenant.properties?.name || 'Mülk atanmamış'}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500 mb-4">Henüz kiracı eklenmemiş.</p>
            <Link 
              href="/tenants/new"
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              İlk Kiracını Ekle
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}