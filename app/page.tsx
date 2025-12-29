'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import { parseExcelFile, Product } from '@/lib/excelParser';
import ProductList from '@/components/ProductList';
import { saveProductsToSupabase, getProductsFromSupabase } from '@/lib/supabase/products';
import AppBrand from '@/components/AppBrand';
import { ENCODING_OPTIONS, EncodingType } from '@/lib/encodingOptions';
import QRCodeDashboard from '@/components/QRCodeDashboard';

type ViewMode = 'menu' | 'encoding' | 'custom' | 'default' | 'qr';

export default function Home() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>('menu');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [encodingType, setEncodingType] = useState<EncodingType | null>(null);
  const [pendingViewMode, setPendingViewMode] = useState<ViewMode | null>(null);

  // Load products from Supabase on mount
  useEffect(() => {
    loadProductsFromDatabase();
  }, []);

  useEffect(() => {
    // Only require encoding selection for default mode
    // Custom mode can work without encoding initially (user can configure it later)
    if (viewMode === 'default' && encodingType === null) {
      if (pendingViewMode !== viewMode) {
        setPendingViewMode(viewMode);
      }
      setViewMode('encoding');
    }
  }, [viewMode, encodingType, pendingViewMode]);

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
    const encodingKey: EncodingType = encodingType ?? 'code128';
    const encodingMeta = ENCODING_OPTIONS[encodingKey];
    const workbook = XLSX.utils.book_new();

    const templateHeader = ['Barcode Numbers', 'Brand', '', 'Description', '', 'Price (R)', '', '', '', '', '', '', ''];
    const blankRow = new Array(templateHeader.length).fill('');
    const templateData = [templateHeader];

    for (let i = 0; i < 100; i++) {
      templateData.push([...blankRow]);
    }

    const templateSheet = XLSX.utils.aoa_to_sheet(templateData);
    templateSheet['!cols'] = [
      { wch: 20 }, // Column A: Barcode Numbers
      { wch: 20 }, // Column B: Brand
      { wch: 3 },  // Column C: (empty)
      { wch: 35 }, // Column D: Description
      { wch: 3 },  // Column E: (empty)
      { wch: 12 }, // Column F: Price (R)
      { wch: 3 },  // Column G onwards: (empty)
      { wch: 3 },
      { wch: 3 },
      { wch: 3 },
      { wch: 3 },
      { wch: 3 },
      { wch: 3 },
    ];

    const instructionsData = [
      ['How to use this template'],
      ...encodingMeta.instructions.map((line) => [line]),
    ];

    const instructionsSheet = XLSX.utils.aoa_to_sheet(instructionsData);
    instructionsSheet['!cols'] = [{ wch: 110 }];

    XLSX.utils.book_append_sheet(workbook, templateSheet, 'Template');
    XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions');

    XLSX.writeFile(workbook, encodingMeta.templateFileName);
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

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    router.push('/login');
  };

  const handleEncodingSelect = (type: EncodingType) => {
    setEncodingType(type);
    const nextView = pendingViewMode ?? 'default';
    setViewMode(nextView);
    setPendingViewMode(null);
  };

  const handleBackToMenu = () => {
    setViewMode('menu');
    setProducts([]);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setPendingViewMode(null);
  };

  // Menu Selector View
  if (viewMode === 'menu') {
    return (
      <main className="min-h-screen p-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:gap-8">
              <AppBrand />
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-gray-800 rounded-lg shadow-sm hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-700"
            >
              Sign Out
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-md p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2 text-center">
              CUSTOM MARKET BARCODE GENERATOR
            </h1>
            <p className="text-gray-600 text-center mb-8">
              Choose how you want to create your barcode labels
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 mt-8">
              {/* Option 1: Custom Barcode Creation */}
              <button
                onClick={() => {
                  setPendingViewMode('custom');
                  setViewMode('encoding');
                }}
                className="group relative flex h-full flex-col justify-between p-8 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border-2 border-blue-200 hover:border-blue-400 transition-all hover:shadow-lg text-left"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl group-hover:bg-blue-700 transition-colors">
                    1
                  </div>
                  <div className="flex-1 space-y-3 min-w-0">
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">
                      Custom Barcode Creation
                    </h2>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      Start with a blank custom template. Configure all label specifications including margins, pitches, dimensions, and layout from scratch.
                    </p>
                  </div>
                </div>
                <div className="mt-4 text-blue-600 font-medium text-sm group-hover:text-blue-700">
                  Get Started →
                </div>
              </button>

              {/* Option 2: Customize from Default Template */}
              <button
                onClick={() => {
                  setPendingViewMode('default');
                  setViewMode('encoding');
                }}
                className="group relative flex h-full flex-col justify-between p-8 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border-2 border-green-200 hover:border-green-400 transition-all hover:shadow-lg text-left"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center text-white font-bold text-xl group-hover:bg-green-700 transition-colors">
                    2
                  </div>
                  <div className="flex-1 space-y-3 min-w-0">
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">
                      Customize from Default Template
                    </h2>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      Upload your Excel file and choose from pre-configured label templates (2 UP, 4 UP, 6 UP, 10 UP, 18 UP, 32 UP, 45 UP, 65 UP) or customize an existing template.
                    </p>
                  </div>
                </div>
                <div className="mt-4 text-green-600 font-medium text-sm group-hover:text-green-700">
                  Get Started →
                </div>
              </button>

              {/* Option 3: QR Code Generator */}
              <button
                onClick={() => {
                  setViewMode('qr');
                  setEncodingType(null);
                  setPendingViewMode(null);
                }}
                className="group relative flex h-full flex-col justify-between p-8 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border-2 border-purple-200 hover:border-purple-400 transition-all hover:shadow-lg text-left"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-xl group-hover:bg-purple-700 transition-colors">
                    3
                  </div>
                  <div className="flex-1 space-y-3 min-w-0">
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">
                      QR Code Generator
                    </h2>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      Create printable QR codes for product packaging, store signage, and marketing campaigns. Configure content, styling, and export options.
                    </p>
                  </div>
                </div>
                <div className="mt-4 text-purple-600 font-medium text-sm group-hover:text-purple-700">
                  Explore QR Tools →
                </div>
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (viewMode === 'qr') {
    return (
      <main className="min-h-screen p-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:gap-8">
              <AppBrand />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleBackToMenu}
                className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Back to Menu
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-gray-800 rounded-lg shadow-sm hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-700"
              >
                Sign Out
              </button>
            </div>
          </div>

          <QRCodeDashboard />
        </div>
      </main>
    );
  }

  if (viewMode === 'encoding') {
    const nextLabel =
      pendingViewMode === 'custom'
        ? 'Custom Barcode Creation'
        : pendingViewMode === 'default'
        ? 'Default Template Workflow'
        : 'Barcode Workflow';
    const encodingCards: Array<{
      key: EncodingType;
      badge: string;
      supporting: string;
    }> = [
      {
        key: 'ean13',
        badge: 'Retail / Takealot',
        supporting: 'Use 13-digit numeric EAN-13 codes—perfect for consumer products scanned at retail or Takealot.',
      },
      {
        key: 'code128',
        badge: 'Flexible / Amazon',
        supporting: 'Use alphanumeric CODE-128 values—ideal for Amazon FBA, warehouse picking, and internal logistics.',
      },
    ];

    return (
      <main className="min-h-screen p-8 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:gap-8">
              <AppBrand />
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-gray-800 rounded-lg shadow-sm hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-700"
            >
              Sign Out
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Choose Your Barcode Type</h2>
            <p className="text-gray-600 text-center mb-6">
              Select the encoding that matches your retail or logistics requirements. You can switch encodings at any time.
            </p>
            <p className="text-sm text-center text-blue-600 mb-8">Next step: {nextLabel}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {encodingCards.map((option) => {
                const optionMeta = ENCODING_OPTIONS[option.key];
                const isSelected = encodingType === option.key;
                return (
                  <button
                    key={option.key}
                    onClick={() => handleEncodingSelect(option.key)}
                    className={`group relative p-6 rounded-lg border-2 transition-all text-left ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 shadow-lg'
                        : 'border-gray-200 bg-white hover:border-blue-400 hover:shadow-lg'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg group-hover:bg-blue-700 transition-colors">
                        {optionMeta.label.split('-')[1]}
                      </div>
                      <div className="flex-1">
                        <span className="inline-flex items-center rounded-full bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 mb-2">
                          {option.badge}
                        </span>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">{optionMeta.label}</h3>
                        <p className="text-gray-600 text-sm mb-2">{optionMeta.description}</p>
                        <p className="text-gray-500 text-sm">{option.supporting}</p>
                      </div>
                    </div>
                    {isSelected && (
                      <span className="absolute top-3 right-3 text-xs font-semibold text-blue-600">Currently selected</span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={handleBackToMenu}
                className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Back to Menu
              </button>
              {encodingType && (
                <button
                  type="button"
                  onClick={() => handleEncodingSelect(encodingType)}
                  className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Continue with {ENCODING_OPTIONS[encodingType].label}
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    );
  }

  const effectiveEncoding: EncodingType = encodingType ?? 'code128';
  const encodingMeta = ENCODING_OPTIONS[effectiveEncoding];

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:gap-8">
            <AppBrand />
            {viewMode === 'default' && (
              <p className="max-w-xl text-gray-600">
                Upload your Excel price list to generate barcode labels that align with your desired barcode template
                layout and keep your retail displays consistent.
              </p>
            )}
            {viewMode === 'custom' && (
              <p className="max-w-xl text-gray-600">
                Configure your custom label template with precise specifications for margins, pitches, dimensions, and layout.
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleBackToMenu}
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Back to Menu
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-gray-800 rounded-lg shadow-sm hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-700"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* File Upload Section - Required for default mode, optional for custom mode */}
        {viewMode === 'default' && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="mb-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <label
                  htmlFor="excel-upload"
                  className="block text-sm font-medium text-gray-700"
                >
                  Upload Excel File ({encodingMeta.templateFileName})
                </label>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                >
                  Download {encodingMeta.label} Import Template
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
        )}
        
        {/* Optional File Upload Section for Custom Mode - Show after template is configured */}
        {viewMode === 'custom' && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6 border-2 border-dashed border-gray-300">
            <div className="mb-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <label
                    htmlFor="excel-upload-custom"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Optional: Upload Excel File
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    You can upload an Excel file with barcode data, or manually enter barcode numbers after configuring your template.
                  </p>
                </div>
                {encodingType && (
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                  >
                    Download {ENCODING_OPTIONS[encodingType].label} Import Template
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                id="excel-upload-custom"
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
        )}

        {/* Products Display - Only for default mode */}
        {viewMode === 'default' && products.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <ProductList
              products={products}
              initialTemplateId={undefined}
              encodingType={effectiveEncoding}
              onChangeEncoding={() => {
                setPendingViewMode('default');
                setViewMode('encoding');
              }}
            />
          </div>
        )}

        {/* Custom Template View - Show ProductList with custom template selected (with or without products) */}
        {viewMode === 'custom' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <ProductList
              products={products}
              initialTemplateId="custom"
              encodingType={encodingType ?? null}
              onChangeEncoding={() => {
                setPendingViewMode('custom');
                setViewMode('encoding');
              }}
              onAddProducts={(newProducts) => {
                setProducts([...products, ...newProducts]);
                // Save to database
                saveProductsToDatabase([...products, ...newProducts]);
              }}
              onDeleteProducts={(indices) => {
                // Sort indices in descending order to delete from end to start
                const sortedIndices = [...indices].sort((a, b) => b - a);
                const newProducts = [...products];
                sortedIndices.forEach(idx => {
                  newProducts.splice(idx, 1);
                });
                setProducts(newProducts);
                // Save to database
                saveProductsToDatabase(newProducts);
              }}
            />
          </div>
        )}

        {/* Instructions - Only show for default mode */}
        {viewMode === 'default' && products.length === 0 && !loading && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              Instructions
            </h3>
            <ul className="list-disc list-inside space-y-1 text-blue-800">
              <li>Upload your Excel file ({encodingMeta.templateFileName})</li>
              <li>The system will automatically detect product codes, descriptions, and prices</li>
              <li>Barcodes will be generated for each product</li>
              <li>Labels will match your selected barcode template layout</li>
              <li>Click &quot;Print/Export PDF&quot; to generate printable labels</li>
            </ul>
          </div>
        )}
      </div>
    </main>
  );
}

