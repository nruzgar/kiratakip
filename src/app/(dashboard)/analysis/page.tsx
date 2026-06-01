import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function AnalysisPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const today = new Date()
    const currentYear = today.getFullYear()
    const currentMonth = today.getMonth() + 1

    // Tüm kira dönemleri
    const { data: allPeriods } = await supabase
        .from('rent_periods')
        .select('*, tenants(full_name, id, is_active), properties(name, id)')
        .eq('user_id', user.id)
        .order('year', { ascending: false })
        .order('month', { ascending: false })
    const allPeriodsAny = (allPeriods ?? []) as any[]

    // Kiracı bazlı analiz
    const tenantMap = new Map<string, {
        id: string
        name: string
        isActive: boolean
        totalExpected: number
        totalPaid: number
        totalDebt: number
        overdueCount: number
        periodCount: number
        lastPaymentDate: string | null
    }>()

    allPeriodsAny.forEach((p: any) => {
        const tid = p.tenant_id
        if (!tid || !p.tenants) return
        const current = tenantMap.get(tid) || {
            id: tid,
            name: p.tenants.full_name,
            isActive: p.tenants.is_active,
            totalExpected: 0,
            totalPaid: 0,
            totalDebt: 0,
            overdueCount: 0,
            periodCount: 0,
            lastPaymentDate: null,
        }
        current.totalExpected += p.expected_amount
        current.totalPaid += p.paid_amount
        current.totalDebt += (p.expected_amount - p.paid_amount)
        current.periodCount++
        if (p.status === 'overdue') current.overdueCount++
        if (p.payments && p.payments.length > 0) {
            const lastPay = p.payments.sort((a: any, b: any) => b.payment_date.localeCompare(a.payment_date))[0]
            if (lastPay && (!current.lastPaymentDate || lastPay.payment_date > current.lastPaymentDate)) {
                current.lastPaymentDate = lastPay.payment_date
            }
        }
        tenantMap.set(tid, current)
    })

    const tenantAnalysis = Array.from(tenantMap.values())
        .sort((a, b) => b.totalDebt - a.totalDebt)

    // Mülk bazlı analiz
    const propertyMap = new Map<string, {
        id: string
        name: string
        totalExpected: number
        totalPaid: number
        totalDebt: number
        periodCount: number
    }>()

    allPeriodsAny.forEach((p: any) => {
        const pid = p.property_id
        if (!pid || !p.properties) return
        const current = propertyMap.get(pid) || {
            id: pid,
            name: p.properties.name,
            totalExpected: 0,
            totalPaid: 0,
            totalDebt: 0,
            periodCount: 0,
        }
        current.totalExpected += p.expected_amount
        current.totalPaid += p.paid_amount
        current.totalDebt += (p.expected_amount - p.paid_amount)
        current.periodCount++
        propertyMap.set(pid, current)
    })

    const propertyAnalysis = Array.from(propertyMap.values())
        .sort((a, b) => b.totalDebt - a.totalDebt)

    // Aylık analiz (son 12 ay)
    const monthlyMap = new Map<string, { expected: number; paid: number; count: number }>()
    const months: string[] = []
    for (let i = 0; i < 12; i++) {
        const d = new Date(currentYear, currentMonth - 1 - i, 1)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        months.push(key)
        if (!monthlyMap.has(key)) monthlyMap.set(key, { expected: 0, paid: 0, count: 0 })
    }
    allPeriodsAny.forEach((p: any) => {
        const key = `${p.year}-${String(p.month).padStart(2, '0')}`
        if (monthlyMap.has(key)) {
            const m = monthlyMap.get(key)!
            m.expected += p.expected_amount
            m.paid += p.paid_amount
            m.count++
        }
    })

    // Düzenli ödeyenler (gecikme oranı düşük)
    const regularPayers = tenantAnalysis.filter(t => t.periodCount >= 3 && t.overdueCount === 0 && t.totalDebt === 0)
    // Sürekli gecikenler
    const chronicLatePayers = tenantAnalysis.filter(t => t.overdueCount >= 2)

    const hasData = allPeriodsAny.length > 0

    return (
        <div className="page-container">
            <div className="mb-8 animate-fade-in-up">
                <h1 className="text-3xl font-bold text-white mb-1">📊 Analiz</h1>
                <p className="text-slate-400">Detaylı kira analizleri ve istatistikler</p>
            </div>

            {!hasData ? (
                <div className="glass-card-static empty-state animate-fade-in-up">
                    <div className="empty-state-icon">📊</div>
                    <p className="text-slate-400 mb-4">Analiz göstermek için yeterli veri bulunmuyor. Önce mülk, kiracı ve sözleşme ekleyin.</p>
                    <Link href="/dashboard" className="btn-primary inline-block">Dashboard'a Dön</Link>
                </div>
            ) : (
                <>
                    {/* Aylık Beklenen/Tahsil Edilen Tablosu */}
                    <div className="glass-card-static mb-6 animate-fade-in-up stagger-1">
                        <div className="px-6 py-4 border-b border-white/[0.08]">
                            <h2 className="text-lg font-semibold text-white">📅 Aylık Beklenen / Tahsil Edilen (Son 12 Ay)</h2>
                        </div>
                        <div className="p-6">
                            <div className="overflow-x-auto">
                                <table className="premium-table">
                                    <thead>
                                        <tr>
                                            <th>Dönem</th>
                                            <th>Dönem Sayısı</th>
                                            <th>Beklenen</th>
                                            <th>Tahsil Edilen</th>
                                            <th>Kalan</th>
                                            <th>Tahsilat Oranı</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {months.map(key => {
                                            const m = monthlyMap.get(key)!
                                            const remaining = m.expected - m.paid
                                            const ratio = m.expected > 0 ? ((m.paid / m.expected) * 100).toFixed(1) : '—'
                                            const [y, mo] = key.split('-')
                                            const date = new Date(parseInt(y), parseInt(mo) - 1)
                                            return (
                                                <tr key={key}>
                                                    <td className="font-medium">{date.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}</td>
                                                    <td className="text-slate-400">{m.count}</td>
                                                    <td>{m.expected.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</td>
                                                    <td className="text-green-400">{m.paid.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</td>
                                                    <td className={remaining > 0 ? 'text-red-400' : 'text-green-400'}>
                                                        {remaining.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                                    </td>
                                                    <td>
                                                        <span className={`badge ${parseFloat(ratio as string) >= 90 ? 'badge-success' : parseFloat(ratio as string) >= 50 ? 'badge-warning' : 'badge-danger'}`}>
                                                            {ratio}%
                                                        </span>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Kiracı Bazlı Analiz */}
                    <div className="glass-card-static mb-6 animate-fade-in-up stagger-2">
                        <div className="px-6 py-4 border-b border-white/[0.08]">
                            <h2 className="text-lg font-semibold text-white">👥 Kiracı Bazlı Borç / Tahsilat Özeti</h2>
                        </div>
                        <div className="p-6">
                            <div className="overflow-x-auto">
                                <table className="premium-table">
                                    <thead>
                                        <tr>
                                            <th>Kiracı</th>
                                            <th>Durum</th>
                                            <th>Dönem</th>
                                            <th>Toplam Kira</th>
                                            <th>Ödenen</th>
                                            <th>Borç</th>
                                            <th>Geciken</th>
                                            <th>Son Ödeme</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {tenantAnalysis.map(t => (
                                            <tr key={t.id}>
                                                <td>
                                                    <Link href={`/tenants/${t.id}`} className="font-medium text-white hover:text-indigo-400 transition-colors">
                                                        {t.name}
                                                    </Link>
                                                </td>
                                                <td>
                                                    <span className={`badge ${t.isActive ? 'badge-success' : 'badge-neutral'}`}>
                                                        {t.isActive ? 'Aktif' : 'Pasif'}
                                                    </span>
                                                </td>
                                                <td className="text-slate-400">{t.periodCount}</td>
                                                <td>{t.totalExpected.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</td>
                                                <td className="text-green-400">{t.totalPaid.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</td>
                                                <td className={t.totalDebt > 0 ? 'text-red-400 font-bold' : 'text-green-400'}>
                                                    {t.totalDebt.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                                </td>
                                                <td>
                                                    <span className={`badge ${t.overdueCount > 0 ? 'badge-danger' : 'badge-success'}`}>
                                                        {t.overdueCount}
                                                    </span>
                                                </td>
                                                <td className="text-slate-400 text-sm">
                                                    {t.lastPaymentDate ? new Date(t.lastPaymentDate).toLocaleDateString('tr-TR') : '—'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Mülk Bazlı Analiz */}
                    <div className="glass-card-static mb-6 animate-fade-in-up stagger-3">
                        <div className="px-6 py-4 border-b border-white/[0.08]">
                            <h2 className="text-lg font-semibold text-white">🏠 Mülk Bazlı Gelir Durumu</h2>
                        </div>
                        <div className="p-6">
                            <div className="overflow-x-auto">
                                <table className="premium-table">
                                    <thead>
                                        <tr>
                                            <th>Mülk</th>
                                            <th>Dönem</th>
                                            <th>Toplam Beklenen</th>
                                            <th>Tahsil Edilen</th>
                                            <th>Kalan</th>
                                            <th>Tahsilat</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {propertyAnalysis.map(p => {
                                            const remaining = p.totalExpected - p.totalPaid
                                            const ratio = p.totalExpected > 0 ? ((p.totalPaid / p.totalExpected) * 100).toFixed(1) + '%' : '—'
                                            return (
                                                <tr key={p.id}>
                                                    <td className="font-medium">{p.name}</td>
                                                    <td className="text-slate-400">{p.periodCount}</td>
                                                    <td>{p.totalExpected.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</td>
                                                    <td className="text-green-400">{p.totalPaid.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</td>
                                                    <td className={remaining > 0 ? 'text-red-400' : 'text-green-400'}>
                                                        {remaining.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                                    </td>
                                                    <td>{ratio}</td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Özel Listeler */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        {/* Düzenli Ödeyen Kiracılar */}
                        <div className="glass-card-static animate-fade-in-up stagger-4">
                            <div className="px-6 py-4 border-b border-white/[0.08]">
                                <h2 className="text-lg font-semibold text-white">🌟 Düzenli Ödeyen Kiracılar</h2>
                            </div>
                            <div className="p-6">
                                {regularPayers.length > 0 ? (
                                    <div className="space-y-3">
                                        {regularPayers.slice(0, 10).map(t => (
                                            <Link key={t.id} href={`/tenants/${t.id}`}
                                                className="flex items-center justify-between p-3 rounded-xl bg-green-500/5 border border-green-500/10 hover:bg-green-500/10 transition-colors">
                                                <div>
                                                    <p className="font-medium text-white text-sm">{t.name}</p>
                                                    <p className="text-xs text-slate-500">{t.periodCount} dönem, hiç gecikme yok</p>
                                                </div>
                                                <span className="text-green-400 text-sm font-medium">
                                                    {t.totalPaid.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })} ödendi
                                                </span>
                                            </Link>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-slate-500 text-center py-4 text-sm">Henüz veri bulunmuyor. En az 3 dönem tamamlanmış kiracılar listelenecek.</p>
                                )}
                            </div>
                        </div>

                        {/* Sürekli Geciken Kiracılar */}
                        <div className="glass-card-static animate-fade-in-up stagger-5">
                            <div className="px-6 py-4 border-b border-white/[0.08]">
                                <h2 className="text-lg font-semibold text-white">⚠️ Sürekli Geciken Kiracılar</h2>
                            </div>
                            <div className="p-6">
                                {chronicLatePayers.length > 0 ? (
                                    <div className="space-y-3">
                                        {chronicLatePayers.slice(0, 10).map(t => (
                                            <Link key={t.id} href={`/tenants/${t.id}`}
                                                className="flex items-center justify-between p-3 rounded-xl bg-red-500/5 border border-red-500/10 hover:bg-red-500/10 transition-colors">
                                                <div>
                                                    <p className="font-medium text-white text-sm">{t.name}</p>
                                                    <p className="text-xs text-slate-500">{t.overdueCount} kez gecikti</p>
                                                </div>
                                                <span className="text-red-400 text-sm font-medium">
                                                    {t.totalDebt.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })} borç
                                                </span>
                                            </Link>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-slate-500 text-center py-4 text-sm">Sürekli geciken kiracı bulunmuyor. ✅</p>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}