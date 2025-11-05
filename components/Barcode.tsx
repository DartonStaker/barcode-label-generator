'use client';

import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import './Barcode.css';

interface BarcodeProps {
  value: string;
  width?: number;
  height?: number;
  format?: string;
  displayValue?: boolean;
}

export default function Barcode({ 
  value, 
  width = 2, 
  height = 50,
  format = 'CODE128',
  displayValue = true 
}: BarcodeProps) {
  const barcodeRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (barcodeRef.current && value) {
      try {
        JsBarcode(barcodeRef.current, value, {
          format: format,
          width: width,
          height: height,
          displayValue: displayValue,
          margin: 0,
          fontSize: 12,
        });
      } catch (error) {
        console.error('Barcode generation error:', error);
      }
    }
  }, [value, width, height, format, displayValue]);

  if (!value) return null;

  return (
    <div className="barcode-container">
      <svg ref={barcodeRef} className="barcode-svg" />
    </div>
  );
}

