import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
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
    <div className="page-container max-w-2xl">
      <div className="mb-8 animate-fade-in-up">
        <h1 className="text-2xl font-bold text-white">⚙️ Bildirim Ayarları</h1>
        <p className="text-slate-400 text-sm mt-1">Telegram bildirimlerinizi yapılandırın</p>
      </div>
      <SettingsForm settings={settings} />
    </div>
  )
}