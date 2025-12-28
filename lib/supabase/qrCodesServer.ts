import { createClient } from './server';
import { QRCode, QRCodeType, QRCodeStatus } from '../qrCode';

/**
 * Get a QR code by short URL (server-side)
 */
export async function getQRCodeByShortUrlServer(shortUrl: string): Promise<QRCode | null> {
  const supabase = createClient();

  const { data, error } = await supabase.from('qr_codes').select('*').eq('short_url', shortUrl).single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to fetch QR code from Supabase: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    title: data.title,
    type: data.type as QRCodeType,
    status: data.status as QRCodeStatus,
    payload: data.payload,
    short_url: data.short_url,
    scans: data.scans,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

/**
 * Increment scan count for a QR code by short URL (server-side)
 */
export async function incrementQRCodeScansServer(shortUrl: string): Promise<void> {
  const supabase = createClient();

  // Try to use RPC function first, fallback to update
  const { error: rpcError } = await supabase.rpc('increment_qr_code_scans', { short_url_param: shortUrl });

  if (rpcError && rpcError.message.includes('function') && rpcError.message.includes('does not exist')) {
    // Fallback: get current scans and increment
    const { data: qrCode, error: fetchError } = await supabase
      .from('qr_codes')
      .select('scans')
      .eq('short_url', shortUrl)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch QR code: ${fetchError.message}`);
    }

    if (qrCode) {
      const { error: updateError } = await supabase
        .from('qr_codes')
        .update({ scans: (qrCode.scans || 0) + 1 })
        .eq('short_url', shortUrl);

      if (updateError) {
        throw new Error(`Failed to increment QR code scans: ${updateError.message}`);
      }
    }
  } else if (rpcError) {
    throw new Error(`Failed to increment QR code scans: ${rpcError.message}`);
  }
}

