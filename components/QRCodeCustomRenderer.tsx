'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { QRCodeDesign, DEFAULT_QR_DESIGN } from '@/lib/qrCode';

interface QRCodeCustomRendererProps {
  value: string;
  size?: number;
  design?: Partial<QRCodeDesign>;
  className?: string;
}

export default function QRCodeCustomRenderer({
  value,
  size = 200,
  design = {},
  className = '',
}: QRCodeCustomRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const finalDesign: QRCodeDesign = { ...DEFAULT_QR_DESIGN, ...design };
  const {
    moduleShape,
    cornerStyle,
    borderStyle,
    logoType,
    logoUrl,
    logoSize = 40,
    foregroundColor,
    backgroundColor,
    borderColor = '#000000',
    errorCorrectionLevel,
    isRound = false,
  } = finalDesign;

  useEffect(() => {
    if (!canvasRef.current || !value) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Import QRCode dynamically (Node.js library, but we'll use it in browser via CDN or build)
    // For now, we'll use a workaround with qrcode.react data extraction
    // Or use easyqrcodejs
    import('easyqrcodejs').then((EasyQRCode) => {
      const QRCode = EasyQRCode.default || EasyQRCode;
      
      // Clear canvas
      ctx.clearRect(0, 0, size, size);
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, size, size);

      // Configure QR code options
      const options = {
        text: value,
        width: size,
        height: size,
        colorDark: foregroundColor,
        colorLight: backgroundColor,
        correctLevel: QRCode.CorrectLevel[errorCorrectionLevel],
        dotScale: moduleShape === 'rounded' ? 0.9 : moduleShape === 'extra_rounded' ? 0.8 : 1.0,
        // Module shape
        dotType: 
          moduleShape === 'dots' ? 'round' :
          moduleShape === 'rounded' ? 'rect' :
          moduleShape === 'extra_rounded' ? 'rect' :
          'square',
        // Corner square style
        cornerSquareType: 
          cornerStyle === 'rounded' ? 'extra-rounded' :
          cornerStyle === 'extra-rounded' ? 'extra-rounded' :
          cornerStyle === 'dot' ? 'dot' :
          'square',
        // Corner dot style
        cornerDotType:
          cornerStyle === 'dot' ? 'dot' :
          cornerStyle === 'rounded' ? 'square' :
          'square',
        // Logo
        logo: logoType !== 'none' ? (logoUrl || '/apparely-rec-logo.png') : undefined,
        logoWidth: logoType !== 'none' ? logoSize : undefined,
        logoHeight: logoType !== 'none' ? logoSize : undefined,
        logoBackgroundColor: '#FFFFFF',
        logoBackgroundTransparent: false,
        // Quiet zone
        quietZone: 0,
        quietZoneColor: backgroundColor,
        // Background
        backgroundImage: undefined,
        backgroundImageAlpha: 1,
        autoColor: false,
      };

      // Create QR code instance
      const qrcode = new QRCode(canvas, options);

      // Apply round mask if needed
      if (isRound && containerRef.current) {
        containerRef.current.style.borderRadius = '50%';
        containerRef.current.style.overflow = 'hidden';
        canvas.style.borderRadius = '50%';
      }

      // Apply border style
      if (borderStyle !== 'none' && containerRef.current) {
        const borderWidth = 4;
        containerRef.current.style.border = `${borderWidth}px solid ${borderColor}`;
        if (borderStyle === 'rounded') {
          containerRef.current.style.borderRadius = '12px';
        } else if (borderStyle === 'circle') {
          containerRef.current.style.borderRadius = '50%';
        }
      }
    }).catch((err) => {
      console.error('Failed to load EasyQRCode:', err);
      // Fallback: render basic QR code
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = foregroundColor;
      ctx.font = '12px Arial';
      ctx.fillText('QR Code', size / 2 - 30, size / 2);
    });
  }, [value, size, moduleShape, cornerStyle, borderStyle, logoType, logoUrl, logoSize, foregroundColor, backgroundColor, borderColor, errorCorrectionLevel, isRound]);

  const getLogoSource = () => {
    if (logoType === 'upload' && logoUrl) {
      return logoUrl;
    }
    if (logoType === 'none') {
      return null;
    }
    return '/apparely-rec-logo.png';
  };

  const logoSource = getLogoSource();

  return (
    <div
      ref={containerRef}
      className={`relative inline-block ${className}`}
      style={{
        width: size,
        height: size,
        position: 'relative',
      }}
    >
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
        }}
      />
      {logoSource && logoType === 'upload' && (
        <div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg p-1.5 pointer-events-none"
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
  );
}

