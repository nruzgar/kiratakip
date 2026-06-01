'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * Sözleşme için kira dönemlerini oluşturur
 * Her ay için ayrı bir rent_periods kaydı oluşturur
 */
export async function generateRentPeriods(contractId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Oturum açmanız gerekiyor')

    // Sözleşme bilgilerini al
    const { data: contract, error: contractError } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', contractId)
        .eq('user_id', user.id)
        .single()

    if (contractError || !contract) {
        throw new Error('Sözleşme bulunamadı')
    }

    const startDate = new Date(contract.start_date)
    const endDate = new Date(contract.end_date)
    const paymentDay = 5 // payment_day properties tablosunda

    const periods: Array<{
        contract_id: string
        tenant_id: string
        property_id: string
        year: number
        month: number
        due_date: string
        expected_amount: number
        paid_amount: number
        status: string
        user_id: string
    }> = []

    let currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1)

    while (currentDate <= endDate) {
        const year = currentDate.getFullYear()
        const month = currentDate.getMonth() + 1 // 1-indexed

        // Vade tarihi: ayın payment_day'i, ama ayın son gününü geçmesin
        const lastDayOfMonth = new Date(year, month, 0).getDate()
        const dueDay = Math.min(paymentDay, lastDayOfMonth)
        const dueDate = new Date(year, month - 1, dueDay)
        const dueDateStr = dueDate.toISOString().split('T')[0]

        // Bugünden önceyse overdue, değilse pending
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const status = dueDate < today ? 'overdue' : 'pending'

        periods.push({
            contract_id: contractId,
            tenant_id: contract.tenant_id,
            property_id: contract.property_id,
            year,
            month,
            due_date: dueDateStr,
            expected_amount: contract.rent_amount,
            paid_amount: 0,
            status,
            user_id: user.id,
        })

        // Sonraki aya geç
        currentDate = new Date(year, month, 1)
    }

    // Toplu insert
    if (periods.length > 0) {
        const { error: insertError } = await supabase
            .from('rent_periods')
            .insert(periods as any)

        if (insertError) {
            throw new Error(`Kira dönemleri oluşturulamadı: ${insertError.message}`)
        }
    }

    return { count: periods.length }
}

/**
 * Sözleşme silindiğinde ilgili kira dönemlerini temizler
 */
export async function deleteRentPeriods(contractId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Oturum açmanız gerekiyor')

    const { error } = await supabase
        .from('rent_periods')
        .delete()
        .eq('contract_id' as any, contractId)
        .eq('user_id', user.id)

    if (error) {
        throw new Error(`Kira dönemleri silinemedi: ${error.message}`)
    }
}

/**
 * Sözleşme güncellendiğinde kira dönemlerini yeniden oluşturur
 * (Eski dönemleri sil, yeni dönemleri ekle - sadece ödeme yapılmamış olanları)
 */
export async function regenerateRentPeriods(contractId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Oturum açmanız gerekiyor')

    // Ödeme yapılmış dönemleri kontrol et
    const { data: paidPeriods } = await supabase
        .from('rent_periods')
        .select('id')
        .eq('contract_id' as any, contractId)
        .gt('paid_amount', 0)

    if (paidPeriods && paidPeriods.length > 0) {
        throw new Error('Bu sözleşmeye ait ödeme yapılmış dönemler var. Önce ödemeleri silin.')
    }

    // Eski dönemleri sil
    await deleteRentPeriods(contractId)

    // Yeni dönemleri oluştur
    await generateRentPeriods(contractId)

    revalidatePath('/contracts')
    revalidatePath('/tenants')
    revalidatePath('/dashboard')

    return { success: true }
}