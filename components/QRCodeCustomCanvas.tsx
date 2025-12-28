'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { QRCodeDesign, DEFAULT_QR_DESIGN } from '@/lib/qrCode';
import QRCode from 'qrcode';

interface QRCodeCustomCanvasProps {
  value: string;
  size?: number;
  design?: Partial<QRCodeDesign>;
  className?: string;
}

export default function QRCodeCustomCanvas({
  value,
  size = 200,
  design = {},
  className = '',
}: QRCodeCustomCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const finalDesign: QRCodeDesign = { ...DEFAULT_QR_DESIGN, ...design };
  const {
    moduleShape,
    cornerStyle,
    centerStyle,
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
    if (!canvasRef.current || !value) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Generate QR code using qrcode library to get module data
    try {
      const qrData = QRCode.create(value, {
        errorCorrectionLevel: errorCorrectionLevel,
      });
      
      const modules = qrData.modules;
      const moduleCount = modules.size;
      const moduleSize = size / moduleCount;

      // Clear and fill background
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, size, size);

      // Draw modules with custom shapes
      for (let rowIndex = 0; rowIndex < moduleCount; rowIndex++) {
        for (let colIndex = 0; colIndex < moduleCount; colIndex++) {
          const isDark = modules.get(rowIndex, colIndex);
          if (!isDark) continue;

          const x = colIndex * moduleSize;
          const y = rowIndex * moduleSize;

          ctx.fillStyle = foregroundColor;
          ctx.save();

          // Check if this is a corner module (finder pattern area - 7x7)
          const isCorner = isCornerModule(rowIndex, colIndex, moduleCount);
          // Check if this is center of finder pattern
          const isCenter = isCenterModule(rowIndex, colIndex, moduleCount);

          if (isCenter) {
            drawCenterModule(ctx, x, y, moduleSize, centerStyle);
          } else if (isCorner) {
            drawCornerModule(ctx, x, y, moduleSize, cornerStyle);
          } else {
            drawModule(ctx, x, y, moduleSize, moduleShape);
          }

          ctx.restore();
        }
      }

      // Apply round mask if needed
      if (isRound && containerRef.current) {
        containerRef.current.style.borderRadius = '50%';
        containerRef.current.style.overflow = 'hidden';
      }

      // Apply border style
      if (borderStyle !== 'none' && containerRef.current) {
        const borderWidth = 4;
        containerRef.current.style.border = `${borderWidth}px solid ${borderColor}`;
        if (borderStyle === 'rounded') {
          containerRef.current.style.borderRadius = '12px';
        } else if (borderStyle === 'circle') {
          containerRef.current.style.borderRadius = '50%';
        } else if (borderStyle === 'star') {
          containerRef.current.style.borderRadius = '12px';
        } else if (borderStyle === 'diamond') {
          containerRef.current.style.borderRadius = '0';
        } else if (borderStyle === 'teardrop') {
          containerRef.current.style.borderRadius = '12px';
        } else if (borderStyle === 'square_cutout') {
          containerRef.current.style.borderRadius = '0';
        }
      } else if (containerRef.current) {
        containerRef.current.style.border = '';
      }
    } catch (err) {
      console.error('Failed to generate QR code:', err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, size, moduleShape, cornerStyle, centerStyle, borderStyle, foregroundColor, backgroundColor, borderColor, errorCorrectionLevel, isRound]);

  const isCornerModule = (row: number, col: number, moduleCount: number): boolean => {
    const cornerSize = 7;
    const isTopLeft = row < cornerSize && col < cornerSize;
    const isTopRight = row < cornerSize && col >= moduleCount - cornerSize;
    const isBottomLeft = row >= moduleCount - cornerSize && col < cornerSize;
    return isTopLeft || isTopRight || isBottomLeft;
  };

  const isCenterModule = (row: number, col: number, moduleCount: number): boolean => {
    const cornerSize = 7;
    // Center of finder patterns (the inner 3x3)
    const isTopLeftCenter = row >= 2 && row <= 4 && col >= 2 && col <= 4;
    const isTopRightCenter = row >= 2 && row <= 4 && col >= moduleCount - 5 && col <= moduleCount - 3;
    const isBottomLeftCenter = row >= moduleCount - 5 && row <= moduleCount - 3 && col >= 2 && col <= 4;
    return isTopLeftCenter || isTopRightCenter || isBottomLeftCenter;
  };

  const drawModule = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, shape: string) => {
    switch (shape) {
      case 'dots':
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size / 2.2, 0, 2 * Math.PI);
        ctx.fill();
        break;
      case 'rounded':
        roundRect(ctx, x + size * 0.1, y + size * 0.1, size * 0.8, size * 0.8, size * 0.2);
        ctx.fill();
        break;
      case 'extra_rounded':
        roundRect(ctx, x + size * 0.15, y + size * 0.15, size * 0.7, size * 0.7, size * 0.3);
        ctx.fill();
        break;
      case 'organic':
        drawOrganicShape(ctx, x, y, size);
        break;
      case 'classy':
        drawClassyShape(ctx, x, y, size);
        break;
      case 'classy-rounded':
        drawClassyRoundedShape(ctx, x, y, size);
        break;
      case 'smooth':
        drawSmoothShape(ctx, x, y, size);
        break;
      case 'square':
      default:
        ctx.fillRect(x, y, size, size);
        break;
    }
  };

  const drawCornerModule = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, style: string) => {
    switch (style) {
      case 'dot':
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size / 2.2, 0, 2 * Math.PI);
        ctx.fill();
        break;
      case 'rounded':
        roundRect(ctx, x + size * 0.1, y + size * 0.1, size * 0.8, size * 0.8, size * 0.2);
        ctx.fill();
        break;
      case 'extra-rounded':
        roundRect(ctx, x + size * 0.15, y + size * 0.15, size * 0.7, size * 0.7, size * 0.3);
        ctx.fill();
        break;
      case 'star':
        drawStar(ctx, x + size / 2, y + size / 2, size / 2.5, size / 5, 5);
        ctx.fill();
        break;
      case 'circle':
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size / 2.2, 0, 2 * Math.PI);
        ctx.fill();
        break;
      case 'diamond':
        ctx.beginPath();
        ctx.moveTo(x + size / 2, y);
        ctx.lineTo(x + size, y + size / 2);
        ctx.lineTo(x + size / 2, y + size);
        ctx.lineTo(x, y + size / 2);
        ctx.closePath();
        ctx.fill();
        break;
      case 'plus':
        const plusSize = size * 0.6;
        const plusThickness = size * 0.2;
        ctx.fillRect(x + size / 2 - plusThickness / 2, y + size / 2 - plusSize / 2, plusThickness, plusSize);
        ctx.fillRect(x + size / 2 - plusSize / 2, y + size / 2 - plusThickness / 2, plusSize, plusThickness);
        break;
      case 'square':
      default:
        ctx.fillRect(x, y, size, size);
        break;
    }
  };

  const drawCenterModule = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, style: string) => {
    switch (style) {
      case 'rounded':
        roundRect(ctx, x + size * 0.1, y + size * 0.1, size * 0.8, size * 0.8, size * 0.2);
        ctx.fill();
        break;
      case 'circle':
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size / 2.2, 0, 2 * Math.PI);
        ctx.fill();
        break;
      case 'teardrop':
        drawTeardrop(ctx, x + size / 2, y + size / 2, size / 2);
        ctx.fill();
        break;
      case 'spiky':
        drawSpikyStar(ctx, x + size / 2, y + size / 2, size / 2.5, 8);
        ctx.fill();
        break;
      case 'star':
        drawStar(ctx, x + size / 2, y + size / 2, size / 2.5, size / 5, 5);
        ctx.fill();
        break;
      case 'diamond':
        ctx.beginPath();
        ctx.moveTo(x + size / 2, y);
        ctx.lineTo(x + size, y + size / 2);
        ctx.lineTo(x + size / 2, y + size);
        ctx.lineTo(x, y + size / 2);
        ctx.closePath();
        ctx.fill();
        break;
      case 'plus':
        const plusSize = size * 0.6;
        const plusThickness = size * 0.2;
        ctx.fillRect(x + size / 2 - plusThickness / 2, y + size / 2 - plusSize / 2, plusThickness, plusSize);
        ctx.fillRect(x + size / 2 - plusSize / 2, y + size / 2 - plusThickness / 2, plusSize, plusThickness);
        break;
      case 'square':
      default:
        ctx.fillRect(x, y, size, size);
        break;
    }
  };

  const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) => {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  };

  const drawStar = (ctx: CanvasRenderingContext2D, cx: number, cy: number, outerRadius: number, innerRadius: number, points: number) => {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i * Math.PI) / points;
      const px = cx + Math.cos(angle) * radius;
      const py = cy + Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  };

  const drawSpikyStar = (ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number, points: number) => {
    ctx.beginPath();
    for (let i = 0; i < points; i++) {
      const angle = (i * 2 * Math.PI) / points;
      const px = cx + Math.cos(angle) * radius;
      const py = cy + Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  };

  const drawTeardrop = (ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number) => {
    ctx.beginPath();
    ctx.arc(cx, cy - radius * 0.3, radius * 0.7, 0, 2 * Math.PI);
    ctx.quadraticCurveTo(cx, cy + radius, cx - radius, cy + radius * 0.5);
    ctx.quadraticCurveTo(cx, cy + radius, cx + radius, cy + radius * 0.5);
    ctx.closePath();
  };

  const drawOrganicShape = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
    const centerX = x + size / 2;
    const centerY = y + size / 2;
    const radius = size / 2.5;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const r = radius + (Math.random() * radius * 0.3);
      const px = centerX + Math.cos(angle) * r;
      const py = centerY + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  };

  const drawClassyShape = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
    const padding = size * 0.15;
    ctx.beginPath();
    ctx.moveTo(x + padding, y + padding);
    ctx.lineTo(x + size - padding, y + padding);
    ctx.lineTo(x + size - padding * 0.5, y + size / 2);
    ctx.lineTo(x + size - padding, y + size - padding);
    ctx.lineTo(x + padding, y + size - padding);
    ctx.lineTo(x + padding * 0.5, y + size / 2);
    ctx.closePath();
  };

  const drawClassyRoundedShape = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
    const padding = size * 0.15;
    roundRect(ctx, x + padding, y + padding, size - padding * 2, size - padding * 2, size * 0.15);
  };

  const drawSmoothShape = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
    const centerX = x + size / 2;
    const centerY = y + size / 2;
    const radius = size / 2.3;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.closePath();
  };

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
  const needsTextBanner = frameStyle !== 'none';

  return (
    <div
      ref={containerRef}
      className={`relative inline-block ${className}`}
      style={{
        width: size,
        height: size,
        position: 'relative',
        backgroundColor: backgroundColor,
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
      {logoSource && (
        <div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg p-1.5 pointer-events-none z-10"
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
      {needsTextBanner && (
        <div
          className="absolute px-2 py-1 text-xs font-semibold whitespace-nowrap border-2 rounded z-10"
          style={{
            color: frameStyle.includes('thick') ? '#FFFFFF' : foregroundColor,
            borderColor: foregroundColor,
            backgroundColor: frameStyle.includes('thick') ? foregroundColor : backgroundColor,
            ...getFrameTextPosition(frameStyle, size),
          }}
        >
          SCAN ME
        </div>
      )}
    </div>
  );
}

function getFrameTextPosition(frameStyle: string, size: number): Record<string, string> {
  switch (frameStyle) {
    case 'scan_me_top':
      return { top: '-25px', left: '50%', transform: 'translateX(-50%)' };
    case 'scan_me_bottom':
      return { bottom: '-25px', left: '50%', transform: 'translateX(-50%)' };
    case 'scan_me_banner_top':
      return { top: '-30px', left: '50%', transform: 'translateX(-50%)', borderRadius: '4px 4px 0 0' };
    case 'scan_me_banner_bottom':
      return { bottom: '-30px', left: '50%', transform: 'translateX(-50%)', borderRadius: '0 0 4px 4px' };
    case 'scan_me_thick_top':
      return { top: '0', left: '50%', transform: 'translateX(-50%)', width: '100%', borderRadius: '0' };
    case 'scan_me_thick_bottom':
      return { bottom: '0', left: '50%', transform: 'translateX(-50%)', width: '100%', borderRadius: '0' };
    default:
      return { top: '0', right: '0', transform: 'translate(4px, -4px)' };
  }
}

