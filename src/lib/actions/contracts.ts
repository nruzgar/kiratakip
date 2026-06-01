'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function cancelContract(contractId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Oturum açmanız gerekiyor')

    const { error } = await supabase
        .from('contracts')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', contractId)
        .eq('user_id', user.id)

    if (error) throw new Error(error.message)

    revalidatePath(`/contracts/${contractId}`)
    revalidatePath('/contracts')
    revalidatePath('/dashboard')

    return { success: true }
}