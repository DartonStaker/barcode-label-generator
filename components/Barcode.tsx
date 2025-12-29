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
        // Clear the SVG before re-rendering to ensure fresh barcode
        if (barcodeRef.current) {
          barcodeRef.current.innerHTML = '';
        }
        
        // For EAN-13, ensure proper formatting with spacing
        const options: any = {
          format: format,
          width: width,
          height: height,
          displayValue: displayValue,
          margin: 0,
          fontSize: 12,
        };
        
        // EAN-13 specific options for proper number display
        if (format === 'EAN13' && displayValue) {
          options.fontSize = 14;
          options.textMargin = 2;
          // JsBarcode automatically formats EAN-13 as: "9 902262 949558"
        }
        
        JsBarcode(barcodeRef.current, value, options);
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

