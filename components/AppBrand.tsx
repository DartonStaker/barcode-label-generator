"use client";

import Image from 'next/image';
import { useState } from 'react';

type AppBrandProps = {
  className?: string;
  hideTagline?: boolean;
  align?: 'left' | 'center';
};

const PRIMARY_LOGO_SRC =
  'https://kfshsanphhemwvlgmoyk.supabase.co/storage/v1/object/public/Images/Apparely-rec-logo.png';
const FALLBACK_LOGO_SRC = '/apparely-logo.svg';

export default function AppBrand({ className = '', hideTagline = false, align = 'left' }: AppBrandProps) {
  const alignmentClasses = align === 'center' ? 'items-center text-center' : 'items-start text-left';
  const [logoSrc, setLogoSrc] = useState(PRIMARY_LOGO_SRC);

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
          onError={() => {
            if (logoSrc !== FALLBACK_LOGO_SRC) {
              setLogoSrc(FALLBACK_LOGO_SRC);
            }
          }}
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

