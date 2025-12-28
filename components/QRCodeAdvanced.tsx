'use client';

import QRCodeCustomCanvas from './QRCodeCustomCanvas';

interface QRCodeAdvancedProps {
  value: string;
  size?: number;
  design?: Partial<import('@/lib/qrCode').QRCodeDesign>;
  className?: string;
}

export default function QRCodeAdvanced({
  value,
  size = 200,
  design = {},
  className = '',
}: QRCodeAdvancedProps) {
  return <QRCodeCustomCanvas value={value} size={size} design={design} className={className} />;
}

