'use client';

import { Product } from '@/lib/excelParser';
import LabelTemplate from './LabelTemplate';
import { LabelTemplate as LabelTemplateConfig, calculateLabelPositions, getLabelPosition } from '@/lib/labelTemplates';
import { LabelImage, LabelImageUpdate } from '@/lib/labelMedia';

interface LabelGridProps {
  products: Product[];
  template: LabelTemplateConfig;
  labelsPerPage?: number;
  maxPages?: number;
  applyImagesToAll?: boolean;
  globalImages?: LabelImage[];
  labelImages?: Record<number, LabelImage[]>;
  onLabelClick?: (labelIndex: number) => void;
  activeLabelIndex?: number;
  onImageChange?: (labelIndex: number, imageId: string, updates: LabelImageUpdate) => void;
  onImageSelect?: (labelIndex: number, imageId: string) => void;
  activeImageId?: string | null;
  draggingImageId?: string | null;
  onImageDrop?: (labelIndex: number, imageId: string, position: { x: number; y: number }) => void;
  barcodeFormat?: 'CODE128' | 'EAN13';
}

export default function LabelGrid({
  products,
  template,
  labelsPerPage,
  maxPages,
  applyImagesToAll = true,
  globalImages = [],
  labelImages = {},
  onLabelClick,
  activeLabelIndex,
  onImageChange,
  onImageSelect,
  activeImageId,
  draggingImageId,
  onImageDrop,
  barcodeFormat = 'CODE128',
}: LabelGridProps) {
  // Maximum slots available on a single physical sheet
  const maxLabelsPerPage = template.columns * template.rows;

  // How many labels should actually be populated on each page (user setting, capped at max)
  const labelsToPopulatePerPage = Math.min(labelsPerPage ?? maxLabelsPerPage, maxLabelsPerPage);
  
  // Debug: Log product count
  console.log(`LabelGrid: Received ${products.length} products, labelsPerPage=${labelsPerPage}, populatePerPage=${labelsToPopulatePerPage}, maxLabelsPerPage=${maxLabelsPerPage}`);

  if (labelsToPopulatePerPage <= 0) {
    console.warn('LabelGrid: labelsToPopulatePerPage is 0 or less; nothing to render.');
    return null;
  }
  
  // Split products into pages
  // CRITICAL: Each page should have enough products to fill all label positions
  // If we have fewer products than labels per page, we'll duplicate them later
  const pages: Product[][] = [];
  
  // CRITICAL: Always create at least one page if we have products
  // Even if products.length < maxLabelsPerPage, we'll duplicate products to fill positions
  if (products.length > 0) {
    // If we have enough products for at least one full page, split them
    if (products.length >= labelsToPopulatePerPage) {
      for (let i = 0; i < products.length; i += labelsToPopulatePerPage) {
        const pageProducts = products.slice(i, i + labelsToPopulatePerPage);
        pages.push(pageProducts);
        console.log(`Page ${pages.length - 1}: ${pageProducts.length} products (expected to populate: ${labelsToPopulatePerPage}, max slots: ${maxLabelsPerPage})`);
      }
    } else {
      // We have fewer products than labels per page - create one page with all products
      // Products will be duplicated when mapping to slots if needed
      pages.push([...products]);
      console.log(`Created single page with ${products.length} products (will populate up to ${labelsToPopulatePerPage} of ${maxLabelsPerPage} slots)`);
    }
  }
  
  // CRITICAL: Validate page creation
  if (pages.length === 0 && products.length > 0) {
    console.error(`❌ ERROR: No pages created despite having ${products.length} products!`);
    // Fallback: create a page with all products
    pages.push([...products]);
  }
  
  // Limit pages if maxPages is specified
  const pagesToShow = maxPages !== undefined ? pages.slice(0, maxPages) : pages;
  
  console.log(`Total pages to show: ${pagesToShow.length}`);

  // Convert inches to pixels for preview (96 DPI standard)
  const pageWidthPx = template.pageWidth * 96;
  const pageHeightPx = template.pageHeight * 96;

  return (
    <div 
      className="label-grid-container" 
      style={{ 
        width: '100%', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center',
        margin: 0,
        padding: 0,
      }}
    >
      {pagesToShow.map((pageProducts, pageIndex) => (
        <div
          key={pageIndex}
          className="label-page"
          style={{
            width: `${pageWidthPx}px`,
            height: `${pageHeightPx}px`,
            position: 'relative',
            pageBreakAfter: 'always',
            backgroundColor: 'white',
            margin: '0 auto',
            marginBottom: '20px',
            // CRITICAL: Use 'hidden' to clip labels that extend beyond page bounds
            // But ensure container height is correct so all labels are visible
            overflow: 'hidden',
            border: '2px solid #e5e7eb', // Preview border only - removed in print CSS
            padding: 0,
          }}
        >
          {(() => {
            // Always render ALL physical slots for the grid (e.g. 65 for LSA-65)
            const positionsToCalculate = maxLabelsPerPage;
            const positions = calculateLabelPositions(template, positionsToCalculate);
            
            // CRITICAL: Validate that we got the expected number of positions
            if (positions.length !== positionsToCalculate) {
              console.error(`❌ CRITICAL ERROR: Expected ${positionsToCalculate} positions but got ${positions.length}!`);
              console.error(`  Template: ${template.rows} rows x ${template.columns} cols = ${template.rows * template.columns} max`);
              console.error(`  Requested: ${positionsToCalculate}, Calculated: ${positions.length}`);
            }
            
            // Map products to the first N positions (labelsToPopulatePerPage)
            // Remaining slots render as blank placeholders (empty labels)
            // CRITICAL: Map products to positions by index - position 0 gets product 0, position 1 gets product 1, etc.
            const productsForPositions: (Product | undefined)[] = [];
            const hasProductsOnPage = pageProducts.length > 0;
            for (let i = 0; i < positions.length; i++) {
              if (i < labelsToPopulatePerPage && hasProductsOnPage) {
                const productIndex = i % pageProducts.length;
                const product = pageProducts[productIndex];
                productsForPositions.push(product);
              } else {
                productsForPositions.push(undefined);
              }
            }
            
            // CRITICAL: Log product mapping for first few and boundary positions to detect offset issues
            if (pageIndex === 0) {
              console.log(`=== Product Mapping Debug (${positions.length} slots, populating ${labelsToPopulatePerPage}) ===`);
              for (let i = 0; i < Math.min(positions.length, 15); i++) {
                const pos = positions[i];
                const prod = productsForPositions[i];
                const expectedProdIndex = (i < labelsToPopulatePerPage && pageProducts.length > 0)
                  ? (i % pageProducts.length)
                  : 'N/A';
                console.log(`Slot ${i} (row ${pos.row}, col ${pos.col}):`, {
                  shouldPopulate: i < labelsToPopulatePerPage ? 'YES' : 'NO',
                  expectedProductIndex: expectedProdIndex,
                  productCode: prod ? (prod.code || prod.Code || 'NO CODE') : 'EMPTY',
                });
              }
            }
            
            // CRITICAL: Validate that we have a product for every position
            if (productsForPositions.length !== positions.length) {
              console.error(`❌ CRITICAL ERROR: productsForPositions (${productsForPositions.length}) != positions (${positions.length})`);
            }
            
            // Debug: Log position calculation for troubleshooting
            if (pageIndex === 0) {
              console.log(`=== Position Calculation Debug ===`);
              console.log(`Products (page) count: ${pageProducts.length}`);
              console.log(`Labels requested per page: ${labelsToPopulatePerPage}`);
              console.log(`Total slots per page (template max): ${maxLabelsPerPage}`);
              console.log(`Positions to calculate (max slots): ${positionsToCalculate}`);
              console.log(`Positions calculated: ${positions.length}`);
              if (positions.length > 0) {
                console.log(`First 15 positions:`, positions.slice(0, Math.min(15, positions.length)).map((p, i) => `[${i}] row ${p.row} col ${p.col}`));
                if (positions.length > 10) {
                  console.log(`Last 5 positions:`, positions.slice(-5).map((p, i) => `[${positions.length - 5 + i}] row ${p.row} col ${p.col}`));
                }
              }
            }
            
            // Debug: Log if positions don't match products (this is OK if we're duplicating)
            if (pageIndex === 0) {
              console.log(`ℹ️ Slots vs. requested labels: slots=${positions.length}, requestedForPage=${labelsToPopulatePerPage}, productsReceived=${pageProducts.length}`);
            }
            
            // Map each position to its corresponding product
            // Position 0 → Product 0, Position 1 → Product 1, ..., Position 10 → Product 10 (or duplicated)
            // CRITICAL: Ensure we render ALL positions - no skipping or filtering
            // CRITICAL: The idx parameter is the index in the positions array, which should match productsForPositions[idx]
            const renderedPositions = positions.map((pos, idx) => {
              // Get product for this position (duplicated if needed)
              // CRITICAL: idx must match the index in productsForPositions array
              // Position at index idx should get product at index idx
              const product = productsForPositions[idx];
              
              // Validate mapping is correct
              if (pageIndex === 0 && idx < Math.min(3, labelsToPopulatePerPage) && pageProducts.length > 0) {
                const expectedProdIndex = idx % pageProducts.length;
                const actualProd = pageProducts[expectedProdIndex];
                if (product !== actualProd) {
                  console.error(`❌ MAPPING ERROR at position ${idx}: Expected product at index ${expectedProdIndex}, but got different product!`);
                }
              }
              
              // Debug: Log mapping for row boundaries and position 10 specifically
              if (pageIndex === 0 && idx < labelsToPopulatePerPage && (idx % 5 === 4 || idx % 5 === 0 || idx === 10 || idx === 11)) {
                console.log(`Mapping: Position ${idx} (row ${pos.row}, col ${pos.col}) -> Product:`, product ? 'EXISTS' : 'MISSING', product ? `(${product.code || product.Code || 'NO CODE'})` : '');
              }
              
              // CRITICAL: Verify product exists for every position
              if (!product && idx < labelsToPopulatePerPage) {
                console.error(`❌ CRITICAL: No product for position ${idx} (row ${pos.row}, col ${pos.col})!`);
              }
            
            // Calculate position for this cell - use for inline styles as fallback
            // CSS classes with !important will override, but inline styles ensure positioning works
            const { left, top, width, height } = getLabelPosition(template, pos.row, pos.col);
            
            // Convert inches to pixels for preview (96 DPI standard)
            const leftPx = left * 96;
            const topPx = top * 96;
            const widthPx = width * 96;
            const heightPx = height * 96;
            
            // CRITICAL: Log position 10 specifically with calculated coordinates
            if (pageIndex === 0 && idx === 10) {
              console.log(`🔍 POSITION 10 DEBUG:`, {
                idx,
                row: pos.row,
                col: pos.col,
                hasProduct: !!product,
                productCode: product ? (product.code || product.Code || 'NO CODE') : 'MISSING',
                calculatedPosition: { left, top, width, height },
                pixelPosition: { leftPx, topPx, widthPx, heightPx },
                pageWidthPx: template.pageWidth * 96,
                pageHeightPx: template.pageHeight * 96,
                isWithinBounds: leftPx >= 0 && topPx >= 0 && (leftPx + widthPx) <= (template.pageWidth * 96) && (topPx + heightPx) <= (template.pageHeight * 96)
              });
            }
            
            // CRITICAL DEBUG: Log positions for ALL rows to see where they're being positioned
            // Log first label of each row to see the pattern
            if (pageIndex === 0 && pos.col === 0) {
              const pageWidthPx = template.pageWidth * 96;
              const pageHeightPx = template.pageHeight * 96;
              const isVisible = leftPx >= 0 && topPx >= 0 && (leftPx + widthPx) <= pageWidthPx && (topPx + heightPx) <= pageHeightPx;
              console.log(`📍 Row ${pos.row}, Col ${pos.col} (idx ${idx}):`, {
                product: product ? 'YES' : 'NO',
                top: `${top.toFixed(6)}in (${topPx.toFixed(2)}px)`,
                left: `${left.toFixed(6)}in (${leftPx.toFixed(2)}px)`,
                isVisible: isVisible ? 'YES' : 'NO (CLIPPED)',
                pageHeight: `${pageHeightPx}px`,
                bottomEdge: `${(topPx + heightPx).toFixed(2)}px`,
                isAbovePage: topPx < 0 ? 'YES (ABOVE)' : 'NO',
                isBelowPage: (topPx + heightPx) > pageHeightPx ? 'YES (BELOW)' : 'NO'
              });
            }
            
            // Verify positions are being calculated correctly
            if (pageIndex === 0 && idx === 0) {
              const allPositions = calculateLabelPositions(template, maxLabelsPerPage);
              console.log(`Total label positions calculated: ${allPositions.length} (max slots ${maxLabelsPerPage})`);
              console.log(`Products available for page: ${pageProducts.length}`);
              console.log(`Expected positions: ${maxLabelsPerPage}, Actual positions: ${allPositions.length}`);
              if (allPositions.length !== maxLabelsPerPage) {
                console.error(`❌ ERROR: Positions count (${allPositions.length}) does not match maxLabelsPerPage (${maxLabelsPerPage})!`);
              }
              if (pageProducts.length > 0) {
                console.log(`First 10 products:`, pageProducts.slice(0, 10).map(p => p.code || p.Code || p['Barcode Numbers'] || 'NO CODE'));
                console.log(`First 10 positions:`, allPositions.slice(0, 10).map(p => `row ${p.row}, col ${p.col}`));
                if (allPositions.length > 10) {
                  console.log(`Last 5 positions:`, allPositions.slice(-5).map(p => `row ${p.row}, col ${p.col}`));
                }
              }
            }
            
            // Warn if product is missing for a position (only for first page, limit warnings)
            if (!product && pageIndex === 0 && idx < Math.min(15, labelsToPopulatePerPage)) {
              console.warn(`Missing product for position ${idx} (row ${pos.row}, col ${pos.col})`);
            }
            
            // Log summary at position 0
            if (pageIndex === 0 && idx === 0) {
              console.log(`=== Rendering Summary ===`);
              console.log(`Total positions to render: ${positions.length}`);
              console.log(`Original products: ${pageProducts.length}`);
              console.log(`Products after duplication: ${productsForPositions.length}`);
              console.log(`Labels per page setting: ${labelsPerPage || 'not set (using max)'}`);
              if (positions.length !== productsForPositions.length) {
                console.error(`❌ CRITICAL: Positions (${positions.length}) != Products (${productsForPositions.length})!`);
              }
            }
            
            // CRITICAL: Use stable key based ONLY on physical position (page, row, col)
            // This ensures React correctly identifies each position and keeps components in place
            // When label count changes, React will update props but keep components in correct positions
            const uniqueKey = `p${pageIndex}-r${pos.row}-c${pos.col}`;
            const absoluteIndex = pageIndex * maxLabelsPerPage + idx;
            const isActiveLabel = activeLabelIndex === absoluteIndex;
            const overlayImages = applyImagesToAll ? globalImages : (labelImages[absoluteIndex] ?? []);
            const allowImageInteraction = applyImagesToAll || isActiveLabel;

            if (product && pageIndex === 0 && idx < 3) {
              console.log(`🔍 Product data for position ${idx}:`, {
                hasProduct: !!product,
                productKeys: Object.keys(product),
                code: product.code || product.Code || 'NO CODE',
                description: product.description || product.Description || 'NO DESC',
                price: product.price || product.Price || 'NO PRICE',
                fullProduct: product
              });
            }

            const productId = product
              ? product.code || product.Code || product['Barcode Numbers'] || `prod-${idx}`
              : `empty-${idx}`;

            return (
              <div
                key={uniqueKey}
                className={`label-cell label-cell-${pos.row}-${pos.col}`}
                data-row={pos.row}
                data-col={pos.col}
                data-index={idx}
                onMouseDown={() => onLabelClick?.(absoluteIndex)}
                style={{
                  position: 'absolute',
                  left: `${leftPx}px`,
                  top: `${topPx}px`,
                  width: `${widthPx}px`,
                  height: `${heightPx}px`,
                  boxSizing: 'border-box',
                  overflow: 'hidden',
                  margin: 0,
                  padding: 0,
                  border: 'none',
                  visibility: 'visible',
                  opacity: 1,
                  display: 'block',
                  zIndex: isActiveLabel ? 5 : 1,
                  boxShadow: isActiveLabel ? '0 0 0 2px rgba(59, 130, 246, 0.35)' : 'none',
                  borderRadius: '2px',
                  transition: 'box-shadow 150ms ease',
                } as React.CSSProperties}
              >
                <LabelTemplate
                  key={`label-template-${uniqueKey}-${productId}`}
                  product={product}
                  index={absoluteIndex}
                  template={template}
                  barcodeFormat={barcodeFormat}
                  imageOverlays={overlayImages}
                  onSelectLabel={onLabelClick}
                  isActive={!!isActiveLabel}
                  onImageChange={onImageChange}
                  onImageSelect={onImageSelect}
                  activeImageId={activeImageId}
                  allowImageInteraction={allowImageInteraction}
                  draggingImageId={draggingImageId}
                  onImageDrop={onImageDrop}
                />
              </div>
            );
            });
            
            // CRITICAL: Validate that we're rendering all positions
            if (renderedPositions.length !== positions.length) {
              console.error(`❌ CRITICAL ERROR: Rendered ${renderedPositions.length} positions but calculated ${positions.length}!`);
            }
            
            // Log summary for debugging
            if (pageIndex === 0) {
              console.log(`=== Rendering Summary ===`);
              console.log(`  Positions calculated: ${positions.length}`);
              console.log(`  Positions rendered: ${renderedPositions.length}`);
              console.log(`  Products available: ${productsForPositions.length}`);
              console.log(`  Expected labels: ${positionsToCalculate}`);
              if (renderedPositions.length !== positionsToCalculate) {
                console.error(`  ❌ MISMATCH: Expected ${positionsToCalculate} but rendering ${renderedPositions.length}`);
              }
            }
            
            return renderedPositions;
          })()}
        </div>
      ))}
    </div>
  );
}
