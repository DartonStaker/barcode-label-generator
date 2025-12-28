'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { QRCodeDesign, DEFAULT_QR_DESIGN } from '@/lib/qrCode';
import { QRCode } from 'react-qrcode-logo';

interface QRCodeAdvancedProps {
  value: string;
  size?: number;
  design?: Partial<QRCodeDesign>;
  className?: string;
}

export default function QRCodeAdvanced({
  value,
  size = 200,
  design = {},
  className = '',
}: QRCodeAdvancedProps) {
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
    frameStyle,
  } = finalDesign;

  useEffect(() => {
    if (!containerRef.current) return;

    // Apply round mask if needed - creates circular QR with rounded outer space
    if (isRound) {
      containerRef.current.style.borderRadius = '50%';
      containerRef.current.style.overflow = 'hidden';
      containerRef.current.style.clipPath = 'circle(50% at 50% 50%)';
      // Add padding to create rounded outer space effect
      containerRef.current.style.padding = '8%';
    } else {
      containerRef.current.style.borderRadius = '';
      containerRef.current.style.overflow = '';
      containerRef.current.style.clipPath = '';
      containerRef.current.style.padding = '0';
    }

    // Apply border style
    if (borderStyle !== 'none') {
      const borderWidth = 4;
      containerRef.current.style.border = `${borderWidth}px solid ${borderColor}`;
      if (borderStyle === 'rounded') {
        containerRef.current.style.borderRadius = '12px';
      } else if (borderStyle === 'circle') {
        containerRef.current.style.borderRadius = '50%';
      } else {
        containerRef.current.style.borderRadius = '0';
      }
    } else {
      containerRef.current.style.border = '';
      if (!isRound) {
        containerRef.current.style.borderRadius = '';
      }
    }
  }, [isRound, borderStyle, borderColor]);

  const getLogoSource = () => {
    if (logoType === 'upload' && logoUrl) {
      return logoUrl;
    }
    if (logoType === 'none') {
      return undefined;
    }
    return '/apparely-rec-logo.png';
  };

  const getQRStyle = () => {
    // react-qrcode-logo supports: 'squares' | 'dots'
    switch (moduleShape) {
      case 'dots':
        return 'dots';
      case 'rounded':
      case 'extra_rounded':
      case 'organic':
      case 'classy':
      case 'classy-rounded':
      case 'smooth':
      case 'square':
      default:
        return 'squares';
    }
  };

  const getEyeRadius = (): [[number, number, number, number], [number, number, number, number], [number, number, number, number]] | undefined => {
    switch (cornerStyle) {
      case 'rounded':
        return [[10, 10, 0, 10], [10, 10, 10, 0], [10, 0, 10, 10]];
      case 'extra-rounded':
        return [[15, 15, 0, 15], [15, 15, 15, 0], [15, 0, 15, 15]];
      case 'dot':
        return [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
      default:
        return undefined;
    }
  };

  const logoSource = getLogoSource();
  const needsTextBanner = frameStyle === 'scan_me' || frameStyle === 'scan_me_simple' || frameStyle === 'scan_me_qr' || frameStyle === 'scan_me_menu';
  const eyeRadius = getEyeRadius();

  return (
    <div
      ref={containerRef}
      className={`relative inline-block ${className}`}
      style={{
        width: size,
        height: size,
        position: 'relative',
        backgroundColor: backgroundColor,
        borderRadius: isRound ? '50%' : undefined,
        overflow: isRound ? 'hidden' : undefined,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isRound ? '8%' : '0',
      }}
    >
      <div
        style={{
          width: isRound ? '100%' : '100%',
          height: isRound ? '100%' : '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: isRound ? '50%' : undefined,
          overflow: isRound ? 'hidden' : undefined,
        }}
      >
        <QRCode
          value={value}
          size={isRound ? Math.floor(size * 0.84) : size}
          fgColor={foregroundColor}
          bgColor={backgroundColor}
          ecLevel={errorCorrectionLevel}
          qrStyle={getQRStyle()}
          eyeRadius={eyeRadius}
          eyeColor={[
            { outer: foregroundColor, inner: foregroundColor },
            { outer: foregroundColor, inner: foregroundColor },
            { outer: foregroundColor, inner: foregroundColor },
          ]}
          logoImage={logoSource}
          logoWidth={logoSize}
          logoHeight={logoSize}
          logoOpacity={1}
          removeQrCodeBehindLogo={true}
          style={{
            width: '100%',
            height: '100%',
            borderRadius: isRound ? '50%' : undefined,
          }}
        />
      </div>
      {needsTextBanner && (
        <div
          className="absolute top-0 right-0 px-2 py-1 text-xs font-semibold whitespace-nowrap border-2 rounded z-10"
          style={{
            color: foregroundColor,
            borderColor: foregroundColor,
            backgroundColor: backgroundColor,
            transform: 'translate(4px, -4px)',
          }}
        >
          SCAN ME
        </div>
      )}
    </div>
  );
}

