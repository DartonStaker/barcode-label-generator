'use client';

import { Product } from '@/lib/excelParser';
import LabelTemplate from './LabelTemplate';
import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';

interface ProductListProps {
  products: Product[];
}

export default function ProductList({ products }: ProductListProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: 'Barcode Labels',
    pageStyle: `
      @page {
        size: 6.5in 4in;
        margin: 0;
      }
      @media print {
        .label-template {
          page-break-after: always;
          page-break-inside: avoid;
        }
      }
    `,
  });

  if (products.length === 0) {
    return null;
  }

  return (
    <div className="w-full">
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-2xl font-bold">
          {products.length} Product{products.length !== 1 ? 's' : ''} Loaded
        </h2>
        <button
          onClick={handlePrint}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Print/Export PDF
        </button>
      </div>

      <div ref={printRef} className="labels-container">
        {products.map((product, index) => (
          <div key={index} className="mb-4">
            <LabelTemplate product={product} index={index} />
          </div>
        ))}
      </div>
    </div>
  );
}

