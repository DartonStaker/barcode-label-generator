'use client';

import { QRCodeSVG } from 'qrcode.react';
import Image from 'next/image';
import { QRCodeDesign, DEFAULT_QR_DESIGN } from '@/lib/qrCode';

interface QRCodeEnhancedProps {
  value: string;
  size?: number;
  design?: Partial<QRCodeDesign>;
  className?: string;
}

export default function QRCodeEnhanced({
  value,
  size = 200,
  design = {},
  className = '',
}: QRCodeEnhancedProps) {
  const finalDesign: QRCodeDesign = { ...DEFAULT_QR_DESIGN, ...design };
  const { frameStyle, logoType, logoUrl, logoSize = 40, foregroundColor, backgroundColor, errorCorrectionLevel } = finalDesign;

  const renderFrame = () => {
    if (frameStyle === 'none') return null;

    const frameSize = size + 40;
    const frameClasses: Record<string, string> = {
      rounded: 'rounded-xl border-2',
      circular: 'rounded-full border-2',
      scan_me: 'rounded-lg border-4',
      scan_me_simple: 'rounded-lg border-2',
      scan_me_qr: 'rounded-lg border-4 bg-purple-50',
      scan_me_menu: 'rounded-lg border-4 bg-gradient-to-br from-purple-50 to-purple-100',
    };

    return (
      <div
        className={`absolute flex items-center justify-center ${frameClasses[frameStyle] || ''}`}
        style={{
          width: frameSize,
          height: frameSize,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          borderColor: foregroundColor,
        }}
      >
        {(frameStyle === 'scan_me' || frameStyle === 'scan_me_simple' || frameStyle === 'scan_me_qr' || frameStyle === 'scan_me_menu') && (
          <div className="absolute top-2 left-1/2 transform -translate-x-1/2 text-xs font-semibold whitespace-nowrap" style={{ color: foregroundColor }}>
            SCAN ME
          </div>
        )}
      </div>
    );
  };

  const getLogoSource = () => {
    if (logoType === 'upload' && logoUrl) {
      return logoUrl;
    }
    if (logoType === 'none') {
      return null;
    }
    // For predefined logo types, use the apparely logo
    return '/apparely-rec-logo.png';
  };

  const logoSource = getLogoSource();

  return (
    <div className={`relative inline-block ${className}`} style={{ width: size, height: size }}>
      {renderFrame()}
      <div className="relative" style={{ width: size, height: size }}>
        <QRCodeSVG
          value={value}
          size={size}
          level={errorCorrectionLevel}
          fgColor={foregroundColor}
          bgColor={backgroundColor}
          includeMargin={false}
        />
        {logoSource && (
          <div
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg p-1.5"
            style={{ width: logoSize + 8, height: logoSize + 8 }}
          >
            <Image
              src={logoSource}
              alt="Logo"
              width={logoSize}
              height={logoSize}
              className="object-contain"
              unoptimized
            />
          </div>
        )}
      </div>
    </div>
  );
}

