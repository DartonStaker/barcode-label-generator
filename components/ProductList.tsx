'use client';

import { useState, useRef, useEffect } from 'react';
import { Product } from '@/lib/excelParser';
import LabelGrid from './LabelGrid';
import { AVAILABLE_TEMPLATES, LabelTemplate as LabelTemplateConfig, getTemplateById, getLabelPosition, calculateLabelPositions } from '@/lib/labelTemplates';
import { useReactToPrint } from 'react-to-print';

interface ProductListProps {
  products: Product[];
}

export default function ProductList({ products }: ProductListProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('lsa-65');
  const [labelsPerPage, setLabelsPerPage] = useState<number | undefined>(undefined);
  const [maxPages, setMaxPages] = useState<number | undefined>(1); // Default to 1 page
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(
    new Set() // Default: all products deselected
  );

  const selectedTemplate = getTemplateById(selectedTemplateId) || AVAILABLE_TEMPLATES[0];
  const maxLabelsPerPage = selectedTemplate.columns * selectedTemplate.rows;
  
  // Calculate effective labels per page early so it can be used in CSS generation
  // Respect user's labelsPerPage setting
  // If labelsPerPage is 0, use 0 (no labels)
  // If labelsPerPage is undefined, use max (all positions)
  // Otherwise use the specified value
  const effectiveLabelsPerPage = labelsPerPage === 0 
    ? 0 
    : Math.min(labelsPerPage ?? maxLabelsPerPage, maxLabelsPerPage);
  
  // Note: We no longer auto-select all products when products array changes
  // Default state is all deselected, user must manually select products
  
  // Filter products based on selection
  const filteredProducts = products.filter((_, index) => selectedProducts.has(index));

  // Generate CSS rules for label positions - separate for screen and print
  // Always generate for the full template grid so every slot has positioning
  const generateLabelCellCSS = () => {
    const screenRules: string[] = [];
    const printRules: string[] = [];
    
    // CRITICAL: Always generate CSS for ALL positions (65 for LSA-65) to ensure full grid is visible
    // This ensures all label cells have proper positioning CSS, even if not all have products
    const positionsToGenerate = maxLabelsPerPage; // Always use max to show full grid
    const usedPositions = calculateLabelPositions(selectedTemplate, positionsToGenerate);
    
    // CRITICAL: Validate that we got the expected number of positions
    if (usedPositions.length !== positionsToGenerate) {
      console.error(`❌ CSS Generation Error: Expected ${positionsToGenerate} positions but got ${usedPositions.length}!`);
    }
    
    // Generate CSS only for positions that are actually being used
    console.log(`=== CSS Generation: Creating rules for ${usedPositions.length} positions ===`);
    for (const pos of usedPositions) {
      const { left, top, width, height } = getLabelPosition(selectedTemplate, pos.row, pos.col);
      const leftPx = left * 96;
      const topPx = top * 96;
      const widthPx = width * 96;
      const heightPx = height * 96;
      
      // Log a few positions to verify calculations
      if (pos.row === 12 || pos.row === 11 || pos.row === 10 || pos.row === 1 || pos.row === 0) {
        console.log(`CSS for row ${pos.row}, col ${pos.col}: left=${leftPx.toFixed(2)}px, top=${topPx.toFixed(2)}px`);
      }
      
      // Screen CSS (pixels for preview) - use class selector for higher specificity
      // Include position: absolute to ensure proper positioning
      screenRules.push(
        `.label-cell-${pos.row}-${pos.col} { position: absolute !important; left: ${leftPx}px !important; top: ${topPx}px !important; width: ${widthPx}px !important; height: ${heightPx}px !important; }`
      );
      
      // Print CSS (inches for accurate printing)
      // Include position: absolute to ensure proper positioning
      printRules.push(
        `.label-cell-${pos.row}-${pos.col} { position: absolute !important; left: ${left}in !important; top: ${top}in !important; width: ${width}in !important; height: ${height}in !important; }`
      );
    }
    console.log(`✅ CSS Generation: Created ${screenRules.length} screen rules and ${printRules.length} print rules`);
    return {
      screen: screenRules.join('\n'),
      print: printRules.join('\n')
    };
  };

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: 'Barcode Labels',
    pageStyle: `
          @page {
            size: A4;
            margin: 0 !important;
            padding: 0 !important;
            marks: none !important;
            bleed: 0 !important;
            crop: none !important;
          }
          @media print {
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            @page {
              size: A4 !important;
              margin: 0 !important;
              padding: 0 !important;
              marks: none !important;
              bleed: 0 !important;
              crop: none !important;
            }
            html {
              margin: 0 !important;
              padding: 0 !important;
              width: ${selectedTemplate.pageWidth}in !important;
              height: ${selectedTemplate.pageHeight}in !important;
              min-width: ${selectedTemplate.pageWidth}in !important;
              min-height: ${selectedTemplate.pageHeight}in !important;
              max-width: ${selectedTemplate.pageWidth}in !important;
              max-height: ${selectedTemplate.pageHeight}in !important;
              overflow: hidden !important;
              position: relative !important;
            }
            body {
              margin: 0 !important;
              padding: 0 !important;
              width: ${selectedTemplate.pageWidth}in !important;
              height: ${selectedTemplate.pageHeight}in !important;
              min-width: ${selectedTemplate.pageWidth}in !important;
              min-height: ${selectedTemplate.pageHeight}in !important;
              max-width: ${selectedTemplate.pageWidth}in !important;
              max-height: ${selectedTemplate.pageHeight}in !important;
              overflow: hidden !important;
              position: relative !important;
              transform: scale(1) !important;
              zoom: 1 !important;
            }
            .labels-container {
              margin: 0 !important;
              padding: 0 !important;
              width: ${selectedTemplate.pageWidth}in !important;
              height: ${selectedTemplate.pageHeight}in !important;
              min-width: ${selectedTemplate.pageWidth}in !important;
              min-height: ${selectedTemplate.pageHeight}in !important;
              max-width: ${selectedTemplate.pageWidth}in !important;
              max-height: ${selectedTemplate.pageHeight}in !important;
              display: block !important;
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              right: auto !important;
              bottom: auto !important;
              transform: none !important;
            }
            .label-grid-container {
              margin: 0 !important;
              padding: 0 !important;
              width: ${selectedTemplate.pageWidth}in !important;
              height: auto !important;
              min-width: ${selectedTemplate.pageWidth}in !important;
              max-width: ${selectedTemplate.pageWidth}in !important;
              display: block !important;
              position: relative !important;
              left: 0 !important;
              top: 0 !important;
            }
            .label-page {
              width: ${selectedTemplate.pageWidth}in !important;
              height: ${selectedTemplate.pageHeight}in !important;
              min-width: ${selectedTemplate.pageWidth}in !important;
              min-height: ${selectedTemplate.pageHeight}in !important;
              max-width: ${selectedTemplate.pageWidth}in !important;
              max-height: ${selectedTemplate.pageHeight}in !important;
              margin: 0 !important;
              padding: 0 !important;
              box-sizing: border-box !important;
              page-break-after: always !important;
              page-break-inside: avoid !important;
              position: relative !important;
              overflow: hidden !important;
              left: 0 !important;
              top: 0 !important;
              right: auto !important;
              bottom: auto !important;
              transform: none !important;
            }
            .label-cell {
              position: absolute !important;
              margin: 0 !important;
              padding: 0 !important;
              box-sizing: border-box !important;
              overflow: hidden !important;
              border: none !important;
            }
            ${generateLabelCellCSS().print}
            .label-template {
              width: 100% !important;
              height: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              box-sizing: border-box !important;
              border: none !important;
            }
          }
    `,
  });

  if (products.length === 0) {
    return null;
  }
  
  // If no products selected or labelsPerPage is 0, don't generate any labels
  // Note: We still continue to calculate values for display, but productsToShow will be empty
  
  // Calculate pages based on how many labels we want to generate
  // If user wants 65 labels per page, we generate 1 page with 65 labels (duplicating products as needed)
  // The number of pages is determined by maxPages, not by unique products
  const actualPages = maxPages !== undefined 
    ? Math.min(maxPages, 100) 
    : (effectiveLabelsPerPage > 0 ? 1 : 0); // Default to 1 page if labels > 0, else 0
  
  // Calculate totalPages for display purposes (how many pages would be needed without duplication)
  // This is informational only - actual generation uses actualPages
  const totalPages = effectiveLabelsPerPage > 0 
    ? Math.ceil(filteredProducts.length / effectiveLabelsPerPage)
    : 0;
  
  // Calculate how many labels to generate based on user's settings
  // This is the total number of label positions to fill (products will be duplicated to fill them)
  const totalLabelsToGenerate = actualPages * effectiveLabelsPerPage;
  
  // Duplicate products to fill the required number of labels
  // Products are mapped to positions in order: bottom-to-top, left-to-right
  // CRITICAL: Each position must have exactly one product, no gaps
  const productsToShow: Product[] = [];
  if (filteredProducts.length > 0 && totalLabelsToGenerate > 0) {
    // CRITICAL: Ensure we generate exactly totalLabelsToGenerate products
    // This fills all label positions, duplicating products as needed
    for (let i = 0; i < totalLabelsToGenerate; i++) {
      const productIndex = i % filteredProducts.length;
      productsToShow.push(filteredProducts[productIndex]);
    }
    
    // CRITICAL: Validate that we generated the correct number
    if (productsToShow.length !== totalLabelsToGenerate) {
      console.error(`❌ CRITICAL: Failed to generate ${totalLabelsToGenerate} products! Only generated ${productsToShow.length}`);
      // Force generate the missing products
      while (productsToShow.length < totalLabelsToGenerate) {
        const productIndex = productsToShow.length % filteredProducts.length;
        productsToShow.push(filteredProducts[productIndex]);
      }
    }
  }
  
  // Debug: Log product generation with detailed info
  console.log(`=== ProductList: Generating labels ===`);
  console.log(`  Selected products: ${filteredProducts.length}`);
  console.log(`  Labels per page (user setting): ${labelsPerPage ?? 'undefined (using max)'}`);
  console.log(`  Max labels per page (template): ${maxLabelsPerPage}`);
  console.log(`  Effective labels per page: ${effectiveLabelsPerPage}`);
  console.log(`  Max pages setting: ${maxPages || 'not set (default 1)'}`);
  console.log(`  Actual pages to generate: ${actualPages}`);
  console.log(`  Total labels to generate: ${totalLabelsToGenerate}`);
  console.log(`  Products array length: ${productsToShow.length}`);
  
  // CRITICAL: Warn if effectiveLabelsPerPage is not what we expect
  if (labelsPerPage === undefined && effectiveLabelsPerPage !== maxLabelsPerPage) {
    console.error(`❌ CRITICAL: labelsPerPage is undefined but effectiveLabelsPerPage (${effectiveLabelsPerPage}) != maxLabelsPerPage (${maxLabelsPerPage})!`);
  }
  if (productsToShow.length !== totalLabelsToGenerate) {
    console.error(`  ❌ ERROR: Products array length (${productsToShow.length}) does not match totalLabelsToGenerate (${totalLabelsToGenerate})!`);
    console.error(`  This means products are NOT being generated correctly!`);
  } else {
    console.log(`  ✅ SUCCESS: Products array matches totalLabelsToGenerate`);
  }
  if (productsToShow.length > 0) {
    console.log(`  First 15 products (indices 0-14):`, productsToShow.slice(0, 15).map((p, i) => `[${i}] ${p.code || p.Code || 'NO CODE'}`));
    console.log(`  Product distribution check:`);
    for (let i = 0; i < Math.min(15, productsToShow.length); i++) {
      const expectedProductIndex = i % filteredProducts.length;
      const actualProduct = productsToShow[i];
      const expectedProduct = filteredProducts[expectedProductIndex];
      if (actualProduct !== expectedProduct) {
        console.error(`  MISMATCH at index ${i}: expected product ${expectedProductIndex}, got different product`);
      }
    }
  }

  const handleSelectAll = () => {
    if (selectedProducts.size === products.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(products.map((_, index) => index)));
    }
  };

  const handleToggleProduct = (index: number) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedProducts(newSelected);
  };

  return (
    <div className="w-full" style={{ width: '100%', maxWidth: 'none', overflow: 'visible' }}>
      {/* Controls */}
      <div className="mb-6 bg-white rounded-lg shadow-md p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Template Selection */}
          <div>
            <label htmlFor="template-select" className="block text-sm font-medium text-gray-700 mb-2">
              Label Template
            </label>
            <select
              id="template-select"
              value={selectedTemplateId}
              onChange={(e) => {
                const newValue = e.target.value;
                setSelectedTemplateId(newValue);
                const template = getTemplateById(newValue);
                if (template) {
                  setLabelsPerPage(undefined); // Reset to max
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white cursor-pointer text-gray-900"
              style={{ color: '#1f2937' }}
            >
              {AVAILABLE_TEMPLATES.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name} ({template.rows}×{template.columns})
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {selectedTemplate.description}
            </p>
          </div>

          {/* Labels Per Page */}
          <div>
            <label htmlFor="labels-per-page" className="block text-sm font-medium text-gray-700 mb-2">
              Labels Per Page (max: {maxLabelsPerPage})
            </label>
            <input
              id="labels-per-page"
              type="number"
              min="1"
              max={maxLabelsPerPage}
              value={labelsPerPage !== undefined ? labelsPerPage : ''}
              onChange={(e) => {
                const inputValue = e.target.value;
                if (inputValue === '') {
                  setLabelsPerPage(undefined);
                } else {
                  const value = parseInt(inputValue, 10);
                  if (!isNaN(value) && value > 0 && value <= maxLabelsPerPage) {
                    setLabelsPerPage(value);
                  }
                }
              }}
              onBlur={(e) => {
                // If empty on blur, ensure it's undefined
                if (e.target.value === '') {
                  setLabelsPerPage(undefined);
                } else {
                  const value = parseInt(e.target.value, 10);
                  if (!isNaN(value) && value > 0 && value <= maxLabelsPerPage) {
                    setLabelsPerPage(value);
                  } else {
                    setLabelsPerPage(undefined);
                  }
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              style={{ color: '#111827' }}
              placeholder={`Max: ${maxLabelsPerPage}`}
            />
            <p className="text-xs text-gray-500 mt-1">
              Leave empty for maximum ({maxLabelsPerPage})
            </p>
          </div>

          {/* Max Pages */}
          <div>
            <label htmlFor="max-pages" className="block text-sm font-medium text-gray-700 mb-2">
              Max Pages (max: 100)
            </label>
            <input
              id="max-pages"
              type="number"
              min="1"
              max={100}
              value={maxPages !== undefined ? maxPages : ''}
              onChange={(e) => {
                const inputValue = e.target.value;
                if (inputValue === '') {
                  setMaxPages(1); // Default to 1
                } else {
                  const value = parseInt(inputValue, 10);
                  if (!isNaN(value) && value > 0 && value <= 100) {
                    setMaxPages(value);
                  }
                }
              }}
              onBlur={(e) => {
                if (e.target.value === '') {
                  setMaxPages(1); // Default to 1
                } else {
                  const value = parseInt(e.target.value, 10);
                  if (!isNaN(value) && value > 0 && value <= 100) {
                    setMaxPages(value);
                  } else {
                    setMaxPages(1); // Default to 1
                  }
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              style={{ color: '#111827' }}
              placeholder="1"
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter 1-100 pages (default: 1)
            </p>
          </div>

          {/* Info */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Preview Info
            </label>
            <div className="text-sm text-gray-600 space-y-1">
              <div>Total Products: <strong>{products.length}</strong></div>
              <div>Selected: <strong>{selectedProducts.size}</strong></div>
              <div>Labels/Page: <strong>{labelsPerPage || maxLabelsPerPage}</strong></div>
              <div>Total Pages: <strong>{totalPages}</strong></div>
              <div>Will Generate: <strong>{actualPages} page{actualPages !== 1 ? 's' : ''}</strong></div>
              <div>Label Size: <strong>{selectedTemplate.labelWidth}" × {selectedTemplate.labelHeight}"</strong></div>
            </div>
          </div>
        </div>
      </div>

      {/* Product Selection */}
      <div className="mb-6 bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <label className="block text-sm font-medium text-gray-700">
            Select Products to Print
          </label>
          <button
            onClick={handleSelectAll}
            className="px-4 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
          >
            {selectedProducts.size === products.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-64 overflow-y-auto">
          {products.map((product, index) => {
            const code = product.code || product.Code || product.CODE || product.SKU || product['Barcode Numbers'] || '';
            const description = product.description || product.Description || product.DESCRIPTION || product.Item || '';
            const isSelected = selectedProducts.has(index);
            
            return (
              <label
                key={index}
                className={`flex items-start p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleToggleProduct(index)}
                  className="mt-1 mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {code || `Product ${index + 1}`}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {description || 'No description'}
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Header with Print Button */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-2xl font-bold">
            {selectedProducts.size} of {products.length} Product{products.length !== 1 ? 's' : ''} Selected
            <span className="text-lg font-normal text-gray-600 ml-2">
              ({actualPages} of {totalPages} page{totalPages !== 1 ? 's' : ''})
            </span>
          </h2>
          <button
            onClick={handlePrint}
            disabled={selectedProducts.size === 0}
            className={`px-6 py-2 rounded-lg transition-colors ${
              selectedProducts.size === 0
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            Print/Export PDF
          </button>
        </div>
            <div className="text-xs text-gray-500 italic">
              💡 <strong>IMPORTANT:</strong> In the print dialog, set margins to "None" (or "Minimum"), scale to "100%" or "Actual size", and disable headers/footers. The browser print preview may show extra margins that won't appear in the actual print/PDF.
            </div>
      </div>

          {/* Label Grid */}
          {selectedProducts.size > 0 && (
            <>
              {/* Inject CSS directly into DOM for both screen and print */}
              {/* Key ensures React re-renders style tag when effectiveLabelsPerPage changes */}
              <style 
                key={`label-css-${effectiveLabelsPerPage}`}
                dangerouslySetInnerHTML={{
                __html: `
                  /* Screen CSS for preview - Base styles */
                  .label-cell {
                    position: absolute !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    box-sizing: border-box !important;
                    overflow: hidden !important;
                    border: none !important;
                  }
                  
                  .label-page {
                    position: relative !important;
                    background-color: white !important;
                    display: block !important;
                  }
                  
                  .label-grid-container {
                    display: flex !important;
                    flex-direction: column !important;
                    align-items: center !important;
                    width: 100% !important;
                  }
                  
                  /* Screen CSS for preview - Position rules */
                  ${generateLabelCellCSS().screen}
                  
                  /* Print CSS */
                  @media print {
                    * {
                      margin: 0 !important;
                      padding: 0 !important;
                    }
                    @page {
                      size: A4 !important;
                      margin: 0 !important;
                      padding: 0 !important;
                      marks: none !important;
                      bleed: 0 !important;
                      crop: none !important;
                    }
                    html, body {
                      margin: 0 !important;
                      padding: 0 !important;
                      width: ${selectedTemplate.pageWidth}in !important;
                      height: ${selectedTemplate.pageHeight}in !important;
                      min-width: ${selectedTemplate.pageWidth}in !important;
                      min-height: ${selectedTemplate.pageHeight}in !important;
                      max-width: ${selectedTemplate.pageWidth}in !important;
                      max-height: ${selectedTemplate.pageHeight}in !important;
                      overflow: hidden !important;
                      position: relative !important;
                    }
                    .labels-container {
                      margin: 0 !important;
                      padding: 0 !important;
                      width: ${selectedTemplate.pageWidth}in !important;
                      height: ${selectedTemplate.pageHeight}in !important;
                      min-width: ${selectedTemplate.pageWidth}in !important;
                      min-height: ${selectedTemplate.pageHeight}in !important;
                      max-width: ${selectedTemplate.pageWidth}in !important;
                      max-height: ${selectedTemplate.pageHeight}in !important;
                      display: block !important;
                      position: absolute !important;
                      left: 0 !important;
                      top: 0 !important;
                      right: auto !important;
                      bottom: auto !important;
                      transform: none !important;
                      border: none !important;
                    }
                    .label-grid-container {
                      margin: 0 !important;
                      padding: 0 !important;
                      width: ${selectedTemplate.pageWidth}in !important;
                      height: auto !important;
                      min-width: ${selectedTemplate.pageWidth}in !important;
                      max-width: ${selectedTemplate.pageWidth}in !important;
                      display: block !important;
                      position: relative !important;
                      left: 0 !important;
                      top: 0 !important;
                      border: none !important;
                    }
                    .label-page {
                      width: ${selectedTemplate.pageWidth}in !important;
                      height: ${selectedTemplate.pageHeight}in !important;
                      min-width: ${selectedTemplate.pageWidth}in !important;
                      min-height: ${selectedTemplate.pageHeight}in !important;
                      max-width: ${selectedTemplate.pageWidth}in !important;
                      max-height: ${selectedTemplate.pageHeight}in !important;
                      margin: 0 !important;
                      padding: 0 !important;
                      box-sizing: border-box !important;
                      page-break-after: always !important;
                      page-break-inside: avoid !important;
                      position: relative !important;
                      overflow: hidden !important;
                      left: 0 !important;
                      top: 0 !important;
                      right: auto !important;
                      bottom: auto !important;
                      transform: none !important;
                      border: none !important;
                    }
                    .label-cell {
                      position: absolute !important;
                      margin: 0 !important;
                      padding: 0 !important;
                      box-sizing: border-box !important;
                      overflow: hidden !important;
                      border: none !important;
                      right: auto !important;
                      bottom: auto !important;
                    }
                    /* Label position rules - must come after base .label-cell to override */
                    ${generateLabelCellCSS().print}
                    .label-template {
                      width: 100% !important;
                      height: 100% !important;
                      margin: 0 !important;
                      padding: 0 !important;
                      box-sizing: border-box !important;
                      border: none !important;
                    }
                  }
                `
              }} />
              <div 
                ref={printRef} 
                className="labels-container"
                style={{ 
                  width: '100%', 
                  maxWidth: 'none',
                  minWidth: '100%',
                  margin: 0, 
                  padding: 0,
                  display: 'block',
                  overflow: 'visible',
                  boxSizing: 'border-box',
                  position: 'relative',
                }}
              >
                <LabelGrid
                  products={productsToShow}
                  template={selectedTemplate}
                  labelsPerPage={effectiveLabelsPerPage}
                  maxPages={maxPages}
                />
              </div>
            </>
          )}

      {selectedProducts.size === 0 && (
        <div className="text-center py-8 text-gray-500">
          Select at least one product to generate labels
        </div>
      )}
    </div>
  );
}

