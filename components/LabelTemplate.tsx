'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import Barcode from './Barcode';
import { Product } from '@/lib/excelParser';
import { LabelTemplate as LabelTemplateConfig } from '@/lib/labelTemplates';
import { LabelImage, LabelImageUpdate } from '@/lib/labelMedia';
import { Rnd } from 'react-rnd';

interface LabelTemplateProps {
  product?: Product;
  index?: number;
  template?: LabelTemplateConfig;
  imageOverlays?: LabelImage[];
  onSelectLabel?: (labelIndex: number) => void;
  isActive?: boolean;
  onImageChange?: (labelIndex: number, imageId: string, updates: LabelImageUpdate) => void;
  onImageSelect?: (labelIndex: number, imageId: string) => void;
  activeImageId?: string | null;
  allowImageInteraction?: boolean;
  draggingImageId?: string | null;
  onImageDrop?: (labelIndex: number, imageId: string, position: { x: number; y: number }) => void;
}

export default function LabelTemplate({
  product,
  index,
  template,
  imageOverlays,
  onSelectLabel,
  isActive,
  onImageChange,
  onImageSelect,
  activeImageId,
  allowImageInteraction,
  draggingImageId,
  onImageDrop,
}: LabelTemplateProps) {
  const labelIndex = index ?? 0;
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const containerWidth = containerSize.width;
  const containerHeight = containerSize.height;

  const clampValue = useCallback((value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value)), []);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const updateSize = () => {
      setContainerSize({
        width: element.clientWidth,
        height: element.clientHeight,
      });
    };

    updateSize();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(updateSize);
      observer.observe(element);
      return () => observer.disconnect();
    } else {
      window.addEventListener('resize', updateSize);
      return () => window.removeEventListener('resize', updateSize);
    }
  }, []);

  const overlays = useMemo(() => {
    return (imageOverlays ?? []).slice().sort((a, b) => a.zIndex - b.zIndex);
  }, [imageOverlays]);

  const allowInteraction =
    !!allowImageInteraction && !!onImageChange && containerWidth > 0 && containerHeight > 0;

  const overlaysById = useMemo(() => {
    const map = new Map<string, LabelImage>();
    overlays.forEach((overlay) => map.set(overlay.id, overlay));
    return map;
  }, [overlays]);

  const handleOverlayDragStop = useCallback(
    (imageId: string, x: number, y: number) => {
      if (!onImageChange || containerWidth === 0 || containerHeight === 0) return;
      onImageChange(labelIndex, imageId, {
        x: clampValue(x / containerWidth, 0, 1),
        y: clampValue(y / containerHeight, 0, 1),
      });
    },
    [clampValue, containerHeight, containerWidth, labelIndex, onImageChange]
  );

  const handleHandleMouseDown = useCallback(
    (type: 'resize' | 'rotate', imageId: string, overlay: LabelImage, event: ReactMouseEvent) => {
      if (!allowInteraction) return;

      event.preventDefault();
      event.stopPropagation();
      onSelectLabel?.(labelIndex);
      onImageSelect?.(labelIndex, imageId);

      const startX = event.clientX;
      const startY = event.clientY;
      const initialWidth = overlay.width * containerWidth;
      const initialHeight = overlay.height * containerHeight;
      const initialX = overlay.x * containerWidth;
      const initialY = overlay.y * containerHeight;
      const initialRotation = overlay.rotation;
      const centerX = initialX + initialWidth / 2;
      const centerY = initialY + initialHeight / 2;
      const startPointerAngle = Math.atan2(startY - centerY, startX - centerX);

      const handleMouseMove = (moveEvent: MouseEvent) => {
        moveEvent.preventDefault();
        moveEvent.stopPropagation();

        const deltaX = moveEvent.clientX - startX;
        const deltaY = moveEvent.clientY - startY;

        if (type === 'resize') {
          const newWidth = Math.max(initialWidth + deltaX, containerWidth * 0.05);
          const newHeight = Math.max(initialHeight + deltaY, containerHeight * 0.05);
          const maxWidth = containerWidth - initialX;
          const maxHeight = containerHeight - initialY;
          const finalWidth = Math.min(newWidth, maxWidth);
          const finalHeight = Math.min(newHeight, maxHeight);

          const widthRatio = finalWidth / containerWidth;
          const heightRatio = finalHeight / containerHeight;

          onImageChange?.(labelIndex, imageId, {
            width: widthRatio,
            height: heightRatio,
          });
        } else if (type === 'rotate') {
          const currentAngle = Math.atan2(moveEvent.clientY - centerY, moveEvent.clientX - centerX);
          const angleDelta = currentAngle - startPointerAngle;
          const angleDeltaDeg = (angleDelta * 180) / Math.PI;
          onImageChange?.(labelIndex, imageId, {
            rotation: ((initialRotation + angleDeltaDeg) % 360 + 360) % 360,
          });
        }
      };

      const handleMouseUp = (upEvent: MouseEvent) => {
        upEvent.preventDefault();
        upEvent.stopPropagation();

        document.removeEventListener('mousemove', handleMouseMove, true);
        document.removeEventListener('mouseup', handleMouseUp, true);
      };

      document.addEventListener('mousemove', handleMouseMove, true);
      document.addEventListener('mouseup', handleMouseUp, true);
    },
    [
      allowInteraction,
      containerHeight,
      containerWidth,
      labelIndex,
      onImageChange,
      onImageSelect,
      onSelectLabel,
    ]
  );

  const handleOverlayResizeStop = useCallback(
    (imageId: string, element: HTMLElement, position: { x: number; y: number }) => {
      if (!onImageChange || containerWidth === 0 || containerHeight === 0) return;
      onImageChange(labelIndex, imageId, {
        width: clampValue(element.offsetWidth / containerWidth, 0.05, 1),
        height: clampValue(element.offsetHeight / containerHeight, 0.05, 1),
        x: clampValue(position.x / containerWidth, 0, 1),
        y: clampValue(position.y / containerHeight, 0, 1),
      });
    },
    [clampValue, containerHeight, containerWidth, labelIndex, onImageChange]
  );

  const handleOverlayMouseDown = useCallback(
    (_event: ReactMouseEvent, imageId: string) => {
      onSelectLabel?.(labelIndex);
      onImageSelect?.(labelIndex, imageId);
    },
    [labelIndex, onImageSelect, onSelectLabel]
  );

  const handleLabelMouseDown = useCallback(() => {
    onSelectLabel?.(labelIndex);
  }, [labelIndex, onSelectLabel]);

  const extractDraggedImageId = useCallback(
    (event: React.DragEvent<HTMLDivElement>): string | null => {
      const json = event.dataTransfer.getData('application/json');
      if (json) {
        try {
          const parsed = JSON.parse(json);
          if (parsed && typeof parsed.imageId === 'string') {
            return parsed.imageId;
          }
        } catch (error) {
          console.warn('Failed to parse drag data:', error);
        }
      }
      return draggingImageId ?? null;
    },
    [draggingImageId]
  );

  const handleLabelDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      const imageId = extractDraggedImageId(event);
      if (!imageId || !overlaysById.has(imageId)) {
        return;
      }
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
    },
    [extractDraggedImageId, overlaysById]
  );

  const handleLabelDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      const imageId = extractDraggedImageId(event);
      if (!imageId || !onImageDrop) {
        return;
      }

      const overlay = overlaysById.get(imageId);
      if (!overlay) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const currentTarget = event.currentTarget as HTMLDivElement;
      const rect = currentTarget.getBoundingClientRect();
      const relativeX = clampValue((event.clientX - rect.left) / rect.width, 0, 1);
      const relativeY = clampValue((event.clientY - rect.top) / rect.height, 0, 1);
      const maxX = Math.max(0, 1 - overlay.width);
      const maxY = Math.max(0, 1 - overlay.height);
      const newX = clampValue(relativeX - overlay.width / 2, 0, maxX);
      const newY = clampValue(relativeY - overlay.height / 2, 0, maxY);

      onImageDrop(labelIndex, imageId, { x: newX, y: newY });
      onSelectLabel?.(labelIndex);
      onImageSelect?.(labelIndex, imageId);
    },
    [clampValue, extractDraggedImageId, labelIndex, onImageDrop, onImageSelect, onSelectLabel, overlaysById]
  );

  if ((labelIndex === 0 || labelIndex === 10) && product) {
    console.log(`🔍 LabelTemplate [index ${labelIndex}] - Product data:`, {
      hasProduct: !!product,
      productKeys: Object.keys(product),
      product: product,
    });
  }

  if (labelIndex === 0 || labelIndex === 10) {
    console.log(`✅ LabelTemplate [index ${labelIndex}] IS RENDERING`);
  }
  
  // Extract product information - handle different column name variations
  // Check in order: normalized keys, original keys, then all product keys
  const code =
    product?.code ||
    product?.Code ||
    product?.CODE ||
    product?.SKU ||
    product?.['Barcode Numbers'] ||
    product?.['Barcode Number'] ||
    product?.['barcodenumbers'] ||
    product?.['barcodenumber'] ||
    (() => {
      if (!product) return '';
      // Search all keys for barcode-like values
      for (const [key, value] of Object.entries(product ?? {})) {
        const keyLower = key.toLowerCase();
        if (
          (keyLower.includes('barcode') || keyLower.includes('code')) &&
          value &&
          String(value).trim() &&
          String(value).length >= 8
        ) {
          return String(value).trim();
        }
      }
      return '';
    })();
  
  const description =
    product?.description ||
    product?.Description ||
    product?.DESCRIPTION ||
    product?.Item ||
    product?.['Product Name'] ||
    product?.['productname'] ||
    product?.['ColumnD'] ||
    product?.['col3'] || // Column D
    (() => {
      if (!product) return '';
      // Search all keys for description-like values
      for (const [key, value] of Object.entries(product ?? {})) {
        if (!value || String(value).trim() === '') continue;

        const keyLower = key.toLowerCase();
        const valueStr = String(value).trim();

        // Skip if it's a barcode (all digits) or price (contains R)
        if (valueStr.match(/^\d+$/) || valueStr.includes('R')) continue;

        // Check if it's a description-like field
        if (
          (keyLower.includes('description') ||
            keyLower.includes('product') ||
            keyLower.includes('name') ||
            keyLower.includes('item') ||
            keyLower.includes('columnd') ||
            keyLower === 'col3') &&
          valueStr.length > 1 &&
          valueStr.length < 50
        ) {
          return valueStr;
        }
      }
      return '';
    })();
  
  // Try to find price in any format - check all possible fields
  let price =
    product?.price ||
    product?.Price ||
    product?.PRICE ||
    product?.['Unit Price'] ||
    product?.['Selling Price'] ||
    product?.['unitprice'] ||
    product?.['sellingprice'] ||
    product?.['ColumnF'] ||
    product?.['col5'] ||
    '';
  
  // Search through all product keys for price-like values (check for R prefix or numeric)
  if ((!price || price === '') && product) {
    for (const [key, value] of Object.entries(product ?? {})) {
      if (!value || value === '' || value === null || value === undefined) continue;
      
      const keyLower = key.toLowerCase();
      const valueStr = String(value);
      
      // Check if it's a price column or contains R/currency
      if (
        keyLower.includes('price') ||
        keyLower.includes('cost') ||
        keyLower.includes('amount') ||
        valueStr.includes('R') ||
        keyLower.includes('columnf') ||
        keyLower === 'col5'
      ) {
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
  for (const [key, value] of Object.entries(product ?? {})) {
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
  const barcodeHeight = isSmallLabel ? 18 : labelHeight < 2 ? 22 : 26;
  const barcodeWidth = isSmallLabel ? 1.05 : 1.2;

  // CRITICAL: Log extracted values to see if data extraction is working
  if (labelIndex === 0 || labelIndex === 10) {
    console.log(`🔍 LabelTemplate [index ${labelIndex}] - Extracted values:`, {
      code: code || 'EMPTY',
      description: description || 'EMPTY',
      price: price || 'EMPTY',
      formattedPrice: formattedPrice || 'EMPTY',
      line1: line1 || 'EMPTY',
      line2: line2 || 'EMPTY'
    });
  }

  const priceDisplay = formattedPrice || '';
  const codeDisplay = code || '';
  const barcodeValue = codeDisplay || '0000000000000';
  
  return (
    <div
      ref={containerRef}
      onMouseDown={handleLabelMouseDown}
      className="label-template bg-white relative"
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: '#FFFFFF',
        margin: 0,
        overflow: 'hidden',
      }}
      data-active={isActive ? 'true' : 'false'}
      data-label-index={labelIndex}
      onDragOver={handleLabelDragOver}
      onDrop={handleLabelDrop}
    >
      <div className="label-dimension-guides" aria-hidden="true">
        <div className="label-dimension-width label-dimension-width-top" />
        <div className="label-dimension-width label-dimension-width-bottom" />
        <div className="label-dimension-height label-dimension-height-left" />
        <div className="label-dimension-height label-dimension-height-right" />
      </div>

      <div
        className={`label-image-layer${allowInteraction ? ' interactive' : ''}`}
      >
        {overlays.map((overlay) => {
          const widthPx = containerWidth * overlay.width;
          const heightPx = containerHeight * overlay.height;
          const xPx = containerWidth * overlay.x;
          const yPx = containerHeight * overlay.y;
          const isSelectedOverlay = activeImageId === overlay.id;
          const minWidth = containerWidth > 0 ? Math.max(containerWidth * 0.05, 8) : 8;
          const minHeight = containerHeight > 0 ? Math.max(containerHeight * 0.05, 8) : 8;

          return (
            <Rnd
              key={overlay.id}
              size={{ width: widthPx, height: heightPx }}
              position={{ x: xPx, y: yPx }}
              bounds="parent"
              disableDragging={!allowInteraction}
              enableResizing={allowInteraction}
              minWidth={minWidth}
              minHeight={minHeight}
              style={{
                zIndex: overlay.zIndex + 10,
                pointerEvents: allowInteraction ? 'auto' : 'none',
              }}
              onDragStart={() => {
                onSelectLabel?.(labelIndex);
                onImageSelect?.(labelIndex, overlay.id);
              }}
              onResizeStart={() => {
                onSelectLabel?.(labelIndex);
                onImageSelect?.(labelIndex, overlay.id);
              }}
              onDragStop={(_, data) => handleOverlayDragStop(overlay.id, data.x, data.y)}
              onResizeStop={(_, __, element, ___, position) => handleOverlayResizeStop(overlay.id, element, position)}
            >
              <div
                className={`label-image-overlay${isSelectedOverlay ? ' is-selected' : ''}`}
                onMouseDown={(event) => handleOverlayMouseDown(event, overlay.id)}
                style={{
                  width: '100%',
                  height: '100%',
                  position: 'relative',
                  transform: `rotate(${overlay.rotation}deg)`,
                  transformOrigin: 'center center',
                  cursor: allowInteraction ? 'move' : 'pointer',
                }}
              >
                <img src={overlay.src} alt="" draggable={false} />

                {allowInteraction && isSelectedOverlay && (
                  <>
                    <button
                      type="button"
                      className="label-image-handle resize"
                      aria-label="Resize image"
                      onMouseDown={(event) => handleHandleMouseDown('resize', overlay.id, overlay, event)}
                      onClick={(event) => event.preventDefault()}
                      style={{
                        right: '-5px',
                        bottom: '-5px',
                      }}
                    />
                    <button
                      type="button"
                      className="label-image-handle rotate"
                      aria-label="Rotate image"
                      onMouseDown={(event) => handleHandleMouseDown('rotate', overlay.id, overlay, event)}
                      onClick={(event) => event.preventDefault()}
                      style={{
                        left: '50%',
                        top: '-20px',
                        transform: 'translateX(-50%)',
                      }}
                    />
                  </>
                )}
              </div>
            </Rnd>
          );
        })}
      </div>

      <div
        className="label-template-content"
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
          color: '#000000', // Default text color to black
          margin: 0,
          position: 'relative',
          zIndex: 2,
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
          {priceDisplay}
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
          {codeDisplay}
        </div>

        {/* 3. Barcode Graphic - Centered, moved down slightly */}
        <div 
          style={{ 
            flexShrink: 0,
            minHeight: 0,
            marginTop: isSmallLabel ? '1px' : '2px', // Move barcode down slightly
            marginBottom: '1px',
            padding: '0',
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {codeDisplay ? (
            <Barcode 
              value={barcodeValue} 
              width={barcodeWidth}
              height={barcodeHeight}
              displayValue={false}
            />
          ) : null}
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
    </div>
  );
}

