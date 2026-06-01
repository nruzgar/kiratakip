'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function cancelContract(contractId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Oturum açmanız gerekiyor')

    // Mevcut sözleşme bilgilerini al
    const { data: contract } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', contractId)
        .eq('user_id', user.id)
        .single()

    if (!contract) throw new Error('Sözleşme bulunamadı')

    // Bitiş tarihini bugüne çek ve notes'a iptal bilgisi ekle
    const today = new Date().toISOString().split('T')[0]
    const cancelNote = `[İPTAL EDİLDİ: ${new Date().toLocaleDateString('tr-TR')}] ${contract.notes || ''}`.trim()

    const { error } = await supabase
        .from('contracts')
        .update({ end_date: today, notes: cancelNote } as any)
        .eq('id', contractId)
        .eq('user_id', user.id)

    if (error) throw new Error(error.message)

    revalidatePath(`/contracts/${contractId}`)
    revalidatePath('/contracts')
    revalidatePath('/dashboard')

    return { success: true }
}
