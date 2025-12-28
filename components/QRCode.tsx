'use client';

import { QRCodeSVG } from 'qrcode.react';
import Image from 'next/image';

interface QRCodeProps {
  value: string;
  size?: number;
  level?: 'L' | 'M' | 'Q' | 'H';
  fgColor?: string;
  bgColor?: string;
  logoSize?: number;
  logoUrl?: string;
  className?: string;
}

export default function QRCode({
  value,
  size = 200,
  level = 'M',
  fgColor = '#000000',
  bgColor = '#FFFFFF',
  logoSize = 40,
  logoUrl = '/apparely-rec-logo.png',
  className = '',
}: QRCodeProps) {
  return (
    <div className={`relative inline-block ${className}`} style={{ width: size, height: size }}>
      <QRCodeSVG
        value={value}
        size={size}
        level={level}
        fgColor={fgColor}
        bgColor={bgColor}
        includeMargin={false}
      />
      {logoUrl && (
        <div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg p-1.5"
          style={{ width: logoSize + 8, height: logoSize + 8 }}
        >
          <Image
            src={logoUrl}
            alt="Logo"
            width={logoSize}
            height={logoSize}
            className="object-contain"
            unoptimized
          />
        </div>
      )}
    </div>
  );
}

