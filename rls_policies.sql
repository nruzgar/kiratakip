-- ============================================================
-- KiraTakip - RLS Policy'leri
-- Tablolar oluşturulduktan sonra bu SQL'i çalıştırın
-- ============================================================

-- Properties
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own properties" ON properties
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can view own properties" ON properties
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can update own properties" ON properties
  FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own properties" ON properties
  FOR DELETE USING (auth.uid()::text = user_id);

-- Tenants
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own tenants" ON tenants
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can view own tenants" ON tenants
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can update own tenants" ON tenants
  FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own tenants" ON tenants
  FOR DELETE USING (auth.uid()::text = user_id);

-- Contracts
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own contracts" ON contracts
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can view own contracts" ON contracts
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can update own contracts" ON contracts
  FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own contracts" ON contracts
  FOR DELETE USING (auth.uid()::text = user_id);

-- Rent Periods
ALTER TABLE rent_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own rent_periods" ON rent_periods
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can view own rent_periods" ON rent_periods
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can update own rent_periods" ON rent_periods
  FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own rent_periods" ON rent_periods
  FOR DELETE USING (auth.uid()::text = user_id);

-- Payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own payments" ON payments
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can view own payments" ON payments
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can update own payments" ON payments
  FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own payments" ON payments
  FOR DELETE USING (auth.uid()::text = user_id);

-- Receipts
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own receipts" ON receipts
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can view own receipts" ON receipts
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can update own receipts" ON receipts
  FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own receipts" ON receipts
  FOR DELETE USING (auth.uid()::text = user_id);

-- Notification Settings
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own notification_settings" ON notification_settings
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can view own notification_settings" ON notification_settings
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can update own notification_settings" ON notification_settings
  FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own notification_settings" ON notification_settings
  FOR DELETE USING (auth.uid()::text = user_id);