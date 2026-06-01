'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createPayment(formData: {
    rent_period_id: string
    tenant_id: string
    property_id: string
    payment_date: string
    amount: number
    method: string
    description: string | null
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Oturum açmanız gerekiyor')

    // Ödemeyi kaydet
    const { error: paymentError } = await supabase
        .from('payments')
        .insert({
            rent_period_id: formData.rent_period_id,
            tenant_id: formData.tenant_id,
            property_id: formData.property_id,
            payment_date: formData.payment_date,
            amount: formData.amount,
            method: formData.method,
            description: formData.description,
            user_id: user.id,
        })

    if (paymentError) throw new Error(paymentError.message)

    // Kira döneminin güncel ödenen tutarını ve durumunu hesapla
    const { data: periodPayments } = await supabase
        .from('payments')
        .select('amount')
        .eq('rent_period_id', formData.rent_period_id)
        .eq('user_id', user.id)

    const totalPaid = (periodPayments || []).reduce((sum, p) => sum + (p.amount || 0), 0)

    // Kira dönemi bilgisini al
    const { data: period } = await supabase
        .from('rent_periods')
        .select('expected_amount')
        .eq('id', formData.rent_period_id)
        .single()

    if (period) {
        let newStatus: string
        if (totalPaid >= period.expected_amount) {
            newStatus = 'paid'
        } else if (totalPaid > 0) {
            newStatus = 'partial'
        } else {
            newStatus = 'pending'
        }

        const { error: updateError } = await supabase
            .from('rent_periods')
            .update({
                paid_amount: totalPaid,
                status: newStatus,
            } as any)
            .eq('id', formData.rent_period_id)
            .eq('user_id', user.id)

        if (updateError) {
            console.error('Kira dönemi güncellenemedi:', updateError.message)
        }
    }

    revalidatePath('/dashboard')
    revalidatePath('/payments')
    revalidatePath(`/tenants/${formData.tenant_id}`)
    revalidatePath(`/contracts`)

    return { success: true }
}