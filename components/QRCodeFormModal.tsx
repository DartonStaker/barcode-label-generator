'use client';

import { useState, useEffect } from 'react';
import QRCode from './QRCode';
import { QRCode as QRCodeType, QRCodeType as QRCodeTypeEnum, QRCodeStatus, validateQRPayload, formatQRPayload, getQRCodeTypeLabel } from '@/lib/qrCode';

interface QRCodeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { title: string; type: QRCodeTypeEnum; status: QRCodeStatus; payload: string }) => Promise<void>;
  qrCode?: QRCodeType | null;
}

const QR_CODE_TYPES: QRCodeTypeEnum[] = ['url', 'discount', 'text', 'wifi', 'email', 'phone', 'sms', 'vcard'];
const QR_CODE_STATUSES: QRCodeStatus[] = ['active', 'inactive', 'archived'];

export default function QRCodeFormModal({ isOpen, onClose, onSave, qrCode }: QRCodeFormModalProps) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<QRCodeTypeEnum>('url');
  const [status, setStatus] = useState<QRCodeStatus>('active');
  const [payload, setPayload] = useState('');
  const [errors, setErrors] = useState<{ title?: string; payload?: string }>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (qrCode) {
      setTitle(qrCode.title);
      setType(qrCode.type);
      setStatus(qrCode.status);
      setPayload(qrCode.payload);
    } else {
      setTitle('');
      setType('url');
      setStatus('active');
      setPayload('');
    }
    setErrors({});
  }, [qrCode, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate
    const newErrors: { title?: string; payload?: string } = {};
    if (!title.trim()) {
      newErrors.title = 'Title is required';
    }
    const payloadValidation = validateQRPayload(type, payload);
    if (!payloadValidation.valid) {
      newErrors.payload = payloadValidation.error || 'Invalid payload';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSaving(true);
    try {
      await onSave({ title: title.trim(), type, status, payload });
      onClose();
    } catch (error) {
      console.error('Failed to save QR code:', error);
      alert(error instanceof Error ? error.message : 'Failed to save QR code');
    } finally {
      setSaving(false);
    }
  };

  const getPayloadPlaceholder = () => {
    switch (type) {
      case 'url':
        return 'https://example.com';
      case 'discount':
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
      case 'vcard':
        return 'BEGIN:VCARD\nVERSION:3.0\nFN:John Doe\nEND:VCARD';
      default:
        return '';
    }
  };

  const formattedPayload = payload ? formatQRPayload(type, payload) : '';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
          &#8203;
        </span>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900" id="modal-title">
                  {qrCode ? 'Edit QR Code' : 'Create QR Code'}
                </h3>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-500 focus:outline-none"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
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
                    onChange={(e) => setTitle(e.target.value)}
                    className={`block w-full px-3 py-2 border rounded-lg focus:ring-purple-500 focus:border-purple-500 ${
                      errors.title ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter QR code title"
                  />
                  {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                      Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="type"
                      value={type}
                      onChange={(e) => setType(e.target.value as QRCodeTypeEnum)}
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
                    <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      id="status"
                      value={status}
                      onChange={(e) => setStatus(e.target.value as QRCodeStatus)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"
                    >
                      {QR_CODE_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="payload" className="block text-sm font-medium text-gray-700 mb-1">
                    {type === 'url' ? 'URL' : type === 'discount' ? 'Discount Code' : 'Payload'}{' '}
                    <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="payload"
                    value={payload}
                    onChange={(e) => setPayload(e.target.value)}
                    rows={type === 'vcard' ? 6 : 3}
                    className={`block w-full px-3 py-2 border rounded-lg focus:ring-purple-500 focus:border-purple-500 ${
                      errors.payload ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder={getPayloadPlaceholder()}
                  />
                  {errors.payload && <p className="mt-1 text-sm text-red-600">{errors.payload}</p>}
                </div>

                {formattedPayload && (
                  <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-2">Preview</p>
                    <QRCode value={formattedPayload} size={200} fgColor="#9333ea" />
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="submit"
                disabled={saving}
                className={`w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-purple-600 text-base font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 sm:ml-3 sm:w-auto sm:text-sm ${
                  saving ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

