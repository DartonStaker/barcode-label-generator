'use client';

import Barcode from './Barcode';
import { Product } from '@/lib/excelParser';

interface LabelTemplateProps {
  product: Product;
  index?: number;
}

export default function LabelTemplate({ product, index }: LabelTemplateProps) {
  // Extract product information - handle different column name variations
  const code = product.code || product.Code || product.CODE || product.SKU || '';
  const description = product.description || product.Description || product.DESCRIPTION || product.Item || '';
  const price = product.price || product.Price || product.PRICE || product['Unit Price'] || '';
  
  // Format price if it's a number
  const formattedPrice = typeof price === 'number' 
    ? `$${price.toFixed(2)}` 
    : price?.toString() || '';

  return (
    <div 
      className="label-template border-2 border-gray-800 p-4 bg-white relative"
      style={{
        width: '6.5in',
        height: '4in',
        pageBreakAfter: 'always',
        fontSize: '12pt',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      {/* Header Section */}
      <div className="mb-2 border-b-2 border-gray-800 pb-1">
        <div className="text-center font-bold text-lg">
          {description || 'PRODUCT DESCRIPTION'}
        </div>
      </div>

      {/* Barcode Section */}
      <div className="flex justify-center my-4">
        <Barcode 
          value={code || '000000'} 
          width={2}
          height={60}
          displayValue={true}
        />
      </div>

      {/* Product Code */}
      <div className="text-center mb-2">
        <div className="text-sm font-semibold">Code:</div>
        <div className="text-base">{code || 'N/A'}</div>
      </div>

      {/* Price Section */}
      {formattedPrice && (
        <div className="text-center mb-2">
          <div className="text-sm font-semibold">Price:</div>
          <div className="text-lg font-bold">{formattedPrice}</div>
        </div>
      )}

      {/* Additional Details */}
      <div className="mt-4 text-xs text-gray-600">
        {Object.entries(product)
          .filter(([key]) => 
            !['code', 'Code', 'CODE', 'SKU', 'description', 'Description', 'DESCRIPTION', 'Item', 'price', 'Price', 'PRICE', 'Unit Price'].includes(key)
          )
          .slice(0, 3)
          .map(([key, value]) => (
            <div key={key} className="mb-1">
              <span className="font-semibold">{key}:</span> {String(value)}
            </div>
          ))}
      </div>

      {/* Footer - Optional Index */}
      {index !== undefined && (
        <div className="absolute bottom-2 right-2 text-xs text-gray-400">
          #{index + 1}
        </div>
      )}
    </div>
  );
}

