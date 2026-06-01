-- ============================================================
-- Mevcut hatalı paid_amount ve status değerlerini düzeltme
-- Bu SQL'i Supabase SQL Editor'da çalıştırın
-- ============================================================

-- Tüm rent_periods kayıtlarını payments tablosuna göre güncelle
UPDATE rent_periods rp
SET 
    paid_amount = COALESCE((
        SELECT SUM(p.amount) 
        FROM payments p 
        WHERE p.rent_period_id = rp.id
    ), 0),
    status = CASE
        WHEN COALESCE((
            SELECT SUM(p.amount) 
            FROM payments p 
            WHERE p.rent_period_id = rp.id
        ), 0) >= rp.expected_amount THEN 'paid'
        WHEN COALESCE((
            SELECT SUM(p.amount) 
            FROM payments p 
            WHERE p.rent_period_id = rp.id
        ), 0) > 0 THEN 'partial'
        WHEN rp.due_date < CURRENT_DATE THEN 'overdue'
        ELSE 'pending'
    END;

-- Doğrulama: Hala paid_amount=0 olup payments'ı olan kayıt var mı?
SELECT COUNT(*) AS hatali_kayit_sayisi
FROM rent_periods rp
WHERE EXISTS (SELECT 1 FROM payments p WHERE p.rent_period_id = rp.id)
AND rp.paid_amount = 0;