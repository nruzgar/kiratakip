import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import EditTenantForm from './EditTenantForm'

export default async function EditTenantPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { id } = await params
  const { data: tenant } = await supabase.from('tenants').select('*').eq('id', id).eq('user_id', user.id).single()
  if (!tenant) redirect('/tenants')
  const { data: properties } = await supabase.from('properties').select('id, name, status').eq('user_id', user.id).order('name')

  return (
    <div className="page-container max-w-2xl">
      <div className="mb-8 animate-fade-in-up">
        <h1 className="text-2xl font-bold text-white">Kiracı Düzenle</h1>
      </div>
      <EditTenantForm tenant={tenant} properties={properties || []} />
    </div>
  )
}