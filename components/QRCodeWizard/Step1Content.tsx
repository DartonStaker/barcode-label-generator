'use client';

import { QRCodeType as QRCodeTypeEnum, getQRCodeTypeLabel, formatQRPayload, DEFAULT_QR_DESIGN } from '@/lib/qrCode';
import QRCodeAdvanced from '../QRCodeAdvanced';

interface Step1ContentProps {
  title: string;
  type: QRCodeTypeEnum;
  payload: string;
  expirationDate: string;
  errors: { title?: string; payload?: string };
  onTitleChange: (value: string) => void;
  onTypeChange: (value: QRCodeTypeEnum) => void;
  onPayloadChange: (value: string) => void;
  onExpirationDateChange: (value: string) => void;
}

const QR_CODE_TYPES: QRCodeTypeEnum[] = [
  'url',
  'text',
  'email',
  'phone',
  'sms',
  'vcard',
  'whatsapp',
  'wifi',
  'pdf',
  'app',
  'images',
  'video',
  'social_media',
  'event',
  'discount',
  '2d_barcode',
];

export default function QRCodeStep1({
  title,
  type,
  payload,
  expirationDate,
  errors,
  onTitleChange,
  onTypeChange,
  onPayloadChange,
  onExpirationDateChange,
}: Step1ContentProps) {
  const getPayloadPlaceholder = () => {
    switch (type) {
      case 'url':
        return 'https://example.com';
      case 'discount':
      case '2d_barcode':
        return 'DISCOUNT10';
      case 'text':
        return 'Enter text...';
      case 'wifi':
        return 'WIFI:T:WPA;S:NetworkName;P:Password;;';
      case 'email':
        return 'email@example.com';
      case 'phone':
        return '+1234567890';
      case 'sms':
        return '+1234567890';
      case 'whatsapp':
        return '+1234567890';
      case 'vcard':
        return 'BEGIN:VCARD\nVERSION:3.0\nFN:John Doe\nEND:VCARD';
      case 'pdf':
      case 'images':
      case 'video':
        return 'https://example.com/file.pdf';
      case 'app':
        return 'myapp://deeplink';
      case 'social_media':
        return 'https://facebook.com/username';
      case 'event':
        return 'Event details...';
      default:
        return '';
    }
  };

  const getPayloadLabel = () => {
    switch (type) {
      case 'url':
        return 'Website URL';
      case 'discount':
        return 'Discount Code';
      case '2d_barcode':
        return 'Barcode Value';
      case 'email':
        return 'Email Address';
      case 'phone':
        return 'Phone Number';
      case 'sms':
        return 'Phone Number';
      case 'whatsapp':
        return 'WhatsApp Number';
      case 'wifi':
        return 'Wi-Fi Configuration';
      case 'vcard':
        return 'vCard Data';
      case 'pdf':
        return 'PDF URL';
      case 'images':
        return 'Image URL';
      case 'video':
        return 'Video URL';
      case 'app':
        return 'App Deep Link';
      case 'social_media':
        return 'Social Media URL';
      case 'event':
        return 'Event Details';
      default:
        return 'Content';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Left: Form */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
            1
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Complete the content</h2>
            <p className="text-sm text-gray-600">Enter the details for your QR code</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              className={`block w-full px-3 py-2 border rounded-lg focus:ring-purple-500 focus:border-purple-500 ${
                errors.title ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="My QR Code"
            />
            {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
          </div>

          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
              QR Code Type <span className="text-red-500">*</span>
            </label>
            <select
              id="type"
              value={type}
              onChange={(e) => onTypeChange(e.target.value as QRCodeTypeEnum)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"
            >
              {QR_CODE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {getQRCodeTypeLabel(t)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="payload" className="block text-sm font-medium text-gray-700 mb-1">
              {getPayloadLabel()} <span className="text-red-500">*</span>
            </label>
            <textarea
              id="payload"
              value={payload}
              onChange={(e) => onPayloadChange(e.target.value)}
              rows={type === 'vcard' ? 6 : 3}
              className={`block w-full px-3 py-2 border rounded-lg focus:ring-purple-500 focus:border-purple-500 ${
                errors.payload ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder={getPayloadPlaceholder()}
            />
            {errors.payload && <p className="mt-1 text-sm text-red-600">{errors.payload}</p>}
          </div>

          <div>
            <label htmlFor="expiration" className="block text-sm font-medium text-gray-700 mb-1">
              Expiration Date (Optional)
            </label>
            <input
              id="expiration"
              type="datetime-local"
              value={expirationDate}
              onChange={(e) => onExpirationDateChange(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
        </div>
      </div>

      {/* Right: Preview */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Preview</h3>
        <div className="bg-gray-50 rounded-lg p-6 border-2 border-dashed border-gray-300 flex flex-col items-center">
          {payload ? (
            <>
              <div className="mb-4">
                <QRCodeAdvanced
                  value={formatQRPayload(type, payload)}
                  size={192}
                  design={DEFAULT_QR_DESIGN}
                />
              </div>
              <div className="w-full space-y-2 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Short URL:</span>
                  <div className="mt-1 px-3 py-2 bg-gray-200 rounded text-gray-600 text-xs break-all">
                    https://apparely.co.za/qr/[generated]
                  </div>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Type:</span> <span className="text-gray-600">{getQRCodeTypeLabel(type).toLowerCase()}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Destination:</span>
                  <div className="mt-1 text-gray-600 text-xs break-all">{payload}</div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center text-gray-400 py-12">
              <p>Enter content to see preview</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

