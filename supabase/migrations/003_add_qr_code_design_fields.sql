-- Add design and expiration fields to qr_codes table
ALTER TABLE qr_codes 
ADD COLUMN IF NOT EXISTS design_data JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS expiration_date TIMESTAMP WITH TIME ZONE;

-- Update type constraint to include new types
ALTER TABLE qr_codes DROP CONSTRAINT IF EXISTS qr_codes_type_check;
ALTER TABLE qr_codes ADD CONSTRAINT qr_codes_type_check 
  CHECK (type IN ('url', 'discount', 'text', 'wifi', 'email', 'phone', 'sms', 'vcard', 'whatsapp', 'pdf', 'app', 'images', 'video', 'social_media', 'event', '2d_barcode'));

-- Create index on design_data for faster queries
CREATE INDEX IF NOT EXISTS idx_qr_codes_design_data ON qr_codes USING gin(design_data);

-- Create index on expiration_date
CREATE INDEX IF NOT EXISTS idx_qr_codes_expiration_date ON qr_codes(expiration_date);

