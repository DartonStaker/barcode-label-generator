"use client";

import Image from 'next/image';
import { useState } from 'react';

type AppBrandProps = {
  className?: string;
  hideTagline?: boolean;
  align?: 'left' | 'center';
};

const LOGO_SOURCES = [
  'https://kfshsanphhemwvlgmoyk.supabase.co/storage/v1/object/public/Images/Apparely-rec-logo.png',
  '/apparely-rec-logo.png',
  '/apparely-logo.svg',
];

export default function AppBrand({ className = '', hideTagline = false, align = 'left' }: AppBrandProps) {
  const alignmentClasses = align === 'center' ? 'items-center text-center' : 'items-start text-left';
  const [logoIndex, setLogoIndex] = useState(0);
  const logoSrc = LOGO_SOURCES[Math.min(logoIndex, LOGO_SOURCES.length - 1)];

  const handleLogoError = () => {
    setLogoIndex((currentIndex) => {
      const nextIndex = currentIndex + 1;
      return nextIndex < LOGO_SOURCES.length ? nextIndex : currentIndex;
    });
  };

  return (
    <div className={`flex flex-col gap-3 ${alignmentClasses} ${className}`}>
      <div className="relative w-56 h-20 sm:w-64 sm:h-24">
        <Image
          src={logoSrc}
          alt="Apparely logo"
          fill
          priority
          sizes="(max-width: 640px) 14rem, 16rem"
          className="object-contain"
          onError={handleLogoError}
        />
      </div>
      {!hideTagline && (
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-rose-700 sm:text-sm">
          Custom Market Barcode Generator
        </p>
      )}
    </div>
  );
}

