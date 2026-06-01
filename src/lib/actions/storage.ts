'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

export type UploadResult = {
    success: boolean
    url?: string
    fileType?: string
    originalName?: string
    error?: string
}

/**
 * Sözleşme dosyası yükler
 */
export async function uploadContractFile(
    contractId: string,
    formData: FormData
): Promise<UploadResult> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Oturum açmanız gerekiyor' }

    const file = formData.get('file') as File | null
    if (!file || file.size === 0) {
        return { success: false, error: 'Dosya seçilmedi' }
    }

    const extension = file.name.split('.').pop()?.toLowerCase() || ''
    const allowedExtensions = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png']
    if (!allowedExtensions.includes(extension)) {
        return { success: false, error: 'Desteklenmeyen dosya türü. PDF, DOC, DOCX, JPG, PNG kabul edilir.' }
    }

    if (file.size > MAX_FILE_SIZE) {
        return { success: false, error: 'Dosya boyutu 10 MB\'dan büyük olamaz.' }
    }

    const fileId = crypto.randomUUID()
    const storagePath = `${user.id}/contracts/${contractId}/${fileId}.${extension}`

    const { error: uploadError } = await supabase.storage
        .from('tenant-files')
        .upload(storagePath, file, {
            contentType: file.type,
            upsert: false,
        })

    if (uploadError) {
        return { success: false, error: `Dosya yüklenemedi: ${uploadError.message}` }
    }

    const { error: updateError } = await supabase
        .from('contracts')
        .update({ file_url: storagePath } as any)
        .eq('id', contractId)
        .eq('user_id', user.id)

    if (updateError) {
        await supabase.storage.from('tenant-files').remove([storagePath])
        return { success: false, error: `Sözleşme güncellenemedi: ${updateError.message}` }
    }

    revalidatePath(`/contracts/${contractId}`)
    revalidatePath('/contracts')

    return { success: true, url: storagePath, fileType: extension, originalName: file.name }
}

/**
 * Ödeme dekontu yükler
 */
export async function uploadPaymentReceipt(
    paymentId: string,
    tenantId: string,
    propertyId: string,
    formData: FormData
): Promise<UploadResult> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Oturum açmanız gerekiyor' }

    const file = formData.get('receipt') as File | null
    if (!file || file.size === 0) {
        return { success: false, error: 'Dosya seçilmedi' }
    }

    const extension = file.name.split('.').pop()?.toLowerCase() || ''
    const allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png']
    if (!allowedExtensions.includes(extension)) {
        return { success: false, error: 'Desteklenmeyen dosya türü. PDF, JPG, PNG kabul edilir.' }
    }

    if (file.size > MAX_FILE_SIZE) {
        return { success: false, error: 'Dosya boyutu 10 MB\'dan büyük olamaz.' }
    }

    const fileId = crypto.randomUUID()
    const storagePath = `${user.id}/receipts/${paymentId}/${fileId}.${extension}`

    const { error: uploadError } = await supabase.storage
        .from('tenant-files')
        .upload(storagePath, file, { contentType: file.type, upsert: false })

    if (uploadError) {
        return { success: false, error: `Dosya yüklenemedi: ${uploadError.message}` }
    }

    const { error: updateError } = await supabase
        .from('payments')
        .update({ receipt_file_url: storagePath, receipt_file_type: extension, receipt_original_name: file.name } as any)
        .eq('id', paymentId)
        .eq('user_id', user.id)

    if (updateError) {
        await supabase.storage.from('tenant-files').remove([storagePath])
        return { success: false, error: `Ödeme güncellenemedi: ${updateError.message}` }
    }

    revalidatePath(`/tenants/${tenantId}`)
    revalidatePath('/payments')

    return { success: true, url: storagePath, fileType: extension, originalName: file.name }
}

export async function getSignedFileUrl(storagePath: string): Promise<string | null> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data } = await supabase.storage.from('tenant-files').createSignedUrl(storagePath, 3600)
    return data?.signedUrl || null
}

export async function deleteFile(storagePath: string): Promise<boolean> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    if (!storagePath.startsWith(user.id)) return false
    const { error } = await supabase.storage.from('tenant-files').remove([storagePath])
    return !error
}

export async function removePaymentReceipt(paymentId: string): Promise<boolean> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    const { data: payment } = await supabase
        .from('payments')
        .select('receipt_file_url' as any)
        .eq('id', paymentId)
        .eq('user_id', user.id)
        .single() as any
    if (!payment?.receipt_file_url) return true
    await deleteFile(payment.receipt_file_url)
    const { error } = await supabase
        .from('payments')
        .update({ receipt_file_url: null, receipt_file_type: null, receipt_original_name: null } as any)
        .eq('id', paymentId)
        .eq('user_id', user.id)
    return !error
}