import { createClient } from './client';
import { QRCode, QRCodeType, QRCodeStatus, QRCodeDesign, generateShortUrlSlug, formatQRPayload } from '../qrCode';

export interface QRCodeFilters {
  search?: string;
  status?: QRCodeStatus | 'all';
  type?: QRCodeType | 'all';
}

export interface CreateQRCodeData {
  title: string;
  type: QRCodeType;
  status?: QRCodeStatus;
  payload: string;
  short_url?: string;
  design_data?: QRCodeDesign | null;
  expiration_date?: string | null;
}

export interface UpdateQRCodeData {
  title?: string;
  type?: QRCodeType;
  status?: QRCodeStatus;
  payload?: string;
  design_data?: QRCodeDesign | null;
  expiration_date?: string | null;
}

/**
 * Get all QR codes from Supabase with optional filters
 */
export async function getQRCodesFromSupabase(filters?: QRCodeFilters): Promise<QRCode[]> {
  const supabase = createClient();

  let query = supabase.from('qr_codes').select('*');

  // Apply filters
  if (filters) {
    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }
    if (filters.type && filters.type !== 'all') {
      query = query.eq('type', filters.type);
    }
    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,payload.ilike.%${filters.search}%,short_url.ilike.%${filters.search}%`);
    }
  }

  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch QR codes from Supabase: ${error.message}`);
  }

  return (data || []).map((row) => ({
    id: row.id,
    title: row.title,
    type: row.type as QRCodeType,
    status: row.status as QRCodeStatus,
    payload: row.payload,
    short_url: row.short_url,
    scans: row.scans,
    design_data: (row.design_data as QRCodeDesign) || null,
    expiration_date: row.expiration_date || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
}

/**
 * Get a single QR code by ID
 */
export async function getQRCodeById(id: string): Promise<QRCode | null> {
  const supabase = createClient();

  const { data, error } = await supabase.from('qr_codes').select('*').eq('id', id).single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
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
    design_data: (data.design_data as QRCodeDesign) || null,
    expiration_date: data.expiration_date || null,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

/**
 * Get a QR code by short URL
 */
export async function getQRCodeByShortUrl(shortUrl: string): Promise<QRCode | null> {
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
    design_data: (data.design_data as QRCodeDesign) || null,
    expiration_date: data.expiration_date || null,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

/**
 * Generate a unique short URL slug
 */
async function generateUniqueShortUrl(): Promise<string> {
  const supabase = createClient();
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const slug = generateShortUrlSlug(10);
    const { data, error } = await supabase.from('qr_codes').select('short_url').eq('short_url', slug).single();

    if (error && error.code === 'PGRST116') {
      // No row found, slug is unique
      return slug;
    }

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to check short URL uniqueness: ${error.message}`);
    }

    attempts++;
  }

  throw new Error('Failed to generate unique short URL after multiple attempts');
}

/**
 * Create a new QR code in Supabase
 */
export async function createQRCodeInSupabase(data: CreateQRCodeData): Promise<QRCode> {
  const supabase = createClient();

  // Format payload based on type
  const formattedPayload = formatQRPayload(data.type, data.payload);

  // Generate unique short URL if not provided
  const shortUrl = data.short_url || (await generateUniqueShortUrl());

  const insertData: any = {
    title: data.title,
    type: data.type,
    status: data.status || 'active',
    payload: formattedPayload,
    short_url: shortUrl,
    scans: 0,
  };

  if (data.design_data) {
    insertData.design_data = data.design_data;
  }
  if (data.expiration_date) {
    insertData.expiration_date = data.expiration_date;
  }

  const { data: insertedData, error } = await supabase.from('qr_codes').insert(insertData).select().single();

  if (error) {
    throw new Error(`Failed to create QR code in Supabase: ${error.message}`);
  }

  return {
    id: insertedData.id,
    title: insertedData.title,
    type: insertedData.type as QRCodeType,
    status: insertedData.status as QRCodeStatus,
    payload: insertedData.payload,
    short_url: insertedData.short_url,
    scans: insertedData.scans,
    created_at: insertedData.created_at,
    updated_at: insertedData.updated_at,
  };
}

/**
 * Update an existing QR code in Supabase
 */
export async function updateQRCodeInSupabase(id: string, data: UpdateQRCodeData): Promise<QRCode> {
  const supabase = createClient();

  const updateData: any = {};

  if (data.title !== undefined) {
    updateData.title = data.title;
  }
  if (data.type !== undefined) {
    updateData.type = data.type;
    // Re-format payload if type changed
    if (data.payload !== undefined) {
      updateData.payload = formatQRPayload(data.type, data.payload);
    }
  } else if (data.payload !== undefined) {
    // Get current type to format payload
    const current = await getQRCodeById(id);
    if (current) {
      updateData.payload = formatQRPayload(current.type, data.payload);
    } else {
      updateData.payload = data.payload;
    }
  }
  if (data.status !== undefined) {
    updateData.status = data.status;
  }
  if (data.design_data !== undefined) {
    updateData.design_data = data.design_data;
  }
  if (data.expiration_date !== undefined) {
    updateData.expiration_date = data.expiration_date;
  }

  const { data: updatedData, error } = await supabase
    .from('qr_codes')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update QR code in Supabase: ${error.message}`);
  }

  return {
    id: updatedData.id,
    title: updatedData.title,
    type: updatedData.type as QRCodeType,
    status: updatedData.status as QRCodeStatus,
    payload: updatedData.payload,
    short_url: updatedData.short_url,
    scans: updatedData.scans,
    created_at: updatedData.created_at,
    updated_at: updatedData.updated_at,
  };
}

/**
 * Delete a QR code from Supabase
 */
export async function deleteQRCodeFromSupabase(id: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.from('qr_codes').delete().eq('id', id);

  if (error) {
    throw new Error(`Failed to delete QR code from Supabase: ${error.message}`);
  }
}

/**
 * Increment scan count for a QR code by short URL
 */
export async function incrementQRCodeScans(shortUrl: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.rpc('increment_qr_code_scans', { short_url_param: shortUrl });

  // If RPC function doesn't exist, use update
  if (error && error.message.includes('function') && error.message.includes('does not exist')) {
    const { data: qrCode } = await supabase.from('qr_codes').select('scans').eq('short_url', shortUrl).single();

    if (qrCode) {
      const { error: updateError } = await supabase
        .from('qr_codes')
        .update({ scans: (qrCode.scans || 0) + 1 })
        .eq('short_url', shortUrl);

      if (updateError) {
        throw new Error(`Failed to increment QR code scans: ${updateError.message}`);
      }
    }
  } else if (error) {
    throw new Error(`Failed to increment QR code scans: ${error.message}`);
  }
}

