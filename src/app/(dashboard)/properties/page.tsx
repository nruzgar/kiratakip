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
    <div className="page-container">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8 animate-fade-in-up">
        <div>
          <h1 className="text-3xl font-bold text-white">Mülklerim</h1>
          <p className="text-slate-400 text-sm mt-1">{properties?.length || 0} mülk kayıtlı</p>
        </div>
        <Link href="/properties/new" className="btn-primary inline-flex items-center gap-2 text-center justify-center">
          <span>+</span> Yeni Mülk Ekle
        </Link>
      </div>

      {properties && properties.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {properties.map((property, i) => (
            <div key={property.id} className={`glass-card p-6 animate-fade-in-up stagger-${Math.min(i + 1, 5)}`}>
              <div className="flex justify-between items-start mb-4">
                <Link href={`/properties/${property.id}`}>
                  <h3 className="text-lg font-semibold text-white hover:text-indigo-400 transition-colors">{property.name}</h3>
                </Link>
                <div className="flex items-center gap-2">
                  <Link href={`/properties/${property.id}/edit`} className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
                    Düzenle
                  </Link>
                  <span className={`badge ${
                    property.status === 'active' ? 'badge-success' :
                    property.status === 'vacant' ? 'badge-neutral' : 'badge-warning'
                  }`}>
                    {property.status === 'active' ? 'Dolu' :
                     property.status === 'vacant' ? 'Boş' : 'Bakımda'}
                  </span>
                </div>
              </div>
              <p className="text-slate-400 text-sm mb-1">{property.type}</p>
              <p className="text-slate-500 text-sm mb-4">{property.address}</p>
              <div className="border-t border-white/[0.08] pt-4 space-y-1">
                <p className="text-sm text-slate-400">
                  Aylık Kira: <span className="font-semibold text-indigo-400">
                    {property.monthly_rent.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                  </span>
                </p>
                <p className="text-sm text-slate-400">
                  Ödeme Günü: Her ayın <span className="font-semibold text-white">{property.payment_day}</span>. günü
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card-static empty-state">
          <div className="empty-state-icon">🏠</div>
          <p className="text-slate-400 mb-4">Henüz mülk eklenmemiş.</p>
          <Link href="/properties/new" className="btn-primary inline-block">İlk Mülkünü Ekle</Link>
        </div>
      )}
    </div>
  )
}