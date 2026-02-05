-- =====================================================
-- EXPENSE REPORTS & EXPENSE ITEMS TABLES SETUP
-- Run this SQL in Supabase SQL Editor
-- =====================================================

-- Create expense_reports table
CREATE TABLE IF NOT EXISTS expense_reports (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    month TEXT NOT NULL, -- Format: "YYYY-MM"
    expense_period TEXT NOT NULL, -- Display format: "Feb, 2026"
    checked_by TEXT,
    approved_by TEXT,
    
    -- Totals
    total_nis DECIMAL(12, 2) DEFAULT 0,
    total_usd DECIMAL(12, 2) DEFAULT 0,
    exchange_rate_usd DECIMAL(6, 4) DEFAULT 3.12,
    total_usd_in_nis DECIMAL(12, 2) DEFAULT 0,
    total_eur DECIMAL(12, 2) DEFAULT 0,
    exchange_rate_eur DECIMAL(6, 4) DEFAULT 3.68,
    total_eur_in_nis DECIMAL(12, 2) DEFAULT 0,
    grand_total_nis DECIMAL(12, 2) DEFAULT 0,
    
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint: one report per user per month
    UNIQUE(user_id, month)
);

-- Create expense_items table
CREATE TABLE IF NOT EXISTS expense_items (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    expense_report_id TEXT NOT NULL REFERENCES expense_reports(id) ON DELETE CASCADE,
    currency TEXT NOT NULL CHECK (currency IN ('NIS', 'USD', 'EUR')),
    quantity INTEGER DEFAULT 1,
    description TEXT NOT NULL,
    unit_price DECIMAL(12, 2) NOT NULL,
    line_total DECIMAL(12, 2) NOT NULL,
    invoice_url TEXT, -- URL to uploaded invoice image in Supabase storage
    created_at TIMESTAMPTZ DEFAULT NOW(),
    sort_order INTEGER DEFAULT 0 -- For maintaining item order
);

-- Create storage bucket for invoice images
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoices', 'invoices', true)
ON CONFLICT (id) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_expense_reports_user_id ON expense_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_expense_reports_month ON expense_reports(month);
CREATE INDEX IF NOT EXISTS idx_expense_reports_status ON expense_reports(status);
CREATE INDEX IF NOT EXISTS idx_expense_items_report_id ON expense_items(expense_report_id);
CREATE INDEX IF NOT EXISTS idx_expense_items_currency ON expense_items(currency);

-- Enable RLS on tables
ALTER TABLE expense_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_items ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- ROW LEVEL SECURITY POLICIES FOR expense_reports
-- =====================================================

-- Users can view their own expense reports
CREATE POLICY "Users can view own expense reports"
ON expense_reports FOR SELECT
USING (
    user_id = current_setting('app.current_user_id', true)
);

-- Admins can view all expense reports
CREATE POLICY "Admins can view all expense reports"
ON expense_reports FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE id = current_setting('app.current_user_id', true) 
        AND is_admin = true
    )
);

-- Users can insert their own expense reports
CREATE POLICY "Users can insert own expense reports"
ON expense_reports FOR INSERT
WITH CHECK (
    user_id = current_setting('app.current_user_id', true)
);

-- Users can update their own expense reports (only if draft)
CREATE POLICY "Users can update own draft expense reports"
ON expense_reports FOR UPDATE
USING (
    user_id = current_setting('app.current_user_id', true)
    AND status = 'draft'
)
WITH CHECK (
    user_id = current_setting('app.current_user_id', true)
);

-- Admins can update any expense report (for approval/rejection)
CREATE POLICY "Admins can update all expense reports"
ON expense_reports FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE id = current_setting('app.current_user_id', true) 
        AND is_admin = true
    )
);

-- Users can delete their own expense reports (only if draft)
CREATE POLICY "Users can delete own draft expense reports"
ON expense_reports FOR DELETE
USING (
    user_id = current_setting('app.current_user_id', true)
    AND status = 'draft'
);

-- Admins can delete any expense report
CREATE POLICY "Admins can delete all expense reports"
ON expense_reports FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE id = current_setting('app.current_user_id', true) 
        AND is_admin = true
    )
);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES FOR expense_items
-- =====================================================

-- Users can view items from their own expense reports
CREATE POLICY "Users can view own expense items"
ON expense_items FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM expense_reports er
        WHERE er.id = expense_items.expense_report_id
        AND er.user_id = current_setting('app.current_user_id', true)
    )
);

-- Admins can view all expense items
CREATE POLICY "Admins can view all expense items"
ON expense_items FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE id = current_setting('app.current_user_id', true) 
        AND is_admin = true
    )
);

-- Users can insert items into their own expense reports
CREATE POLICY "Users can insert own expense items"
ON expense_items FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM expense_reports er
        WHERE er.id = expense_items.expense_report_id
        AND er.user_id = current_setting('app.current_user_id', true)
        AND er.status = 'draft'
    )
);

-- Users can update items in their own draft expense reports
CREATE POLICY "Users can update own expense items"
ON expense_items FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM expense_reports er
        WHERE er.id = expense_items.expense_report_id
        AND er.user_id = current_setting('app.current_user_id', true)
        AND er.status = 'draft'
    )
);

-- Users can delete items from their own draft expense reports
CREATE POLICY "Users can delete own expense items"
ON expense_items FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM expense_reports er
        WHERE er.id = expense_items.expense_report_id
        AND er.user_id = current_setting('app.current_user_id', true)
        AND er.status = 'draft'
    )
);

-- Admins can manage all expense items
CREATE POLICY "Admins can manage all expense items"
ON expense_items FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE id = current_setting('app.current_user_id', true) 
        AND is_admin = true
    )
);

-- =====================================================
-- STORAGE POLICIES FOR invoice images
-- =====================================================

-- Allow authenticated users to upload invoices
CREATE POLICY "Users can upload invoices"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'invoices'
);

-- Allow users to view their own invoices
CREATE POLICY "Users can view invoices"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'invoices'
);

-- Allow users to delete their own invoices
CREATE POLICY "Users can delete invoices"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'invoices'
);

-- =====================================================
-- TRIGGER: Auto-update updated_at timestamp
-- =====================================================

CREATE OR REPLACE FUNCTION update_expense_report_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS expense_reports_updated_at ON expense_reports;
CREATE TRIGGER expense_reports_updated_at
    BEFORE UPDATE ON expense_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_expense_report_updated_at();

-- =====================================================
-- DONE! Your expense tables are ready to use.
-- =====================================================
