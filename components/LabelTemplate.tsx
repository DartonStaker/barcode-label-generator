'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react';
import Image from 'next/image';
import Barcode from './Barcode';
import { Product } from '@/lib/excelParser';
import { LabelTemplate as LabelTemplateConfig } from '@/lib/labelTemplates';
import { LabelImage, LabelImageUpdate } from '@/lib/labelMedia';
import { FieldLayout, LabelFieldKey, FieldPlacement, DEFAULT_FIELD_LAYOUT } from '@/lib/fieldLayout';
import { Rnd } from 'react-rnd';

interface LabelTemplateProps {
  product?: Product;
  index?: number;
  template?: LabelTemplateConfig;
  barcodeFormat?: 'CODE128' | 'EAN13';
  fieldLayout?: FieldLayout;
  isFieldEditing?: boolean;
  onFieldLayoutChange?: (field: LabelFieldKey, placement: FieldPlacement) => void;
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
  barcodeFormat,
  fieldLayout,
  isFieldEditing = false,
  onFieldLayoutChange,
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
  const format: 'CODE128' | 'EAN13' = barcodeFormat ?? 'CODE128';
  const effectiveFieldLayout = fieldLayout ?? DEFAULT_FIELD_LAYOUT;
  const normalizeRotation = (angle: number) => ((angle % 360) + 360) % 360;

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
  const scaleFontSize = (baseSize: string, scale: number) => {
    const numeric = parseFloat(baseSize);
    if (!Number.isFinite(numeric)) {
      return baseSize;
    }
    const unit = baseSize.replace(`${numeric}`, '').trim() || 'pt';
    const scaled = numeric * scale;
    return `${parseFloat(scaled.toFixed(3))}${unit}`;
  };
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
  const rawCode = (code || '').trim();
  const hasRawCode = rawCode.length > 0;
  let barcodeValue = '';
  if (hasRawCode) {
    if (format === 'EAN13') {
      const digitsOnly = rawCode.replace(/\D/g, '');
      if (digitsOnly.length === 13) {
        barcodeValue = digitsOnly;
      } else if (digitsOnly.length > 0) {
        barcodeValue = digitsOnly.padStart(13, '0').slice(-13);
      }
    } else {
      barcodeValue = rawCode;
    }
  }
  const displayCode = hasRawCode
    ? format === 'EAN13'
      ? barcodeValue || rawCode
      : rawCode
    : '';

  const emitFieldLayoutChange = (field: LabelFieldKey, placement: FieldPlacement) => {
    onFieldLayoutChange?.(field, placement);
  };

  const handleFieldTransform = (
    field: LabelFieldKey,
    xPx: number,
    yPx: number,
    widthPx: number,
    heightPx: number,
    rotationOverride?: number
  ) => {
    if (!onFieldLayoutChange || containerWidth === 0 || containerHeight === 0) return;

    const currentPlacement = effectiveFieldLayout[field] ?? DEFAULT_FIELD_LAYOUT[field];

    let widthFraction = clampValue(widthPx / containerWidth, 0.05, 1);
    let heightFraction = clampValue(heightPx / containerHeight, 0.05, 1);
    let xFraction = clampValue(xPx / containerWidth, 0, 1);
    let yFraction = clampValue(yPx / containerHeight, 0, 1);

    if (xFraction + widthFraction > 1) {
      xFraction = 1 - widthFraction;
    }
    if (yFraction + heightFraction > 1) {
      yFraction = 1 - heightFraction;
    }

    const rotationValue =
      typeof rotationOverride === 'number'
        ? normalizeRotation(rotationOverride)
        : normalizeRotation(currentPlacement.rotation ?? 0);

    emitFieldLayoutChange(field, {
      x: xFraction,
      y: yFraction,
      width: widthFraction,
      height: heightFraction,
      rotation: rotationValue,
    });
  };

  const handleFieldRotateMouseDown = (
    field: LabelFieldKey,
    placement: FieldPlacement,
    xPx: number,
    yPx: number,
    widthPx: number,
    heightPx: number,
    event: ReactMouseEvent<HTMLButtonElement>
  ) => {
    if (!onFieldLayoutChange || !containerRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    onSelectLabel?.(labelIndex);

    const containerRect = containerRef.current.getBoundingClientRect();
    const centerX = containerRect.left + xPx + widthPx / 2;
    const centerY = containerRect.top + yPx + heightPx / 2;
    const startRotation = placement.rotation ?? 0;
    const startPointerAngle = Math.atan2(event.clientY - centerY, event.clientX - centerX);

    const handleMove = (moveEvent: MouseEvent) => {
      moveEvent.preventDefault();
      const pointerAngle = Math.atan2(moveEvent.clientY - centerY, moveEvent.clientX - centerX);
      const angleDelta = pointerAngle - startPointerAngle;
      const newRotation = normalizeRotation(startRotation + (angleDelta * 180) / Math.PI);
      handleFieldTransform(field, xPx, yPx, widthPx, heightPx, newRotation);
    };

    const handleUp = (upEvent: MouseEvent) => {
      upEvent.preventDefault();
      document.removeEventListener('mousemove', handleMove, true);
      document.removeEventListener('mouseup', handleUp, true);
    };

    document.addEventListener('mousemove', handleMove, true);
    document.addEventListener('mouseup', handleUp, true);
  };

  const renderField = (
    field: LabelFieldKey,
    renderContent: (scale: { widthScale: number; heightScale: number }) => ReactNode,
    {
      justify = 'flex-start',
      align = 'center',
      className,
    }: { justify?: 'flex-start' | 'center' | 'flex-end'; align?: 'flex-start' | 'center' | 'flex-end'; className?: string } = {}
  ) => {
    const placement = effectiveFieldLayout[field];
    if (!placement) return null;

    const basePlacement = DEFAULT_FIELD_LAYOUT[field];
    const baseWidth = Math.max(basePlacement.width, 0.01);
    const baseHeight = Math.max(basePlacement.height, 0.01);
    const widthScale = placement.width / baseWidth;
    const heightScale = placement.height / baseHeight;
    const content = renderContent({ widthScale, heightScale });

    const left = placement.x * 100;
    const top = placement.y * 100;
    const widthPercent = placement.width * 100;
    const heightPercent = placement.height * 100;
    const currentPlacement = effectiveFieldLayout[field] ?? placement;
    const rotation = currentPlacement.rotation ?? 0;

    if (isFieldEditing && containerWidth > 0 && containerHeight > 0 && onFieldLayoutChange) {
      const widthPx = currentPlacement.width * containerWidth;
      const heightPx = currentPlacement.height * containerHeight;
      const xPx = currentPlacement.x * containerWidth;
      const yPx = currentPlacement.y * containerHeight;

      return (
        <Rnd
          key={`field-${field}`}
          bounds="parent"
          size={{ width: widthPx, height: heightPx }}
          position={{ x: xPx, y: yPx }}
          onDragStart={() => onSelectLabel?.(labelIndex)}
          onDragStop={(_, data) => {
            const latestPlacement = effectiveFieldLayout[field] ?? currentPlacement;
            const latestWidth = latestPlacement.width * containerWidth;
            const latestHeight = latestPlacement.height * containerHeight;
            const latestRotation = latestPlacement.rotation ?? currentPlacement.rotation ?? 0;
            handleFieldTransform(field, data.x, data.y, latestWidth, latestHeight, latestRotation);
          }}
          onResizeStop={(_, __, ref, ___, position) => {
            const latestPlacement = effectiveFieldLayout[field] ?? currentPlacement;
            const latestRotation = latestPlacement.rotation ?? currentPlacement.rotation ?? 0;
            handleFieldTransform(field, position.x, position.y, ref.offsetWidth, ref.offsetHeight, latestRotation);
          }}
          enableResizing={{
            top: true,
            right: true,
            bottom: true,
            left: true,
            topRight: true,
            bottomRight: true,
            bottomLeft: true,
            topLeft: true,
          }}
        >
          <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <div
              className={className}
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: align,
                justifyContent: justify,
                padding: '4px',
                boxSizing: 'border-box',
                backgroundColor: 'rgba(255,255,255,0.85)',
                border: '1px dashed rgba(59, 130, 246, 0.6)',
                borderRadius: '4px',
                cursor: 'move',
                transform: `rotate(${rotation}deg)`,
                transformOrigin: 'center center',
              }}
              onMouseDown={() => onSelectLabel?.(labelIndex)}
            >
              {content}
            </div>
            <button
              type="button"
              className="label-image-handle rotate"
              onMouseDown={(event) =>
                handleFieldRotateMouseDown(field, currentPlacement, xPx, yPx, widthPx, heightPx, event)
              }
              onClick={(event) => event.preventDefault()}
              style={{
                position: 'absolute',
                top: -18,
                left: '50%',
                transform: 'translateX(-50%)',
              }}
            />
          </div>
        </Rnd>
      );
    }

    return (
      <div
        key={`field-${field}`}
        className={className}
        style={{
          position: 'absolute',
          left: `${left}%`,
          top: `${top}%`,
          width: `${widthPercent}%`,
          height: `${heightPercent}%`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2px',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: align,
            justifyContent: justify,
            transform: `rotate(${rotation}deg)`,
            transformOrigin: 'center center',
          }}
        >
          {content}
        </div>
      </div>
    );
  };
  
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
        style={{
          pointerEvents: isFieldEditing ? 'none' : allowInteraction ? 'auto' : 'none',
        }}
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
                <Image
                  src={overlay.src}
                  alt=""
                  fill
                  unoptimized
                  draggable={false}
                  sizes="100vw"
                  style={{ objectFit: 'contain', pointerEvents: 'none' }}
                />

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
          position: 'relative',
          width: '100%',
          height: '100%',
          fontFamily: 'Arial, sans-serif',
          boxSizing: 'border-box',
          overflow: 'hidden',
          color: '#000000',
          zIndex: 2,
        }}
      >
        {renderField(
          'price',
          ({ widthScale, heightScale }) => (
            <div
              style={{
                width: '100%',
                fontSize: scaleFontSize(priceFontSize, Math.max(widthScale, heightScale)),
                lineHeight: 1,
                fontWeight: 'bold',
                textAlign: 'left',
                color: '#000000',
              }}
            >
              {priceDisplay || (isFieldEditing ? 'Price' : '')}
            </div>
          ),
          { justify: 'flex-start', align: 'flex-start' }
        )}

        {renderField(
          'code',
          ({ widthScale, heightScale }) => (
            <div
              style={{
                width: '100%',
                fontSize: scaleFontSize(codeFontSize, Math.max(widthScale, heightScale)),
                lineHeight: 1,
                textAlign: 'center',
                color: '#000000',
                wordBreak: 'break-word',
              }}
            >
              {displayCode || (isFieldEditing ? 'Barcode Number' : '')}
            </div>
          ),
          { justify: 'center', align: 'center' }
        )}

        {renderField(
          'barcode',
          ({ widthScale, heightScale }) => (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {barcodeValue ? (
                <Barcode
                  value={barcodeValue}
                  format={format}
                  width={barcodeWidth * widthScale}
                  height={barcodeHeight * heightScale}
                  displayValue={false}
                />
              ) : isFieldEditing ? (
                <span className="text-xs text-blue-600">Barcode area</span>
              ) : null}
            </div>
          ),
          { justify: 'center', align: 'center', className: 'field-barcode' }
        )}

        {renderField(
          'line1',
          ({ widthScale, heightScale }) => (
            <div
              style={{
                width: '100%',
                fontSize: scaleFontSize(descFontSize, Math.max(widthScale, heightScale)),
                lineHeight: 1.05,
                textAlign: 'left',
                color: '#000000',
                fontWeight: 500,
                wordBreak: 'break-word',
              }}
            >
              {line1 || (isFieldEditing ? 'Brand / Line 1' : '')}
            </div>
          )
        )}

        {renderField(
          'line2',
          ({ widthScale, heightScale }) => (
            <div
              style={{
                width: '100%',
                fontSize: scaleFontSize(descFontSize, Math.max(widthScale, heightScale)),
                lineHeight: 1.05,
                textAlign: 'left',
                color: '#000000',
                fontWeight: 500,
                wordBreak: 'break-word',
              }}
            >
              {line2 || (!line1 && description ? description : isFieldEditing ? 'Description / Line 2' : '')}
            </div>
          )
        )}
      </div>
    </div>
  );
}

