'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const ALLOWED_FILE_TYPES = {
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'image/jpeg': 'jpg',
    'image/png': 'png',
} as const

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

    // Dosya türü kontrolü
    const extension = ALLOWED_FILE_TYPES[file.type as keyof typeof ALLOWED_FILE_TYPES]
    if (!extension) {
        return { success: false, error: 'Desteklenmeyen dosya türü. PDF, DOC, DOCX, JPG, PNG kabul edilir.' }
    }

    // Dosya boyutu kontrolü
    if (file.size > MAX_FILE_SIZE) {
        return { success: false, error: 'Dosya boyutu 10 MB\'dan büyük olamaz.' }
    }

    // UUID ile dosya adı oluştur
    const fileId = crypto.randomUUID()
    const storagePath = `${user.id}/contracts/${contractId}/${fileId}.${extension}`

    // Dosyayı yükle
    const { error: uploadError } = await supabase.storage
        .from('tenant-files')
        .upload(storagePath, file, {
            contentType: file.type,
            upsert: false,
        })

    if (uploadError) {
        return { success: false, error: `Dosya yüklenemedi: ${uploadError.message}` }
    }

    // Sözleşme kaydını güncelle
    const { error: updateError } = await supabase
        .from('contracts')
        .update({
            file_url: storagePath,
            updated_at: new Date().toISOString(),
        })
        .eq('id', contractId)
        .eq('user_id', user.id)

    if (updateError) {
        // Yüklenen dosyayı temizle
        await supabase.storage.from('tenant-files').remove([storagePath])
        return { success: false, error: `Sözleşme güncellenemedi: ${updateError.message}` }
    }

    revalidatePath(`/contracts/${contractId}`)
    revalidatePath('/contracts')

    return {
        success: true,
        url: storagePath,
        fileType: extension,
        originalName: file.name,
    }
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

    // Dosya türü kontrolü - dekont için sadece PDF, JPG, PNG
    const allowedReceiptTypes = {
        'application/pdf': 'pdf',
        'image/jpeg': 'jpg',
        'image/png': 'png',
    } as const

    const extension = allowedReceiptTypes[file.type as keyof typeof allowedReceiptTypes]
    if (!extension) {
        return { success: false, error: 'Desteklenmeyen dosya türü. PDF, JPG, PNG kabul edilir.' }
    }

    if (file.size > MAX_FILE_SIZE) {
        return { success: false, error: 'Dosya boyutu 10 MB\'dan büyük olamaz.' }
    }

    // UUID ile dosya adı oluştur
    const fileId = crypto.randomUUID()
    const storagePath = `${user.id}/receipts/${paymentId}/${fileId}.${extension}`

    // Dosyayı yükle
    const { error: uploadError } = await supabase.storage
        .from('tenant-files')
        .upload(storagePath, file, {
            contentType: file.type,
            upsert: false,
        })

    if (uploadError) {
        return { success: false, error: `Dosya yüklenemedi: ${uploadError.message}` }
    }

    // Ödeme kaydını güncelle
    const { error: updateError } = await supabase
        .from('payments')
        .update({
            receipt_file_url: storagePath,
            receipt_file_type: extension,
            receipt_original_name: file.name,
        })
        .eq('id', paymentId)
        .eq('user_id', user.id)

    if (updateError) {
        await supabase.storage.from('tenant-files').remove([storagePath])
        return { success: false, error: `Ödeme güncellenemedi: ${updateError.message}` }
    }

    revalidatePath(`/tenants/${tenantId}`)
    revalidatePath('/payments')

    return {
        success: true,
        url: storagePath,
        fileType: extension,
        originalName: file.name,
    }
}

/**
 * Dosya için signed URL oluşturur (güvenli görüntüleme)
 */
export async function getSignedFileUrl(storagePath: string): Promise<string | null> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data } = await supabase.storage
        .from('tenant-files')
        .createSignedUrl(storagePath, 3600) // 1 saat geçerli

    return data?.signedUrl || null
}

/**
 * Dosyayı siler
 */
export async function deleteFile(storagePath: string): Promise<boolean> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    // Sadece kendi dosyalarını silebilir
    if (!storagePath.startsWith(user.id)) {
        return false
    }

    const { error } = await supabase.storage
        .from('tenant-files')
        .remove([storagePath])

    return !error
}

/**
 * Dekontu ödemeden kaldırır (dosyayı siler)
 */
export async function removePaymentReceipt(paymentId: string): Promise<boolean> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    // Ödeme bilgisini al
    const { data: payment } = await supabase
        .from('payments')
        .select('receipt_file_url')
        .eq('id', paymentId)
        .eq('user_id', user.id)
        .single()

    if (!payment?.receipt_file_url) return true

    // Dosyayı sil
    await deleteFile(payment.receipt_file_url)

    // Ödeme kaydını güncelle
    const { error } = await supabase
        .from('payments')
        .update({
            receipt_file_url: null,
            receipt_file_type: null,
            receipt_original_name: null,
        })
        .eq('id', paymentId)
        .eq('user_id', user.id)

    return !error
}