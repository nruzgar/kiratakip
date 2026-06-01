'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { cancelContract } from '@/lib/actions/contracts'

interface Props {
    contractId: string
    isActive: boolean
}

export default function ContractActions({ contractId, isActive }: Props) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [showCancelConfirm, setShowCancelConfirm] = useState(false)

    const handleCancelContract = async () => {
        setLoading(true)
        try {
            await cancelContract(contractId)
            router.refresh()
        } catch (e: any) {
            alert('Hata: ' + e.message)
        }
        setLoading(false)
        setShowCancelConfirm(false)
    }

    const handleRenewContract = async () => {
        router.push(`/contracts/new?renew=${contractId}`)
    }

    return (
        <div className="flex gap-2">
            {isActive && (
                <>
                    <button
                        onClick={() => setShowCancelConfirm(true)}
                        className="btn-primary text-sm py-2 px-4"
                        style={{ background: 'linear-gradient(135deg, #dc2626, #ef4444)' }}
                    >
                        🚫 İptal Et
                    </button>
                    <button
                        onClick={handleRenewContract}
                        className="btn-primary text-sm py-2 px-4"
                    >
                        🔄 Yenile
                    </button>
                </>
            )}

            {/* İptal Onay Modal */}
            {showCancelConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
                    onClick={() => setShowCancelConfirm(false)}>
                    <div className="glass-card-static p-6 max-w-sm mx-4" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold text-white mb-2">Sözleşme İptal Edilsin mi?</h3>
                        <p className="text-slate-400 text-sm mb-4">
                            Bu işlem geri alınamaz. Sözleşme iptal edildiğinde, mevcut ödeme kayıtları korunur ancak yeni kira dönemi oluşturulmaz.
                        </p>
                        <div className="flex gap-2 justify-end">
                            <button
                                onClick={() => setShowCancelConfirm(false)}
                                className="px-4 py-2 rounded-xl bg-white/[0.06] text-slate-300 hover:bg-white/[0.1] transition-colors"
                            >
                                Vazgeç
                            </button>
                            <button
                                onClick={handleCancelContract}
                                disabled={loading}
                                className="btn-primary text-sm py-2 px-4"
                                style={{ background: 'linear-gradient(135deg, #dc2626, #ef4444)' }}
                            >
                                {loading ? 'İptal Ediliyor...' : 'Evet, İptal Et'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}