import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import EditPropertyForm from './EditPropertyForm'

export default async function EditPropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { id } = await params
  const { data: property } = await supabase.from('properties').select('*').eq('id', id).eq('user_id', user.id).single()
  if (!property) redirect('/properties')
  const propertyAny = property as any

  return (
    <div className="page-container max-w-2xl">
      <div className="mb-8 animate-fade-in-up">
        <h1 className="text-2xl font-bold text-white">Mülk Düzenle: {propertyAny.name}</h1>
      </div>
      <EditPropertyForm property={propertyAny} />
    </div>
  )
}