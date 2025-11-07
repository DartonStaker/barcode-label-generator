'use client';

import Barcode from './Barcode';
import { Product } from '@/lib/excelParser';
import { LabelTemplate as LabelTemplateConfig } from '@/lib/labelTemplates';

interface LabelTemplateProps {
  product: Product;
  index?: number;
  template?: LabelTemplateConfig;
}

export default function LabelTemplate({ product, index, template }: LabelTemplateProps) {
  // Extract ALL available fields from product object
  // Debug: log first product to see structure
  if (index === 0 || index === 10) {
    console.log(`🔍 LabelTemplate [index ${index}] - Product data:`, {
      hasProduct: !!product,
      productKeys: product ? Object.keys(product) : [],
      product: product
    });
  }
  
  // CRITICAL: Check if product is valid
  if (!product) {
    console.error(`❌ LabelTemplate [index ${index}]: No product provided!`);
    return <div style={{ width: '100%', height: '100%', backgroundColor: '#ffcccc', padding: '2px', color: 'black' }}>NO PRODUCT</div>;
  }
  
  // CRITICAL: Test if component is rendering at all
  if (index === 0 || index === 10) {
    console.log(`✅ LabelTemplate [index ${index}] IS RENDERING`);
  }
  
  // Extract product information - handle different column name variations
  // Check in order: normalized keys, original keys, then all product keys
  const code = product.code || product.Code || product.CODE || product.SKU || 
               product['Barcode Numbers'] || product['Barcode Number'] || 
               product['barcodenumbers'] || product['barcodenumber'] || 
               (() => {
                 // Search all keys for barcode-like values
                 for (const [key, value] of Object.entries(product)) {
                   const keyLower = key.toLowerCase();
                   if ((keyLower.includes('barcode') || keyLower.includes('code')) &&
                       value && String(value).trim() && String(value).length >= 8) {
                     return String(value).trim();
                   }
                 }
                 return '';
               })();
  
  const description = product.description || product.Description || product.DESCRIPTION || 
                     product.Item || product['Product Name'] || product['productname'] ||
                     product['ColumnD'] || product['col3'] || // Column D
                     (() => {
                       // Search all keys for description-like values
                       for (const [key, value] of Object.entries(product)) {
                         if (!value || String(value).trim() === '') continue;
                         
                         const keyLower = key.toLowerCase();
                         const valueStr = String(value).trim();
                         
                         // Skip if it's a barcode (all digits) or price (contains R)
                         if (valueStr.match(/^\d+$/) || valueStr.includes('R')) continue;
                         
                         // Check if it's a description-like field
                         if ((keyLower.includes('description') || keyLower.includes('product') || 
                              keyLower.includes('name') || keyLower.includes('item') ||
                              keyLower.includes('columnd') || keyLower === 'col3') &&
                             valueStr.length > 1 && valueStr.length < 50) {
                           return valueStr;
                         }
                       }
                       return '';
                     })();
  
  // Try to find price in any format - check all possible fields
  let price = product.price || product.Price || product.PRICE || 
              product['Unit Price'] || product['Selling Price'] || 
              product['unitprice'] || product['sellingprice'] ||
              product['ColumnF'] || product['col5'] || // Column F
              '';
  
  // Search through all product keys for price-like values (check for R prefix or numeric)
  if (!price || price === '') {
    for (const [key, value] of Object.entries(product)) {
      if (!value || value === '' || value === null || value === undefined) continue;
      
      const keyLower = key.toLowerCase();
      const valueStr = String(value);
      
      // Check if it's a price column or contains R/currency
      if (keyLower.includes('price') || keyLower.includes('cost') || 
          keyLower.includes('amount') || valueStr.includes('R') ||
          keyLower.includes('columnf') || keyLower === 'col5') {
        price = value;
        break;
      }
    }
  }
  
  // Format price - handle R currency format and numbers
  let formattedPrice = '';
  if (price) {
    const priceStr = String(price).trim();
    
    // If it already contains R, clean it up
    if (priceStr.includes('R')) {
      // Extract number from "R65" or "R 65" format
      const numMatch = priceStr.replace(/[^\d.,]/g, '').match(/[\d,]+\.?\d*/);
      if (numMatch) {
        const numValue = parseFloat(numMatch[0].replace(/,/g, ''));
        if (!isNaN(numValue)) {
          formattedPrice = `R ${numValue.toFixed(2)}`;
        } else {
          formattedPrice = priceStr; // Keep original if can't parse
        }
      } else {
        formattedPrice = priceStr;
      }
    } else {
      // Try to parse as number
      const numValue = typeof price === 'number' ? price : parseFloat(priceStr.replace(/[^\d.,]/g, ''));
      if (!isNaN(numValue)) {
        formattedPrice = `R ${numValue.toFixed(2)}`;
      } else {
        formattedPrice = priceStr;
      }
    }
  }

  // Handle description - check for brand names and split descriptions
  // Based on sample: "delish" on line 1, "O/selection" on line 2
  let line1 = ''; // Brand name (delish)
  let line2 = ''; // Product description (O/selection)
  
  // Check ALL product fields for brand names like "delish"
  let brandName = '';
  for (const [key, value] of Object.entries(product)) {
    const keyLower = key.toLowerCase();
    const valueStr = String(value || '').toLowerCase().trim();
    
    // Look for "delish" specifically or brand column
    if (keyLower.includes('brand') || 
        valueStr === 'delish' || 
        (keyLower.includes('delish') && valueStr)) {
      brandName = String(value || '').trim();
      break;
    }
  }
  
  // Handle description - if it contains "/", split it
  if (description && description.includes('/')) {
    // Products like "O/selection" - split at "/"
    const parts = description
      .split('/')
      .map((segment: string) => segment.trim())
      .filter((segment: string) => segment);
    if (parts.length >= 2) {
      // If we have brand, use it; otherwise first part might be brand
      line1 = brandName || '';
      line2 = parts.join('/'); // Keep full "O/selection" format
    } else {
      line1 = brandName || '';
      line2 = description;
    }
  } else {
    // No "/" in description
    line1 = brandName || '';
    line2 = description || '';
  }
  
  // Remove empty line1 if we don't have a brand
  if (!line1 && line2) {
    line1 = '';
  }

  // Use template dimensions or default
  const labelWidth = template?.labelWidth || 6.5;
  const labelHeight = template?.labelHeight || 4;
  
  // Determine if this is a small label (LSA-65 style)
  const isSmallLabel = labelHeight < 1.5 && labelWidth < 2;
  
  // Adjust sizing based on label size - use minimal padding to maximize content area
  // For LSA-65: label is 1.26" x 0.79" - very small, need minimal padding
  // Use even smaller padding to ensure descriptors aren't cut off
  const padding = isSmallLabel ? '0.005in' : labelHeight < 2 ? '0.02in' : '0.04in';
  const fontSize = isSmallLabel ? '5.5pt' : labelHeight < 2 ? '6.5pt' : '7.5pt';
  const priceFontSize = isSmallLabel ? '6.5pt' : labelHeight < 2 ? '7.5pt' : '9pt';
  const codeFontSize = isSmallLabel ? '5.5pt' : labelHeight < 2 ? '6.5pt' : '7.5pt';
  const descFontSize = isSmallLabel ? '5.5pt' : labelHeight < 2 ? '6pt' : '6.5pt';
  // Reduce barcode height significantly for small labels to leave room for description
  // Slightly reduced size and adjusted for better centering
  const barcodeHeight = isSmallLabel ? 16 : labelHeight < 2 ? 20 : 24;
  const barcodeWidth = isSmallLabel ? 0.7 : 0.9;

  // CRITICAL: Log extracted values to see if data extraction is working
  if (index === 0 || index === 10) {
    console.log(`🔍 LabelTemplate [index ${index}] - Extracted values:`, {
      code: code || 'EMPTY',
      description: description || 'EMPTY',
      price: price || 'EMPTY',
      formattedPrice: formattedPrice || 'EMPTY',
      line1: line1 || 'EMPTY',
      line2: line2 || 'EMPTY'
    });
  }
  
  return (
    <div 
      className="label-template bg-white relative"
      style={{
        width: '100%',
        height: '100%',
        padding: padding,
        fontSize: fontSize,
        fontFamily: 'Arial, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        justifyContent: 'flex-start',
        alignItems: 'center',
        textAlign: 'center',
        overflow: 'hidden', // Prevent content from spilling outside label bounds
        backgroundColor: '#FFFFFF', // Ensure white background
        color: '#000000', // Default text color to black
        margin: 0,
      }}
    >
      {/* 1. Price at Top - Left aligned, bold */}
      <div 
        style={{ 
          flexShrink: 0,
          fontSize: priceFontSize,
          lineHeight: '1.0', // Tighter line height
          marginBottom: '0px', // Minimal margin
          fontWeight: 'bold',
          width: '100%',
          textAlign: 'left',
          color: '#000000', // Pure black for maximum contrast
        }}
      >
        {formattedPrice || (index === 0 ? 'NO PRICE' : 'R 0.00')}
      </div>

      {/* 2. Barcode Number below Price - Centered */}
      <div 
        style={{ 
          flexShrink: 0,
          fontSize: codeFontSize,
          lineHeight: '1.0', // Tighter line height
          marginBottom: '1px', // Reduced margin
          width: '100%',
          textAlign: 'center',
          color: '#000000', // Pure black for maximum contrast
        }}
      >
        {code || (index === 0 ? 'NO CODE' : '0000000000000')}
      </div>

      {/* 3. Barcode Graphic - Centered, moved down slightly */}
      <div 
        style={{ 
          flexShrink: 0,
          minHeight: 0,
          marginTop: isSmallLabel ? '2px' : '3px', // Move barcode down slightly
          marginBottom: '1px',
          padding: '0',
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Barcode 
          value={code || '000000'} 
          width={barcodeWidth}
          height={barcodeHeight}
          displayValue={false}
        />
      </div>

      {/* Spacer to push description to bottom - reduced to move description up */}
      <div style={{ flexGrow: 1, minHeight: '1px', maxHeight: isSmallLabel ? '8px' : '12px' }}></div>

      {/* 4. Product Description Line 1 - Below barcode, left aligned, moved up slightly */}
      {line1 && (
        <div 
          style={{ 
            flexShrink: 0,
            fontSize: descFontSize,
            lineHeight: '1.0', // Tighter line height for small labels
            marginTop: isSmallLabel ? '-2px' : '-3px', // Move description up slightly
            marginBottom: line2 ? '0px' : '0',
            width: '100%',
            textAlign: 'left',
            color: '#000000', // Pure black for maximum contrast
            fontWeight: '500', // Slightly bold for better visibility
            wordBreak: 'break-word', // Allow wrapping if needed
            overflowWrap: 'break-word', // Break long words if necessary
          }}
        >
          {line1}
        </div>
      )}

      {/* 5. Product Description Line 2 - Below line 1, left aligned */}
      {line2 && (
        <div 
          style={{ 
            flexShrink: 0,
            fontSize: descFontSize,
            lineHeight: '1.0', // Tighter line height for small labels
            width: '100%',
            textAlign: 'left',
            color: '#000000', // Pure black for maximum contrast
            fontWeight: '500', // Slightly bold for better visibility
            wordBreak: 'break-word', // Allow wrapping if needed
            overflowWrap: 'break-word', // Break long words if necessary
          }}
        >
          {line2}
        </div>
      )}
      
      {/* Fallback: Show description if no line1 or line2 but description exists */}
      {!line1 && !line2 && description && (
        <div 
          style={{ 
            flexShrink: 0,
            fontSize: descFontSize,
            lineHeight: '1.0', // Tighter line height for small labels
            width: '100%',
            textAlign: 'left',
            color: '#000000', // Pure black for maximum contrast
            fontWeight: '500', // Slightly bold for better visibility
            wordBreak: 'break-word', // Allow wrapping if needed
            overflowWrap: 'break-word', // Break long words if necessary
          }}
        >
          {description}
        </div>
      )}
    </div>
  );
}

