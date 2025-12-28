export type QRCodeType =
  | 'url'
  | 'discount'
  | 'text'
  | 'wifi'
  | 'email'
  | 'phone'
  | 'sms'
  | 'vcard'
  | 'whatsapp'
  | 'pdf'
  | 'app'
  | 'images'
  | 'video'
  | 'social_media'
  | 'event'
  | '2d_barcode';

export type QRCodeStatus = 'active' | 'inactive' | 'archived';

export type QRCodeFrameStyle = 'none' | 'scan_me_bottom' | 'scan_me_top' | 'scan_me_banner_bottom' | 'scan_me_banner_top' | 'scan_me_thick_bottom' | 'scan_me_thick_top' | 'scan_me_shopping_bag' | 'scan_me_clapperboard';
export type QRCodeModuleShape = 'square' | 'rounded' | 'dots' | 'extra_rounded' | 'organic' | 'classy' | 'classy-rounded' | 'smooth';
export type QRCodeCornerStyle = 'square' | 'rounded' | 'extra-rounded' | 'dot' | 'star' | 'circle' | 'diamond' | 'plus';
export type QRCodeCenterStyle = 'square' | 'rounded' | 'circle' | 'teardrop' | 'spiky' | 'star' | 'diamond' | 'plus';
export type QRCodeBorderStyle = 'none' | 'square' | 'rounded' | 'star' | 'circle' | 'diamond' | 'teardrop' | 'square_cutout';
export type QRCodeLogoType = 'none' | 'upload' | 'link' | 'location' | 'email' | 'whatsapp' | 'wifi' | 'contact' | 'paypal' | 'bitcoin' | 'scan_me' | 'scan_me_text' | 'scan_me_icon';

export interface QRCodeDesign {
  frameStyle: QRCodeFrameStyle;
  moduleShape: QRCodeModuleShape;
  cornerStyle: QRCodeCornerStyle;
  centerStyle: QRCodeCenterStyle;
  borderStyle: QRCodeBorderStyle;
  logoType: QRCodeLogoType;
  logoUrl?: string;
  logoSize?: number;
  foregroundColor: string;
  backgroundColor: string;
  borderColor?: string;
  errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H';
  isRound?: boolean; // For circular QR codes with rounded outer space
}

export interface QRCode {
  id: string;
  title: string;
  type: QRCodeType;
  status: QRCodeStatus;
  payload: string;
  short_url: string;
  scans: number;
  design_data?: QRCodeDesign | null;
  expiration_date?: string | null;
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
    case '2d_barcode':
      // Discount codes and 2D barcodes are typically plain text
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
    case 'whatsapp':
      // WhatsApp format: https://wa.me/1234567890?text=Message
      if (!payload.startsWith('https://wa.me/') && !payload.startsWith('wa.me/')) {
        return `https://wa.me/${payload.replace(/^\+/, '')}`;
      }
      if (payload.startsWith('wa.me/')) {
        return `https://${payload}`;
      }
      return payload;
    case 'vcard':
      // vCard format (already formatted)
      return payload;
    case 'pdf':
    case 'images':
    case 'video':
      // Media files - should be URLs
      if (!payload.match(/^https?:\/\//i)) {
        return `https://${payload}`;
      }
      return payload;
    case 'app':
      // App deep links
      return payload;
    case 'social_media':
      // Social media URLs
      if (!payload.match(/^https?:\/\//i)) {
        return `https://${payload}`;
      }
      return payload;
    case 'event':
      // Event data (could be various formats)
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
    url: 'Link',
    discount: 'Discount Code',
    text: 'Text',
    wifi: 'Wi-Fi',
    email: 'E-mail',
    phone: 'Call',
    sms: 'SMS',
    vcard: 'V-card',
    whatsapp: 'WhatsApp',
    pdf: 'PDF',
    app: 'App',
    images: 'Images',
    video: 'Video',
    social_media: 'Social Media',
    event: 'Event',
    '2d_barcode': '2D Barcode',
  };
  return labels[type] || type;
}

export const DEFAULT_QR_DESIGN: QRCodeDesign = {
  frameStyle: 'none',
  moduleShape: 'square',
  cornerStyle: 'square',
  centerStyle: 'square',
  borderStyle: 'none',
  logoType: 'none',
  foregroundColor: '#000000',
  backgroundColor: '#FFFFFF',
  borderColor: '#000000',
  errorCorrectionLevel: 'M',
  isRound: false,
};

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

