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
  const lastValueRef = useRef<string>('');
  const lastDisplayValueRef = useRef<boolean>(displayValue);

  useEffect(() => {
    // Regenerate if value changed OR displayValue changed
    const valueChanged = value !== lastValueRef.current;
    const displayValueChanged = displayValue !== lastDisplayValueRef.current;
    
    if (barcodeRef.current && value && (valueChanged || displayValueChanged)) {
      try {
        // Clear the SVG before re-rendering to ensure fresh barcode
        // This is critical to prevent stale barcode data
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
        
        // Generate barcode with the current value
        JsBarcode(barcodeRef.current, value, options);
        lastValueRef.current = value; // Update last value
        lastDisplayValueRef.current = displayValue; // Update last displayValue
        
        // Debug log for EAN-13 to verify value is correct
        if (format === 'EAN13' && (value.length === 13 || value.length === 12)) {
          console.log(`✅ Barcode component generated EAN-13: ${value} (format: ${format}, displayValue: ${displayValue})`);
        }
      } catch (error) {
        console.error('Barcode generation error:', error, { value, format, displayValue });
      }
    } else if (barcodeRef.current && !value) {
      // Clear if no value
      barcodeRef.current.innerHTML = '';
      lastValueRef.current = '';
      lastDisplayValueRef.current = displayValue;
    }
  }, [value, width, height, format, displayValue]);

  if (!value) return null;

  return (
    <div className="barcode-container">
      <svg ref={barcodeRef} className="barcode-svg" />
    </div>
  );
}

