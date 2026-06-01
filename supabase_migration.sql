-- ============================================================
-- KiraTakip Personal V2 - Supabase Migration
-- Bu SQL'i Supabase SQL Editor'da çalıştırın
-- ============================================================

-- 1. contracts tablosuna payment_day ve status sütunları ekle
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS payment_day INTEGER NOT NULL DEFAULT 5;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 2. rent_periods tablosuna contract_id ekle
ALTER TABLE rent_periods ADD COLUMN IF NOT EXISTS contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_rent_periods_contract_id ON rent_periods(contract_id);

-- 3. payments tablosuna receipt alanları ekle
ALTER TABLE payments ADD COLUMN IF NOT EXISTS receipt_file_url TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS receipt_file_type TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS receipt_original_name TEXT;

-- 4. receipts tablosuna original_name ekle
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS original_name TEXT NOT NULL DEFAULT '';

-- 5. RLS Policy: Tüm tablolar için user_id bazlı RLS
-- (Mevcut tablolarda user_id zaten var, RLS policy ekliyoruz)

-- Properties
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can only access their own properties" ON properties;
CREATE POLICY "Users can only access their own properties" ON properties
  FOR ALL USING (auth.uid()::text = user_id);

-- Tenants
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can only access their own tenants" ON tenants;
CREATE POLICY "Users can only access their own tenants" ON tenants
  FOR ALL USING (auth.uid()::text = user_id);

-- Contracts
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can only access their own contracts" ON contracts;
CREATE POLICY "Users can only access their own contracts" ON contracts
  FOR ALL USING (auth.uid()::text = user_id);

-- Rent Periods
ALTER TABLE rent_periods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can only access their own rent_periods" ON rent_periods;
CREATE POLICY "Users can only access their own rent_periods" ON rent_periods
  FOR ALL USING (auth.uid()::text = user_id);

-- Payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can only access their own payments" ON payments;
CREATE POLICY "Users can only access their own payments" ON payments
  FOR ALL USING (auth.uid()::text = user_id);

-- Receipts
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can only access their own receipts" ON receipts;
CREATE POLICY "Users can only access their own receipts" ON receipts
  FOR ALL USING (auth.uid()::text = user_id);

-- Notification Settings
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can only access their own notification_settings" ON notification_settings;
CREATE POLICY "Users can only access their own notification_settings" ON notification_settings
  FOR ALL USING (auth.uid()::text = user_id);

-- 6. Storage: tenant-files bucket oluştur
-- Bu kısmı Supabase Dashboard > Storage > Create bucket ile yapın
-- Bucket adı: tenant-files
-- Public: false (private bucket)
-- RLS policy ekleyin:

-- NOT: Bucket oluşturmak için Supabase Dashboard kullanın:
-- Storage > Create bucket > name: "tenant-files" > Public: false

-- Storage RLS Policies (SQL Editor'da çalıştırın):
-- SELECT, INSERT, UPDATE, DELETE için kendi dosyalarına erişim

-- 7. generate_rent_periods fonksiyonu
CREATE OR REPLACE FUNCTION generate_rent_periods(p_contract_id UUID)
RETURNS void AS $$
DECLARE
  v_contract RECORD;
  v_current_date DATE;
  v_end_date DATE;
  v_due_date DATE;
  v_year INTEGER;
  v_month INTEGER;
  v_exists INTEGER;
BEGIN
  -- Sözleşme bilgilerini al
  SELECT * INTO v_contract FROM contracts WHERE id = p_contract_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sözleşme bulunamadı: %', p_contract_id;
  END IF;

  v_current_date := v_contract.start_date::DATE;
  v_end_date := v_contract.end_date::DATE;

  -- Başlangıçtan bitişe kadar her ay için kira dönemi oluştur
  WHILE v_current_date <= v_end_date LOOP
    v_year := EXTRACT(YEAR FROM v_current_date);
    v_month := EXTRACT(MONTH FROM v_current_date);
    
    -- Vade tarihi: ayın payment_day'i
    v_due_date := make_date(v_year, v_month, LEAST(v_contract.payment_day, 
      EXTRACT(DAY FROM (v_current_date + INTERVAL '1 month' - INTERVAL '1 day'))::INTEGER));
    
    -- Eğer vade tarihi geçmişse ve daha önce oluşturulmamışsa
    SELECT COUNT(*) INTO v_exists FROM rent_periods 
    WHERE contract_id = p_contract_id AND year = v_year AND month = v_month;
    
    IF v_exists = 0 THEN
      INSERT INTO rent_periods (contract_id, tenant_id, property_id, year, month, due_date,
        expected_amount, paid_amount, status, user_id)
      VALUES (p_contract_id, v_contract.tenant_id, v_contract.property_id, v_year, v_month, v_due_date,
        v_contract.rent_amount, 0, 
        CASE WHEN v_due_date < CURRENT_DATE THEN 'overdue' ELSE 'pending' END,
        v_contract.user_id);
    END IF;

    -- Sonraki aya geç
    v_current_date := v_current_date + INTERVAL '1 month';
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. get_debt_statement fonksiyonu (kiracı borç dökümü)
CREATE OR REPLACE FUNCTION get_debt_statement(p_tenant_id UUID, p_user_id TEXT)
RETURNS TABLE (
  total_expected NUMERIC,
  total_paid NUMERIC,
  total_debt NUMERIC,
  overdue_months INTEGER,
  avg_delay_days NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(rp.expected_amount), 0)::NUMERIC as total_expected,
    COALESCE(SUM(rp.paid_amount), 0)::NUMERIC as total_paid,
    COALESCE(SUM(rp.expected_amount - rp.paid_amount), 0)::NUMERIC as total_debt,
    COUNT(*) FILTER (WHERE rp.status = 'overdue')::INTEGER as overdue_months,
    COALESCE(
      AVG(EXTRACT(DAY FROM (p.payment_date::TIMESTAMP - rp.due_date::TIMESTAMP))) 
      FILTER (WHERE p.payment_date > rp.due_date AND rp.paid_amount > 0),
      0
    )::NUMERIC as avg_delay_days
  FROM rent_periods rp
  LEFT JOIN payments p ON p.rent_period_id = rp.id
  WHERE rp.tenant_id = p_tenant_id AND rp.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. update_rent_period_status tetikleyicisi
-- Ödeme eklendiğinde/güncellendiğinde rent_periods status'unu güncelle

CREATE OR REPLACE FUNCTION update_rent_period_status()
RETURNS TRIGGER AS $$
DECLARE
  v_expected NUMERIC;
  v_total_paid NUMERIC;
BEGIN
  -- İlgili dönemin toplam ödenen tutarını hesapla
  SELECT expected_amount INTO v_expected FROM rent_periods WHERE id = NEW.rent_period_id;
  
  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid 
  FROM payments WHERE rent_period_id = NEW.rent_period_id;

  -- Durumu güncelle
  IF v_total_paid >= v_expected THEN
    UPDATE rent_periods SET paid_amount = v_total_paid, status = 'paid' WHERE id = NEW.rent_period_id;
  ELSIF v_total_paid > 0 THEN
    UPDATE rent_periods SET paid_amount = v_total_paid, status = 'partial' WHERE id = NEW.rent_period_id;
  ELSE
    UPDATE rent_periods SET paid_amount = 0, status = 'pending' WHERE id = NEW.rent_period_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_update_rent_period_status ON payments;
CREATE TRIGGER trg_update_rent_period_status
  AFTER INSERT OR UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_rent_period_status();

-- 10. Ödeme silindiğinde rent_periods güncelleme
CREATE OR REPLACE FUNCTION update_rent_period_status_on_delete()
RETURNS TRIGGER AS $$
DECLARE
  v_expected NUMERIC;
  v_total_paid NUMERIC;
BEGIN
  SELECT expected_amount INTO v_expected FROM rent_periods WHERE id = OLD.rent_period_id;
  
  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid 
  FROM payments WHERE rent_period_id = OLD.rent_period_id AND id != OLD.id;

  IF v_total_paid >= v_expected THEN
    UPDATE rent_periods SET paid_amount = v_total_paid, status = 'paid' WHERE id = OLD.rent_period_id;
  ELSIF v_total_paid > 0 THEN
    UPDATE rent_periods SET paid_amount = v_total_paid, status = 'partial' WHERE id = OLD.rent_period_id;
  ELSE
    UPDATE rent_periods SET paid_amount = 0, status = 'pending' WHERE id = OLD.rent_period_id;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_update_rent_period_status_on_delete ON payments;
CREATE TRIGGER trg_update_rent_period_status_on_delete
  AFTER DELETE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_rent_period_status_on_delete();