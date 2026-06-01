import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')

    if (!tenantId) {
        return NextResponse.json({ error: 'tenantId gerekli' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    // Kiracı bilgisi
    const { data: tenant } = await supabase
        .from('tenants')
        .select('*, properties(name, address), contracts(*), rent_periods(*, payments(*))')
        .eq('id', tenantId)
        .eq('user_id', user.id)
        .single()

    if (!tenant) {
        return NextResponse.json({ error: 'Kiracı bulunamadı' }, { status: 404 })
    }

    const periods = (tenant.rent_periods || []) as any[]
    const contracts = (tenant.contracts || []) as any[]
    const activeContract = contracts.find((c: any) => c.status === 'active') || contracts[contracts.length - 1]

    // Borç hesaplamaları
    const totalExpected = periods.reduce((sum: number, p: any) => sum + (p.expected_amount || 0), 0)
    const totalPaid = periods.reduce((sum: number, p: any) => sum + (p.paid_amount || 0), 0)
    const totalDebt = totalExpected - totalPaid
    const overduePeriods = periods.filter((p: any) => p.status === 'overdue')
    const overdueCount = overduePeriods.length

    // PDF oluştur
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 20
    const contentWidth = pageWidth - 2 * margin

    // Başlık
    doc.setFontSize(20)
    doc.setTextColor(99, 102, 241)
    doc.text('KiraTakip', margin, 25)

    doc.setFontSize(16)
    doc.setTextColor(30, 41, 59)
    doc.text('Borç Döküm Raporu', margin, 38)

    doc.setFontSize(10)
    doc.setTextColor(100, 116, 139)
    doc.text(`Rapor Tarihi: ${new Date().toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' })}`, margin, 47)

    // Ayırıcı çizgi
    doc.setDrawColor(99, 102, 241)
    doc.setLineWidth(0.5)
    doc.line(margin, 52, pageWidth - margin, 52)

    let y = 65

    // Kiracı Bilgisi
    doc.setFontSize(12)
    doc.setTextColor(30, 41, 59)
    doc.setFont(doc.getFont().fontName, 'bold')
    doc.text('KİRACI BİLGİSİ', margin, y)
    y += 8
    doc.setFont(doc.getFont().fontName, 'normal')
    doc.setFontSize(10)
    doc.setTextColor(71, 85, 105)

    const infoLines = [
        `Kiracı: ${tenant.full_name}`,
        `Telefon: ${tenant.phone || '—'}`,
        `Email: ${tenant.email || '—'}`,
        `Mülk: ${tenant.properties?.name || '—'}`,
        `Adres: ${tenant.properties?.address || '—'}`,
    ]
    infoLines.forEach(line => {
        doc.text(line, margin, y)
        y += 6
    })

    y += 4

    // Sözleşme Bilgisi
    if (activeContract) {
        doc.setFontSize(12)
        doc.setTextColor(30, 41, 59)
        doc.setFont(doc.getFont().fontName, 'bold')
        doc.text('SÖZLEŞME BİLGİSİ', margin, y)
        y += 8
        doc.setFont(doc.getFont().fontName, 'normal')
        doc.setFontSize(10)
        doc.setTextColor(71, 85, 105)

        const contractLines = [
            `Dönem: ${new Date(activeContract.start_date).toLocaleDateString('tr-TR')} - ${new Date(activeContract.end_date).toLocaleDateString('tr-TR')}`,
            `Aylık Kira: ${activeContract.rent_amount.toLocaleString('tr-TR')} TL`,
            `Ödeme Günü: Her ay ${activeContract.payment_day || 5}. gün`,
            `Depozito: ${activeContract.deposit_amount.toLocaleString('tr-TR')} TL`,
        ]
        contractLines.forEach(line => {
            doc.text(line, margin, y)
            y += 6
        })
    }

    y += 6

    // Borç Özeti
    doc.setFontSize(12)
    doc.setTextColor(30, 41, 59)
    doc.setFont(doc.getFont().fontName, 'bold')
    doc.text('BORÇ ÖZETİ', margin, y)
    y += 8
    doc.setFont(doc.getFont().fontName, 'normal')
    doc.setFontSize(10)

    const summaryData = [
        ['Bugüne Kadar Tahakkuk Eden Toplam Kira', `${totalExpected.toLocaleString('tr-TR')} TL`],
        ['Yapılan Toplam Ödeme', `${totalPaid.toLocaleString('tr-TR')} TL`],
        ['Kalan Borç', `${totalDebt.toLocaleString('tr-TR')} TL`],
        ['Geciken Ay Sayısı', `${overdueCount} ay`],
    ]

    autoTable(doc, {
        startY: y,
        head: [['Açıklama', 'Tutar']],
        body: summaryData,
        theme: 'grid',
        headStyles: {
            fillColor: [99, 102, 241],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
        },
        bodyStyles: {
            textColor: [30, 41, 59],
        },
        columnStyles: {
            0: { cellWidth: contentWidth * 0.6 },
            1: { cellWidth: contentWidth * 0.4, halign: 'right' },
        },
        margin: { left: margin, right: margin },
    })

    y = (doc as any).lastAutoTable.finalY + 10

    // Ay Ay Tablo
    if (periods.length > 0) {
        doc.setFontSize(12)
        doc.setTextColor(30, 41, 59)
        doc.setFont(doc.getFont().fontName, 'bold')
        doc.text('AY AY BORÇ / ÖDEME TABLOSU', margin, y)
        y += 8
        doc.setFont(doc.getFont().fontName, 'normal')

        const tableData = [...periods]
            .sort((a: any, b: any) => b.year - a.year || b.month - a.month)
            .map((period: any) => {
                const remaining = period.expected_amount - period.paid_amount
                const payments = (period.payments || []) as any[]
                const cashAmount = payments.filter((p: any) => p.method === 'cash').reduce((s: number, p: any) => s + p.amount, 0)
                const bankAmount = payments.filter((p: any) => p.method === 'bank').reduce((s: number, p: any) => s + p.amount, 0)
                const hasReceipt = payments.some((p: any) => p.receipt_file_url)
                const statusLabel = period.status === 'paid' ? 'Ödendi' : period.status === 'overdue' ? 'Gecikti' : period.status === 'partial' ? 'Kısmi' : 'Bekliyor'

                return [
                    `${period.month}/${period.year}`,
                    `${period.expected_amount.toLocaleString('tr-TR')} TL`,
                    `${period.paid_amount.toLocaleString('tr-TR')} TL`,
                    `${remaining.toLocaleString('tr-TR')} TL`,
                    statusLabel,
                    cashAmount > 0 ? `Elden: ${cashAmount.toLocaleString('tr-TR')} TL` : '',
                    bankAmount > 0 ? `Banka: ${bankAmount.toLocaleString('tr-TR')} TL` : '',
                    hasReceipt ? '✓' : '—',
                ]
            })

        autoTable(doc, {
            startY: y,
            head: [['Dönem', 'Kira', 'Ödenen', 'Kalan', 'Durum', 'Elden', 'Banka', 'Dekont']],
            body: tableData,
            theme: 'grid',
            headStyles: {
                fillColor: [99, 102, 241],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 8,
            },
            bodyStyles: {
                textColor: [30, 41, 59],
                fontSize: 8,
            },
            columnStyles: {
                0: { cellWidth: 22 },
                1: { cellWidth: 28, halign: 'right' },
                2: { cellWidth: 28, halign: 'right' },
                3: { cellWidth: 28, halign: 'right' },
                4: { cellWidth: 16, halign: 'center' },
                5: { cellWidth: 30 },
                6: { cellWidth: 30 },
                7: { cellWidth: 12, halign: 'center' },
            },
            margin: { left: margin, right: margin },
        })

        y = (doc as any).lastAutoTable.finalY + 10
    }

    // Alt Bilgi
    const remainingPages = doc.getNumberOfPages()
    for (let i = 1; i <= remainingPages; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(148, 163, 184)
        doc.text(
            `KiraTakip - Borç Döküm Raporu | Sayfa ${i}/${remainingPages}`,
            margin,
            doc.internal.pageSize.getHeight() - 10
        )
    }

    // PDF'i buffer olarak döndür
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'))

    return new NextResponse(pdfBuffer, {
        headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${tenant.full_name.replace(/\s+/g, '_')}_borc_dokumu.pdf"`,
            'Content-Length': pdfBuffer.length.toString(),
        },
    })
}