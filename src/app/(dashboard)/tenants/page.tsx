import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function TenantsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: tenants } = await supabase
    .from('tenants')
    .select('*, properties(id, name)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="page-container">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8 animate-fade-in-up">
        <div>
          <h1 className="text-3xl font-bold text-white">Kiracılarım</h1>
          <p className="text-slate-400 text-sm mt-1">{tenants?.length || 0} kiracı kayıtlı</p>
        </div>
        <Link href="/tenants/new" className="btn-primary inline-flex items-center gap-2 text-center justify-center">
          <span>+</span> Yeni Kiracı Ekle
        </Link>
      </div>

      {tenants && tenants.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {tenants.map((tenant, i) => (
            <div key={tenant.id} className={`glass-card p-6 animate-fade-in-up stagger-${Math.min(i + 1, 5)}`}>
              <div className="flex justify-between items-start mb-4">
                <Link href={`/tenants/${tenant.id}`} className="flex-1">
                  <h3 className="text-lg font-semibold text-white hover:text-indigo-400 transition-colors">{tenant.full_name}</h3>
                </Link>
                <div className="flex items-center gap-2">
                  <Link href={`/tenants/${tenant.id}/edit`} className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">Düzenle</Link>
                  <span className={`badge ${tenant.is_active ? 'badge-success' : 'badge-neutral'}`}>
                    {tenant.is_active ? 'Aktif' : 'Pasif'}
                  </span>
                </div>
              </div>
              <p className="text-slate-400 text-sm mb-1">📞 {tenant.phone || 'Telefon yok'}</p>
              <p className="text-slate-400 text-sm mb-1">📧 {tenant.email || 'Email yok'}</p>
              <p className="text-slate-500 text-sm">🏠 {tenant.properties?.name || 'Mülk atanmamış'}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card-static empty-state">
          <div className="empty-state-icon">👥</div>
          <p className="text-slate-400 mb-4">Henüz kiracı eklenmemiş.</p>
          <Link href="/tenants/new" className="btn-primary inline-block">İlk Kiracını Ekle</Link>
        </div>
      )}
    </div>
  )
}