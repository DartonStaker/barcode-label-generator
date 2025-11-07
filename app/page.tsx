'use client';

import { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { parseExcelFile, Product } from '@/lib/excelParser';
import ProductList from '@/components/ProductList';
import { saveProductsToSupabase, getProductsFromSupabase } from '@/lib/supabase/products';

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load products from Supabase on mount
  useEffect(() => {
    loadProductsFromDatabase();
  }, []);

  const loadProductsFromDatabase = async () => {
    try {
      const savedProducts = await getProductsFromSupabase();
      if (savedProducts.length > 0) {
        setProducts(savedProducts);
      }
    } catch (err) {
      // Silently fail if Supabase is not configured
      console.log('Could not load products from database:', err);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      setError('Please upload a valid Excel file (.xlsx or .xls)');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const parsedProducts = await parseExcelFile(file);
      if (parsedProducts.length === 0) {
        setError('No products found in the Excel file. Please check the file format.');
      } else {
        setProducts(parsedProducts);
        // Save to Supabase (will fail silently if not configured)
        await saveProductsToDatabase(parsedProducts);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to parse Excel file';
      setError(errorMessage);
      console.error('Error parsing Excel:', err);
      console.error('File details:', {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: new Date(file.lastModified)
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    const workbook = XLSX.utils.book_new();

    const templateHeader = ['Barcode Numbers', '', '', 'Description', '', 'Price (R)', '', '', '', '', '', '', ''];
    const blankRow = new Array(templateHeader.length).fill('');
    const templateData = [templateHeader];

    for (let i = 0; i < 100; i++) {
      templateData.push([...blankRow]);
    }

    const templateSheet = XLSX.utils.aoa_to_sheet(templateData);
    templateSheet['!cols'] = [
      { wch: 20 },
      { wch: 3 },
      { wch: 3 },
      { wch: 35 },
      { wch: 3 },
      { wch: 12 },
      { wch: 3 },
      { wch: 3 },
      { wch: 3 },
      { wch: 3 },
      { wch: 3 },
      { wch: 3 },
      { wch: 3 },
    ];

    const instructionsData = [
      ['How to use this template'],
      ['1. Enter each product on a new row starting from row 2.'],
      ['2. Column A (Barcode Numbers): 12-13 digit barcode or product code.'],
      ['3. Column D (Description): Product name or description that appears on the label.'],
      ['4. Column F (Price (R)): Selling price (numbers or values like "R 65.00").'],
      ['5. Leave other columns blank—they are reserved to match the original Summer 2025 Price List layout.'],
      ['6. Save the file and import it using the Upload Excel File control on the main page.'],
    ];

    const instructionsSheet = XLSX.utils.aoa_to_sheet(instructionsData);
    instructionsSheet['!cols'] = [{ wch: 110 }];

    XLSX.utils.book_append_sheet(workbook, templateSheet, 'Template');
    XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions');

    XLSX.writeFile(workbook, 'barcode-import-template.xlsx');
  };

  const saveProductsToDatabase = async (productsToSave: Product[]) => {
    setSaving(true);
    try {
      await saveProductsToSupabase(productsToSave);
    } catch (err) {
      console.error('Failed to save products to database:', err);
      // Don't show error to user - they can still use the app
    } finally {
      setSaving(false);
    }
  };

  const handleClear = () => {
    setProducts([]);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Barcode Label Generator
          </h1>
          <p className="text-gray-600">
            Upload your Excel price list to generate barcode labels matching the LSA-65 template layout
          </p>
        </div>

        {/* File Upload Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="mb-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <label
                htmlFor="excel-upload"
                className="block text-sm font-medium text-gray-700"
              >
                Upload Excel File (barcode-import-template.xlsx)
              </label>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
              >
                Download Import Template
              </button>
            </div>
            <input
              ref={fileInputRef}
              id="excel-upload"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100
                cursor-pointer"
              disabled={loading}
            />
          </div>

          {loading && (
            <div className="text-blue-600 font-medium">Processing file...</div>
          )}

          {saving && (
            <div className="text-green-600 font-medium">Saving to database...</div>
          )}

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {products.length > 0 && (
            <div className="mt-4">
              <button
                onClick={handleClear}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Clear & Upload New File
              </button>
            </div>
          )}
        </div>

        {/* Products Display */}
        {products.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <ProductList products={products} />
          </div>
        )}

        {/* Instructions */}
        {products.length === 0 && !loading && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              Instructions
            </h3>
            <ul className="list-disc list-inside space-y-1 text-blue-800">
              <li>Upload your Excel file (Summer 2025 Price List.xls)</li>
              <li>The system will automatically detect product codes, descriptions, and prices</li>
              <li>Barcodes will be generated for each product</li>
              <li>Labels will match the LSA-65 template layout</li>
              <li>Click "Print/Export PDF" to generate printable labels</li>
            </ul>
          </div>
        )}
      </div>
    </main>
  );
}

