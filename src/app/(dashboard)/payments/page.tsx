import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function PaymentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: payments } = await supabase
    .from('payments')
    .select('*, tenants(id, full_name), properties(id, name), rent_periods(id, year, month)')
    .eq('user_id', user.id)
    .order('payment_date', { ascending: false })

  const paymentsAny = (payments ?? []) as any[]

  return (
    <div className="page-container">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8 animate-fade-in-up">
        <div>
          <h1 className="text-3xl font-bold text-white">Ödemeler</h1>
          <p className="text-slate-400 text-sm mt-1">{paymentsAny.length} ödeme kaydı</p>
        </div>
        <Link href="/payments/new" className="btn-success inline-flex items-center gap-2 text-center justify-center">
          <span>+</span> Yeni Ödeme Ekle
        </Link>
      </div>

      {paymentsAny.length > 0 ? (
        <>
          {/* Desktop Table */}
          <div className="glass-card-static overflow-hidden hidden md:block animate-fade-in-up stagger-1">
            <table className="premium-table">
              <thead>
                <tr>
                  <th>Tarih</th><th>Kiracı</th><th>Mülk</th><th>Dönem</th><th>Tutar</th><th>Yöntem</th>
                </tr>
              </thead>
              <tbody>
                {paymentsAny.map((payment) => (
                  <tr key={payment.id}>
                    <td>{new Date(payment.payment_date).toLocaleDateString('tr-TR')}</td>
                    <td className="font-medium">{payment.tenants?.full_name}</td>
                    <td className="text-slate-400">{payment.properties?.name}</td>
                    <td className="text-slate-400">{payment.rent_periods?.month}/{payment.rent_periods?.year}</td>
                    <td className="font-medium text-green-400">{payment.amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</td>
                    <td>
                      <span className="badge badge-info">
                        {payment.method === 'bank' ? 'Banka' : payment.method === 'cash' ? 'Nakit' : payment.method === 'credit_card' ? 'K.Kartı' : 'Diğer'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3 animate-fade-in-up stagger-1">
            {paymentsAny.map((payment) => (
              <div key={payment.id} className="glass-card p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium text-white">{payment.tenants?.full_name}</p>
                    <p className="text-sm text-slate-400">{payment.properties?.name}</p>
                  </div>
                  <span className="font-semibold text-green-400">{payment.amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-500">
                  <span>{new Date(payment.payment_date).toLocaleDateString('tr-TR')} • {payment.rent_periods?.month}/{payment.rent_periods?.year}</span>
                  <span className="badge badge-info text-xs">{payment.method === 'bank' ? 'Banka' : payment.method === 'cash' ? 'Nakit' : 'K.Kartı'}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="glass-card-static empty-state animate-fade-in-up">
          <div className="empty-state-icon">💰</div>
          <p className="text-slate-400 mb-4">Henüz ödeme kaydı yok.</p>
          <Link href="/payments/new" className="btn-success inline-block">İlk Ödemeyi Ekle</Link>
        </div>
      )}
    </div>
  )
}