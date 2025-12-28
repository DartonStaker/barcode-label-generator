'use client';

import { useState, useEffect } from 'react';
import { QRCode as QRCodeType, QRCodeType as QRCodeTypeEnum, QRCodeStatus, QRCodeDesign, DEFAULT_QR_DESIGN, validateQRPayload, formatQRPayload } from '@/lib/qrCode';
import QRCodeStep1 from './QRCodeWizard/Step1Content';
import QRCodeStep2 from './QRCodeWizard/Step2Design';
import QRCodeStep3 from './QRCodeWizard/Step3Review';

interface QRCodeWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    title: string;
    type: QRCodeTypeEnum;
    status: QRCodeStatus;
    payload: string;
    design_data?: QRCodeDesign;
    expiration_date?: string | null;
  }) => Promise<void>;
  qrCode?: QRCodeType | null;
}

export default function QRCodeWizard({ isOpen, onClose, onSave, qrCode }: QRCodeWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [title, setTitle] = useState('');
  const [type, setType] = useState<QRCodeTypeEnum>('url');
  const [status, setStatus] = useState<QRCodeStatus>('active');
  const [payload, setPayload] = useState('');
  const [expirationDate, setExpirationDate] = useState<string>('');
  const [design, setDesign] = useState<QRCodeDesign>(DEFAULT_QR_DESIGN);
  const [errors, setErrors] = useState<{ title?: string; payload?: string }>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (qrCode) {
      setTitle(qrCode.title);
      setType(qrCode.type);
      setStatus(qrCode.status);
      setPayload(qrCode.payload);
      setExpirationDate(qrCode.expiration_date || '');
      setDesign(qrCode.design_data || DEFAULT_QR_DESIGN);
    } else {
      setTitle('');
      setType('url');
      setStatus('active');
      setPayload('');
      setExpirationDate('');
      setDesign(DEFAULT_QR_DESIGN);
    }
    setCurrentStep(1);
    setErrors({});
  }, [qrCode, isOpen]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (currentStep === 1) {
      // Validate step 1
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
    }
    setCurrentStep((prev) => Math.min(prev + 1, 3));
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        type,
        status,
        payload,
        design_data: design,
        expiration_date: expirationDate || null,
      });
      onClose();
    } catch (error) {
      console.error('Failed to save QR code:', error);
      alert(error instanceof Error ? error.message : 'Failed to save QR code');
    } finally {
      setSaving(false);
    }
  };

  const formattedPayload = payload ? formatQRPayload(type, payload) : '';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full">
          <div className="bg-white">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h3 className="text-xl font-semibold text-gray-900">Create QR Code</h3>
              </div>
              <div className="text-sm text-gray-500">
                Step {currentStep} of 3
              </div>
            </div>

            {/* Step Content */}
            <div className="px-6 py-6">
              {currentStep === 1 && (
                <QRCodeStep1
                  title={title}
                  type={type}
                  payload={payload}
                  expirationDate={expirationDate}
                  errors={errors}
                  onTitleChange={setTitle}
                  onTypeChange={setType}
                  onPayloadChange={setPayload}
                  onExpirationDateChange={setExpirationDate}
                />
              )}
              {currentStep === 2 && (
                <QRCodeStep2
                  design={design}
                  onDesignChange={setDesign}
                  qrValue={formattedPayload}
                />
              )}
              {currentStep === 3 && (
                <QRCodeStep3
                  title={title}
                  type={type}
                  payload={formattedPayload}
                  design={design}
                  expirationDate={expirationDate}
                  shortUrl={`https://apparely.co.za/qr/[generated]`}
                />
              )}
            </div>

            {/* Footer Navigation */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <button
                type="button"
                onClick={currentStep === 1 ? onClose : handleBack}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                {currentStep === 1 ? 'Cancel' : 'Back'}
              </button>

              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                >
                  Next
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className={`inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 ${
                    saving ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {saving ? 'Saving...' : 'Save QR Code'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

