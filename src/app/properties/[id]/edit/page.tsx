import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import EditPropertyForm from './EditPropertyForm'

export default async function EditPropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { id } = await params

  const { data: property } = await supabase
    .from('properties')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!property) redirect('/properties')

  const propertyAny = property as any

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 space-x-8">
            <Link href="/dashboard" className="text-xl font-bold text-blue-600">KiraTakip</Link>
            <Link href="/dashboard" className="text-gray-700 hover:text-blue-600">Dashboard</Link>
            <Link href="/properties" className="text-blue-600 font-medium">Mülkler</Link>
            <Link href="/tenants" className="text-gray-700 hover:text-blue-600">Kiracılar</Link>
            <Link href="/contracts" className="text-gray-700 hover:text-blue-600">Sözleşmeler</Link>
            <Link href="/payments" className="text-gray-700 hover:text-blue-600">Ödemeler</Link>
            <Link href="/settings" className="text-gray-700 hover:text-blue-600">Ayarlar</Link>
          </div>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Mülk Düzenle: {propertyAny.name}</h1>
        <EditPropertyForm property={propertyAny} />
      </main>
    </div>
  )
}