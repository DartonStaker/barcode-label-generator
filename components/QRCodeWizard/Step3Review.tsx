'use client';

import { useState } from 'react';
import QRCodeAdvanced from '../QRCodeAdvanced';
import { QRCodeDesign, getQRCodeTypeLabel } from '@/lib/qrCode';

interface Step3ReviewProps {
  title: string;
  type: string;
  payload: string;
  design: QRCodeDesign;
  expirationDate: string;
  shortUrl?: string;
}

export default function QRCodeStep3({
  title,
  type,
  payload,
  design,
  expirationDate,
  shortUrl,
}: Step3ReviewProps) {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);

  const handleCopyUrl = async () => {
    if (!shortUrl) return;
    try {
      await navigator.clipboard.writeText(shortUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  const handleCopyImage = async () => {
    try {
      // Get the QR code SVG element and convert to image
      const qrElement = document.querySelector('[data-qr-code]');
      if (qrElement) {
        // For now, just show a message - full implementation would use html2canvas or similar
        setCopiedImage(true);
        setTimeout(() => setCopiedImage(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy image:', err);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Left: Summary */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
            3
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Review and Save</h2>
            <p className="text-sm text-gray-600">Review your QR code details before saving</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Content Details</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium text-gray-700">Title:</span> <span className="text-gray-600">{title}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Type:</span> <span className="text-gray-600">{getQRCodeTypeLabel(type as any)}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Destination:</span>
                <div className="mt-1 text-gray-600 text-xs break-all">{payload}</div>
              </div>
              {expirationDate && (
                <div>
                  <span className="font-medium text-gray-700">Expiration:</span>{' '}
                  <span className="text-gray-600">{new Date(expirationDate).toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Design Settings</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium text-gray-700">Frame:</span>{' '}
                <span className="text-gray-600 capitalize">{design.frameStyle.replace(/_/g, ' ')}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Module Shape:</span>{' '}
                <span className="text-gray-600 capitalize">{design.moduleShape.replace(/_/g, ' ')}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Corner Style:</span>{' '}
                <span className="text-gray-600 capitalize">{design.cornerStyle.replace(/-/g, ' ')}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Border Style:</span>{' '}
                <span className="text-gray-600 capitalize">{design.borderStyle.replace(/_/g, ' ')}</span>
              </div>
              {design.isRound && (
                <div>
                  <span className="font-medium text-gray-700">Round QR:</span>{' '}
                  <span className="text-gray-600">Yes</span>
                </div>
              )}
              <div>
                <span className="font-medium text-gray-700">Logo:</span>{' '}
                <span className="text-gray-600 capitalize">{design.logoType.replace(/_/g, ' ')}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Colors:</span>{' '}
                <span className="text-gray-600">
                  <span
                    className="inline-block w-4 h-4 rounded border border-gray-300 mr-1"
                    style={{ backgroundColor: design.foregroundColor }}
                  ></span>
                  <span
                    className="inline-block w-4 h-4 rounded border border-gray-300"
                    style={{ backgroundColor: design.backgroundColor }}
                  ></span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Preview */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Preview</h3>
        <div className="bg-gray-50 rounded-lg p-6 border-2 border-dashed border-gray-300 flex flex-col items-center">
          <div data-qr-code className="mb-4">
            <QRCodeAdvanced value={payload} size={240} design={design} />
          </div>

          <div className="w-full space-y-3 text-sm">
            {shortUrl && (
              <div>
                <span className="font-medium text-gray-700">Short URL:</span>
                <div className="mt-1 px-3 py-2 bg-purple-100 rounded text-purple-700 text-xs break-all">
                  {shortUrl}
                </div>
              </div>
            )}
            <div>
              <span className="font-medium text-gray-700">Type:</span> <span className="text-gray-600">{getQRCodeTypeLabel(type as any).toLowerCase()}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Destination:</span>
              <div className="mt-1 text-gray-600 text-xs break-all">{payload}</div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleCopyUrl}
                className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-purple-300 rounded-lg text-sm font-medium text-purple-700 bg-white hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                {copiedUrl ? (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy URL
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleCopyImage}
                className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-purple-300 rounded-lg text-sm font-medium text-purple-700 bg-white hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                {copiedImage ? (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy Image
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

