import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import EditTenantForm from './EditTenantForm'

export default async function EditTenantPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { id } = await params

  // Kiracıyı çek
  const { data: tenant } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!tenant) redirect('/tenants')

  // Tüm mülkleri çek
  const { data: properties } = await supabase
    .from('properties')
    .select('id, name, status')
    .eq('user_id', user.id)
    .order('name')

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 space-x-8">
            <Link href="/dashboard" className="text-xl font-bold text-blue-600">KiraTakip</Link>
            <Link href="/dashboard" className="text-gray-700 hover:text-blue-600">Dashboard</Link>
            <Link href="/properties" className="text-gray-700 hover:text-blue-600">Mülkler</Link>
            <Link href="/tenants" className="text-blue-600 font-medium">Kiracılar</Link>
            <Link href="/contracts" className="text-gray-700 hover:text-blue-600">Sözleşmeler</Link>
            <Link href="/payments" className="text-gray-700 hover:text-blue-600">Ödemeler</Link>
            <Link href="/settings" className="text-gray-700 hover:text-blue-600">Ayarlar</Link>
          </div>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Kiracı Düzenle</h1>
        <EditTenantForm tenant={tenant} properties={properties || []} />
      </main>
    </div>
  )
}