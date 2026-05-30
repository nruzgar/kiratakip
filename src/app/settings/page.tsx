import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import SettingsForm from './SettingsForm'

export default async function SettingsPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: settings } = await supabase
    .from('notification_settings')
    .select('*')
    .eq('user_id', user.id)
    .single()

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
              <Link href="/payments" className="text-gray-700 hover:text-blue-600">Ödemeler</Link>
              <Link href="/settings" className="text-blue-600 font-medium">Ayarlar</Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Bildirim Ayarları</h1>
        <SettingsForm settings={settings} />
      </main>
    </div>
  )
}