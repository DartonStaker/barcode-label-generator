export type QRCodeType = 'url' | 'discount' | 'text' | 'wifi' | 'email' | 'phone' | 'sms' | 'vcard';
export type QRCodeStatus = 'active' | 'inactive' | 'archived';

export interface QRCode {
  id: string;
  title: string;
  type: QRCodeType;
  status: QRCodeStatus;
  payload: string;
  short_url: string;
  scans: number;
  created_at: string;
  updated_at: string;
}

/**
 * Generate a random alphanumeric short URL slug
 * @param length - Length of the slug (default: 10)
 * @returns Random alphanumeric string
 */
export function generateShortUrlSlug(length: number = 10): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Format payload based on QR code type
 * @param type - QR code type
 * @param payload - Raw payload string
 * @returns Formatted payload string
 */
export function formatQRPayload(type: QRCodeType, payload: string): string {
  switch (type) {
    case 'url':
      // Ensure URL has protocol
      if (!payload.match(/^https?:\/\//i)) {
        return `https://${payload}`;
      }
      return payload;
    case 'discount':
      // Discount codes are typically plain text
      return payload.trim();
    case 'text':
      return payload;
    case 'wifi':
      // WiFi format: WIFI:T:WPA;S:NetworkName;P:Password;;
      return payload;
    case 'email':
      // Email format: mailto:email@example.com?subject=Subject&body=Body
      if (!payload.startsWith('mailto:')) {
        return `mailto:${payload}`;
      }
      return payload;
    case 'phone':
      // Phone format: tel:+1234567890
      if (!payload.startsWith('tel:')) {
        return `tel:${payload}`;
      }
      return payload;
    case 'sms':
      // SMS format: sms:+1234567890?body=Message
      if (!payload.startsWith('sms:')) {
        return `sms:${payload}`;
      }
      return payload;
    case 'vcard':
      // vCard format (already formatted)
      return payload;
    default:
      return payload;
  }
}

/**
 * Validate payload based on QR code type
 * @param type - QR code type
 * @param payload - Payload to validate
 * @returns Validation result with error message if invalid
 */
export function validateQRPayload(
  type: QRCodeType,
  payload: string
): { valid: boolean; error?: string } {
  if (!payload || payload.trim().length === 0) {
    return { valid: false, error: 'Payload cannot be empty' };
  }

  switch (type) {
    case 'url':
      try {
        const url = payload.match(/^https?:\/\//i) ? payload : `https://${payload}`;
        new URL(url);
        return { valid: true };
      } catch {
        return { valid: false, error: 'Invalid URL format' };
      }
    case 'email':
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const email = payload.replace(/^mailto:/i, '');
      if (!emailRegex.test(email)) {
        return { valid: false, error: 'Invalid email format' };
      }
      return { valid: true };
    case 'phone':
      const phoneRegex = /^[\d\s\-\+\(\)]+$/;
      const phone = payload.replace(/^tel:/i, '');
      if (!phoneRegex.test(phone) || phone.length < 7) {
        return { valid: false, error: 'Invalid phone number format' };
      }
      return { valid: true };
    case 'discount':
    case 'text':
      if (payload.trim().length === 0) {
        return { valid: false, error: 'Payload cannot be empty' };
      }
      return { valid: true };
    case 'wifi':
    case 'sms':
    case 'vcard':
      // Basic validation - just check not empty
      return { valid: payload.trim().length > 0 };
    default:
      return { valid: true };
  }
}

/**
 * Get display label for QR code type
 */
export function getQRCodeTypeLabel(type: QRCodeType): string {
  const labels: Record<QRCodeType, string> = {
    url: 'URL',
    discount: 'Discount',
    text: 'Text',
    wifi: 'Wi-Fi',
    email: 'Email',
    phone: 'Phone',
    sms: 'SMS',
    vcard: 'vCard',
  };
  return labels[type] || type;
}

/**
 * Get display label for QR code status
 */
export function getQRCodeStatusLabel(status: QRCodeStatus): string {
  const labels: Record<QRCodeStatus, string> = {
    active: 'Active',
    inactive: 'Inactive',
    archived: 'Archived',
  };
  return labels[status] || status;
}

/**
 * Format relative time (e.g., "9 days ago")
 */
export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const then = typeof date === 'string' ? new Date(date) : date;
  const diffInSeconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'just now';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'} ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} ${diffInMonths === 1 ? 'month' : 'months'} ago`;
  }

  const diffInYears = Math.floor(diffInMonths / 12);
  return `${diffInYears} ${diffInYears === 1 ? 'year' : 'years'} ago`;
}

