'use client'

import { useState } from 'react'

interface Props {
    tenantId: string
    tenantName: string
}

export default function DebtStatementButton({ tenantId, tenantName }: Props) {
    const [loading, setLoading] = useState(false)

    const handleGenerateDebtStatement = async () => {
        setLoading(true)
        try {
            const response = await fetch(`/api/pdf/debt-statement?tenantId=${tenantId}`)
            if (!response.ok) {
                const err = await response.json()
                alert('Hata: ' + (err.error || 'PDF oluşturulamadı'))
                setLoading(false)
                return
            }

            // PDF blob'u al
            const blob = await response.blob()
            const url = URL.createObjectURL(blob)
            const fileName = `${tenantName.replace(/\s+/g, '_')}_borc_dokumu.pdf`

            // Web Share API ile paylaş (mobil)
            if (navigator.share && navigator.canShare) {
                const file = new File([blob], fileName, { type: 'application/pdf' })
                if (navigator.canShare({ files: [file] })) {
                    try {
                        await navigator.share({
                            title: `${tenantName} - Borç Dökümü`,
                            text: `${tenantName} kiracısının borç döküm raporu`,
                            files: [file],
                        })
                        setLoading(false)
                        return
                    } catch (e) {
                        // Paylaşım iptal veya hata → fallback download
                    }
                }
            }

            // Fallback: PDF'i indir
            const a = document.createElement('a')
            a.href = url
            a.download = fileName
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
        } catch (e: any) {
            alert('PDF oluşturulurken hata: ' + e.message)
        }
        setLoading(false)
    }

    return (
        <button
            onClick={handleGenerateDebtStatement}
            disabled={loading}
            className="btn-purple text-sm py-2 px-4"
        >
            {loading ? '⏳ Oluşturuluyor...' : '📄 Borç Döküm Raporu'}
        </button>
    )
}