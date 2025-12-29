'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Product } from '@/lib/excelParser';
import LabelGrid from './LabelGrid';
import { AVAILABLE_TEMPLATES, LabelTemplate as LabelTemplateConfig, getTemplateById, getLabelPosition, calculateLabelPositions } from '@/lib/labelTemplates';
import { useReactToPrint } from 'react-to-print';
import { LabelImage, LabelImageLayer, LabelImageUpdate } from '@/lib/labelMedia';
import { ENCODING_OPTIONS, EncodingType } from '@/lib/encodingOptions';
import { DEFAULT_FIELD_LAYOUT, FieldLayout, LabelFieldKey, FieldPlacement } from '@/lib/fieldLayout';
import NextImage from 'next/image';

interface ProductListProps {
  products: Product[];
  initialTemplateId?: string;
  encodingType: EncodingType | null;
  onChangeEncoding: () => void;
  onAddProducts?: (newProducts: Product[]) => void;
}

// Helper functions for unit conversion
const cmToInches = (cm: number): number => cm / 2.54;
const inchesToCm = (inches: number): number => inches * 2.54;

// Load saved custom templates from localStorage
const loadSavedCustomTemplates = (): LabelTemplateConfig[] => {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem('customLabelTemplates');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error('Error loading saved custom templates:', error);
  }
  return [];
};

// Save custom templates to localStorage
const saveCustomTemplates = (templates: LabelTemplateConfig[]): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('customLabelTemplates', JSON.stringify(templates));
  } catch (error) {
    console.error('Error saving custom templates:', error);
  }
};

const MAX_IMAGES_PER_LABEL = 5;
const DEFAULT_IMAGE_LAYER: LabelImageLayer = 'foreground';
const SELECT_TEMPLATE_OPTION = 'select-template';

const cloneFieldLayout = (layout: FieldLayout): FieldLayout =>
  Object.fromEntries(Object.entries(layout).map(([key, placement]) => [key, { ...placement }])) as FieldLayout;

const ENCODING_DETAILS = ENCODING_OPTIONS;

const mergeWithDefaultLayout = (layout: FieldLayout): FieldLayout => {
  const merged = cloneFieldLayout(DEFAULT_FIELD_LAYOUT);
  (Object.keys(DEFAULT_FIELD_LAYOUT) as LabelFieldKey[]).forEach((key) => {
    if (layout[key]) {
      merged[key] = {
        ...merged[key],
        ...layout[key],
        rotation:
          typeof layout[key].rotation === 'number'
            ? ((layout[key].rotation % 360) + 360) % 360
            : merged[key].rotation,
      };
    }
  });
  return merged;
};

export default function ProductList({ products, initialTemplateId, encodingType, onChangeEncoding, onAddProducts }: ProductListProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(initialTemplateId || SELECT_TEMPLATE_OPTION);
  const isCustomMode = initialTemplateId === 'custom';
  
  // Encoding selection for custom template (local state, can be different from parent)
  const [customEncodingType, setCustomEncodingType] = useState<EncodingType | null>(encodingType);
  
  // Update custom encoding when parent encoding changes
  useEffect(() => {
    if (encodingType !== null) {
      setCustomEncodingType(encodingType);
    }
  }, [encodingType]);
  
  // Use custom encoding if in custom mode and custom encoding is set, otherwise use parent encoding
  const effectiveEncoding: EncodingType = (isCustomMode && customEncodingType) ? customEncodingType : (encodingType ?? 'code128');
  const encodingInfo = ENCODING_DETAILS[effectiveEncoding];
  const barcodeFormat = encodingInfo.barcodeFormat;
  const hasSelectedTemplate = selectedTemplateId !== SELECT_TEMPLATE_OPTION;
  
  // Update selected template when initialTemplateId changes
  useEffect(() => {
    if (initialTemplateId) {
      setSelectedTemplateId(initialTemplateId);
    }
  }, [initialTemplateId]);
  const [labelsPerPage, setLabelsPerPage] = useState<number | undefined>(undefined);
  const [maxPages, setMaxPages] = useState<number | undefined>(1); // Default to 1 page
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(
    new Set() // Default: all products deselected
  );
  const [applyImagesToAll, setApplyImagesToAll] = useState<boolean>(true);
  const [globalLabelImages, setGlobalLabelImages] = useState<LabelImage[]>([]);
  const [labelImageMap, setLabelImageMap] = useState<Record<number, LabelImage[]>>({});
  const [activeLabelIndex, setActiveLabelIndex] = useState<number>(0);
  const [activeImageId, setActiveImageId] = useState<string | null>(null);
  const [draggingImageId, setDraggingImageId] = useState<string | null>(null);
  const [imageLimitMessage, setImageLimitMessage] = useState<string | null>(null);
  const [isFieldEditing, setIsFieldEditing] = useState<boolean>(false);
  const [fieldLayout, setFieldLayout] = useState<FieldLayout>(() => cloneFieldLayout(DEFAULT_FIELD_LAYOUT));
  const [showHints, setShowHints] = useState<boolean>(true);
  const [templateHintVisible, setTemplateHintVisible] = useState<boolean>(false);

  const clamp = useCallback((value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value)), []);
  const normalizeRotation = (angle: number) => ((angle % 360) + 360) % 360;

  useEffect(() => {
    if (!showHints || hasSelectedTemplate || products.length === 0) {
      setTemplateHintVisible(false);
      return;
    }
    const timer = window.setTimeout(() => setTemplateHintVisible(true), 800);
    return () => window.clearTimeout(timer);
  }, [showHints, hasSelectedTemplate, products.length]);

  const generateImageId = useCallback(() => {
    return `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }, []);

  const getImageLayer = useCallback(
    (image: LabelImage): LabelImageLayer => image.layer ?? DEFAULT_IMAGE_LAYER,
    []
  );

  const normalizeZIndex = useCallback(
    (images: LabelImage[]) => {
      const grouped: Record<LabelImageLayer, LabelImage[]> = {
        background: [],
        foreground: [],
      };

      images.forEach((image) => {
        const layer = getImageLayer(image);
        grouped[layer].push({ ...image, layer });
      });

      const normalized: LabelImage[] = [];

      (['background', 'foreground'] as LabelImageLayer[]).forEach((layer) => {
        grouped[layer].forEach((image, index) => {
          normalized.push({
            ...image,
            layer,
            zIndex: index + 1,
          });
        });
      });

      return normalized;
    },
    [getImageLayer]
  );

  const getImagesForLabel = useCallback(
    (index: number): LabelImage[] => {
      if (applyImagesToAll) {
        return globalLabelImages;
      }
      return labelImageMap[index] ?? [];
    },
    [applyImagesToAll, globalLabelImages, labelImageMap]
  );

  const setImagesForLabel = useCallback(
    (index: number, updater: (prev: LabelImage[]) => LabelImage[]) => {
      setLabelImageMap((prev) => {
        const current = prev[index] ?? [];
        const updated = updater(current);
        return {
          ...prev,
          [index]: normalizeZIndex(updated),
        };
      });
    },
    [normalizeZIndex]
  );

  const updateGlobalImages = useCallback(
    (updater: (prev: LabelImage[]) => LabelImage[]) => {
      setGlobalLabelImages((prev) => normalizeZIndex(updater(prev)));
    },
    [normalizeZIndex]
  );

  const readFileAsDataURL = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }, []);

  const loadImageDimensions = useCallback((src: string): Promise<{ width: number; height: number }> => {
    return new Promise((resolve) => {
      const image = new Image();
      image.onload = () => {
        resolve({ width: image.naturalWidth || 1, height: image.naturalHeight || 1 });
      };
      image.onerror = () => resolve({ width: 1, height: 1 });
      image.src = src;
    });
  }, []);

  const reorderImagesArray = useCallback(
    (images: LabelImage[], imageId: string, direction: 'forward' | 'backward' | 'front' | 'back') => {
      if (images.length === 0) {
        return images;
      }

      const background: LabelImage[] = [];
      const foreground: LabelImage[] = [];

      let target: LabelImage | undefined;
      let targetLayer: LabelImageLayer = DEFAULT_IMAGE_LAYER;
      let targetIndex = -1;

      images.forEach((image) => {
        const layer = getImageLayer(image);
        const layerArray = layer === 'background' ? background : foreground;
        const clone: LabelImage = { ...image, layer };

        if (clone.id === imageId) {
          target = clone;
          targetLayer = layer;
          targetIndex = layerArray.length;
          return;
        }

        layerArray.push(clone);
      });

      if (!target) {
        return normalizeZIndex([...background, ...foreground]);
      }

      let activeTarget: LabelImage = target;

      const getLayerArray = (layer: LabelImageLayer) => (layer === 'background' ? background : foreground);

      const placeTarget = (layer: LabelImageLayer, desiredIndex: number) => {
        const layerArray = getLayerArray(layer);
        const boundedIndex = Math.max(0, Math.min(desiredIndex, layerArray.length));
        activeTarget = { ...activeTarget, layer };
        layerArray.splice(boundedIndex, 0, activeTarget);
        targetLayer = layer;
        targetIndex = boundedIndex;
      };

      switch (direction) {
        case 'front': {
          placeTarget('foreground', getLayerArray('foreground').length);
          break;
        }
        case 'back': {
          placeTarget('background', 0);
          break;
        }
        case 'forward': {
          placeTarget(targetLayer, Math.min(targetIndex + 1, getLayerArray(targetLayer).length));
          break;
        }
        case 'backward': {
          placeTarget(targetLayer, Math.max(targetIndex - 1, 0));
          break;
        }
        default: {
          const defaultIndex = targetIndex < 0 ? getLayerArray(targetLayer).length : targetIndex;
          placeTarget(targetLayer, defaultIndex);
        }
      }

      return normalizeZIndex([...background, ...foreground]);
    },
    [getImageLayer, normalizeZIndex]
  );

  const handleAddImages = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;

      const currentImages = getImagesForLabel(activeLabelIndex);
      const availableSlots = MAX_IMAGES_PER_LABEL - currentImages.length;

      if (availableSlots <= 0) {
        setImageLimitMessage(`You can add up to ${MAX_IMAGES_PER_LABEL} images per label.`);
        return;
      }

      const files = Array.from(fileList).slice(0, availableSlots);
      const createdImages: LabelImage[] = [];

      for (const file of files) {
        try {
          const src = await readFileAsDataURL(file);
          const { width: naturalWidth, height: naturalHeight } = await loadImageDimensions(src);
          const aspectRatio = naturalWidth > 0 ? naturalHeight / naturalWidth : 1;

          let width = 0.4; // default to 40% of label width
          let height = width * aspectRatio;

          // Keep height within bounds
          if (height > 0.5) {
            const scale = 0.5 / height;
            height = 0.5;
            width *= scale;
          }

          // Ensure width also within bounds
          if (width > 0.8) {
            const scale = 0.8 / width;
            width = 0.8;
            height *= scale;
          }

          const centeredX = Math.max(0, Math.min(1 - width, 0.5 - width / 2));
          const centeredY = Math.max(0, Math.min(1 - height, 0.5 - height / 2));

          createdImages.push({
            id: generateImageId(),
            src,
            x: centeredX,
            y: centeredY,
            width,
            height,
            rotation: 0,
            zIndex: 9999, // temporary, will normalize
            layer: DEFAULT_IMAGE_LAYER,
          });
        } catch (error) {
          console.error('Failed to import image:', error);
        }
      }

      if (createdImages.length === 0) return;

      if (applyImagesToAll) {
        updateGlobalImages((prev) => [...prev, ...createdImages]);
      } else {
        setImagesForLabel(activeLabelIndex, (prev) => [...prev, ...createdImages]);
      }

      setActiveImageId(createdImages[createdImages.length - 1].id);

      if (fileList.length > files.length) {
        setImageLimitMessage(
          `Only the first ${files.length} image${files.length === 1 ? '' : 's'} were added (max ${MAX_IMAGES_PER_LABEL} per label).`
        );
      } else {
        setImageLimitMessage(null);
      }
    },
    [
      activeLabelIndex,
      applyImagesToAll,
      generateImageId,
      getImagesForLabel,
      loadImageDimensions,
      readFileAsDataURL,
      setImagesForLabel,
      updateGlobalImages,
    ]
  );

  const handleImageChange = useCallback(
    (labelIndex: number, imageId: string, updates: LabelImageUpdate) => {
      const applyUpdates = (images: LabelImage[]) =>
        images.map((image) => {
          if (image.id !== imageId) return image;

          const updated: LabelImage = {
            ...image,
            ...updates,
          };

          return {
            ...updated,
            x: clamp(updated.x ?? image.x),
            y: clamp(updated.y ?? image.y),
            width: clamp(updated.width ?? image.width, 0.05, 1),
            height: clamp(updated.height ?? image.height, 0.05, 1),
            rotation: Math.max(-180, Math.min(180, updated.rotation ?? image.rotation)),
          };
        });

      if (applyImagesToAll) {
        updateGlobalImages(applyUpdates);
      } else {
        setImagesForLabel(labelIndex, applyUpdates);
      }
    },
    [applyImagesToAll, clamp, setImagesForLabel, updateGlobalImages]
  );

  const handleImageSelect = useCallback((labelIndex: number, imageId: string) => {
    setActiveLabelIndex(labelIndex);
    setActiveImageId(imageId);
  }, []);

  const handleImageDrop = useCallback(
    (labelIndex: number, imageId: string, position: { x: number; y: number }) => {
      setActiveLabelIndex(labelIndex);
      setActiveImageId(imageId);

      const applyUpdates = (images: LabelImage[]) =>
        images.map((image) => {
          if (image.id !== imageId) return image;
          const maxX = Math.max(0, 1 - image.width);
          const maxY = Math.max(0, 1 - image.height);
          return {
            ...image,
            x: clamp(position.x, 0, maxX),
            y: clamp(position.y, 0, maxY),
          };
        });

      if (applyImagesToAll) {
        updateGlobalImages(applyUpdates);
      } else {
        setImagesForLabel(labelIndex, applyUpdates);
      }
    },
    [applyImagesToAll, clamp, setImagesForLabel, updateGlobalImages]
  );

  const handleLabelClick = useCallback((labelIndex: number) => {
    setActiveLabelIndex(labelIndex);
  }, []);

  const handleRemoveImage = useCallback(
    (imageId: string) => {
      if (applyImagesToAll) {
        updateGlobalImages((prev) => prev.filter((image) => image.id !== imageId));
      } else {
        setImagesForLabel(activeLabelIndex, (prev) => prev.filter((image) => image.id !== imageId));
      }
      setImageLimitMessage(null);
    },
    [activeLabelIndex, applyImagesToAll, setImagesForLabel, updateGlobalImages]
  );

  const handleReorderImage = useCallback(
    (imageId: string, direction: 'forward' | 'backward' | 'front' | 'back') => {
      if (applyImagesToAll) {
        updateGlobalImages((prev) => reorderImagesArray(prev, imageId, direction));
      } else {
        setImagesForLabel(activeLabelIndex, (prev) => reorderImagesArray(prev, imageId, direction));
      }
    },
    [activeLabelIndex, applyImagesToAll, reorderImagesArray, setImagesForLabel, updateGlobalImages]
  );

  const handleDuplicateImage = useCallback(() => {
    if (!activeImageId) return;
    const images = getImagesForLabel(activeLabelIndex);
    if (images.length >= MAX_IMAGES_PER_LABEL) {
      setImageLimitMessage(`You can add up to ${MAX_IMAGES_PER_LABEL} images per label.`);
      return;
    }
    const target = images.find((image) => image.id === activeImageId);
    if (!target) return;

    const duplicate: LabelImage = {
      ...target,
      id: generateImageId(),
      x: clamp(target.x + 0.05, 0, 1 - target.width),
      y: clamp(target.y + 0.05, 0, 1 - target.height),
      zIndex: target.zIndex + 1,
      layer: getImageLayer(target),
    };

    if (applyImagesToAll) {
      updateGlobalImages((prev) => [...prev, duplicate]);
    } else {
      setImagesForLabel(activeLabelIndex, (prev) => [...prev, duplicate]);
    }
    setActiveImageId(duplicate.id);
    setImageLimitMessage(null);
  }, [
    activeImageId,
    activeLabelIndex,
    applyImagesToAll,
    clamp,
    generateImageId,
    getImageLayer,
    getImagesForLabel,
    setImagesForLabel,
    updateGlobalImages,
  ]);

  const handleResetImagePosition = useCallback(() => {
    if (!activeImageId) return;
    const images = getImagesForLabel(activeLabelIndex);
    const target = images.find((image) => image.id === activeImageId);
    if (!target) return;

    const centeredX = clamp(0.5 - target.width / 2, 0, 1 - target.width);
    const centeredY = clamp(0.5 - target.height / 2, 0, 1 - target.height);

    handleImageChange(activeLabelIndex, activeImageId, {
      x: centeredX,
      y: centeredY,
      rotation: 0,
    });
  }, [activeImageId, activeLabelIndex, clamp, getImagesForLabel, handleImageChange]);

  const handleFieldLayoutChange = (field: LabelFieldKey, placement: FieldPlacement) => {
    setFieldLayout((prev) => {
      const current = prev[field] ?? DEFAULT_FIELD_LAYOUT[field];
      return {
        ...prev,
        [field]: {
          x: clamp(placement.x ?? current.x, 0, 1),
          y: clamp(placement.y ?? current.y, 0, 1),
          width: clamp(placement.width ?? current.width, 0.05, 1),
          height: clamp(placement.height ?? current.height, 0.05, 1),
          rotation:
            typeof placement.rotation === 'number'
              ? normalizeRotation(placement.rotation)
              : normalizeRotation(current.rotation ?? DEFAULT_FIELD_LAYOUT[field].rotation),
        },
      };
    });
  };

  const effectiveFieldLayout = useMemo(() => mergeWithDefaultLayout(fieldLayout), [fieldLayout]);

  const activeImages = useMemo(() => {
    return applyImagesToAll ? globalLabelImages : labelImageMap[activeLabelIndex] ?? [];
  }, [activeLabelIndex, applyImagesToAll, globalLabelImages, labelImageMap]);

  const selectedImage = useMemo(() => {
    if (!activeImageId) return null;
    return activeImages.find((image) => image.id === activeImageId) ?? null;
  }, [activeImageId, activeImages]);

  const handlePositionInputChange = useCallback(
    (field: 'x' | 'y', value: number) => {
      if (!activeImageId) return;
      const decimal = clamp(value / 100, 0, 1);
      handleImageChange(activeLabelIndex, activeImageId, { [field]: decimal });
    },
    [activeImageId, activeLabelIndex, clamp, handleImageChange]
  );

  const handleWidthSliderChange = useCallback(
    (value: number) => {
      if (!activeImageId || !selectedImage) return;
      const widthDecimal = clamp(value / 100, 0.05, 1);
      const aspectRatio = selectedImage.width > 0 ? selectedImage.height / selectedImage.width : 1;
      const heightDecimal = clamp(widthDecimal * aspectRatio, 0.05, 1);

      handleImageChange(activeLabelIndex, activeImageId, {
        width: widthDecimal,
        height: heightDecimal,
      });
    },
    [activeImageId, activeLabelIndex, clamp, handleImageChange, selectedImage]
  );

  const handleRotationInputChange = useCallback(
    (value: number) => {
      if (!activeImageId) return;
      handleImageChange(activeLabelIndex, activeImageId, { rotation: Math.max(-180, Math.min(180, value)) });
    },
    [activeImageId, activeLabelIndex, handleImageChange]
  );
  
  // Custom template configuration state (defaults match Tower W225 example)
  const [customTemplateConfig, setCustomTemplateConfig] = useState({
    labelName: '',
    topMargin: 1.67, // cm (Tower W225 example)
    sideMargin: 0.56, // cm (Tower W225 example)
    verticalPitch: 1.26, // cm (Tower W225 example)
    horizontalPitch: 5.08, // cm (Tower W225 example)
    pageSize: 'A4',
    pageWidth: 21.0, // cm (A4 width)
    labelHeight: 1.11, // cm (Tower W225 example)
    labelWidth: 4.6, // cm (Tower W225 example)
    numberAcross: 4,
    numberDown: 21,
    pageHeight: 29.7, // cm (A4 height)
  });
  
  const [enableDirectBarcodeInsert, setEnableDirectBarcodeInsert] = useState<boolean>(false);
  const [manualBarcodes, setManualBarcodes] = useState<string>('');
  
  // Saved custom templates
  const [savedCustomTemplates, setSavedCustomTemplates] = useState<LabelTemplateConfig[]>([]);
  
  // Load saved templates on mount
  useEffect(() => {
    const saved = loadSavedCustomTemplates();
    setSavedCustomTemplates(saved);
  }, []);

  useEffect(() => {
    if (!applyImagesToAll) {
      setLabelImageMap((prev) => {
        if (prev[activeLabelIndex]) {
          return prev;
        }
        return {
          ...prev,
          [activeLabelIndex]: [],
        };
      });
    }
  }, [activeLabelIndex, applyImagesToAll]);

  useEffect(() => {
    const images = applyImagesToAll ? globalLabelImages : labelImageMap[activeLabelIndex] ?? [];
    if (images.length === 0) {
      if (activeImageId !== null) {
        setActiveImageId(null);
      }
      return;
    }

    if (!images.some((image) => image.id === activeImageId)) {
      setActiveImageId(images[images.length - 1].id);
    }
  }, [activeImageId, activeLabelIndex, applyImagesToAll, globalLabelImages, labelImageMap]);

  // Get all available templates (including saved custom ones)
  const allTemplates = [...AVAILABLE_TEMPLATES, ...savedCustomTemplates];
  
  // Enhanced getTemplateById that searches all templates
  const getAllTemplateById = (id: string): LabelTemplateConfig | undefined => {
    return allTemplates.find(t => t.id === id);
  };
  
  // Create template from custom config
  const createTemplateFromConfig = (): LabelTemplateConfig => {
    const pageWidthIn = cmToInches(customTemplateConfig.pageWidth);
    const pageHeightIn = cmToInches(customTemplateConfig.pageHeight);
    const labelWidthIn = cmToInches(customTemplateConfig.labelWidth);
    const labelHeightIn = cmToInches(customTemplateConfig.labelHeight);
    const topMarginIn = cmToInches(customTemplateConfig.topMargin);
    const sideMarginIn = cmToInches(customTemplateConfig.sideMargin);
    const horizontalPitchIn = cmToInches(customTemplateConfig.horizontalPitch);
    const verticalPitchIn = cmToInches(customTemplateConfig.verticalPitch);
    
    // Calculate gaps from pitches
    const gapHorizontal = horizontalPitchIn - labelWidthIn;
    const gapVertical = verticalPitchIn - labelHeightIn;
    
    return {
      id: `custom-${Date.now()}`,
      name: customTemplateConfig.labelName || 'Custom Template',
      description: `${customTemplateConfig.numberDown} rows × ${customTemplateConfig.numberAcross} columns (${customTemplateConfig.numberDown * customTemplateConfig.numberAcross} labels per page) - Custom template`,
      labelWidth: labelWidthIn,
      labelHeight: labelHeightIn,
      columns: customTemplateConfig.numberAcross,
      rows: customTemplateConfig.numberDown,
      pageWidth: pageWidthIn,
      pageHeight: pageHeightIn,
      marginTop: topMarginIn,
      marginBottom: topMarginIn, // Use top margin as default for bottom
      marginLeft: sideMarginIn,
      marginRight: sideMarginIn,
      gapHorizontal: Math.max(0, gapHorizontal),
      gapVertical: Math.max(0, gapVertical),
      horizontalPitch: horizontalPitchIn,
      verticalPitch: verticalPitchIn,
    };
  };
  
  // Handle saving custom template
  const handleSaveCustomTemplate = () => {
    if (!customTemplateConfig.labelName.trim()) {
      alert('Please enter a label name');
      return;
    }
    
    const newTemplate = createTemplateFromConfig();
    newTemplate.name = customTemplateConfig.labelName;
    newTemplate.id = `custom-${customTemplateConfig.labelName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
    
    const updated = [...savedCustomTemplates, newTemplate];
    setSavedCustomTemplates(updated);
    saveCustomTemplates(updated);
    
    // Select the newly saved template
    setSelectedTemplateId(newTemplate.id);
    setLabelsPerPage(undefined);
    
    alert(`Template "${customTemplateConfig.labelName}" saved successfully!`);
  };
  
  // Update selected template when custom config changes (if custom is selected)
  useEffect(() => {
    if (selectedTemplateId === 'custom') {
      // Create a temporary template from config for preview
      // This will be used for rendering
    }
  }, [customTemplateConfig, selectedTemplateId]);
  
  const selectedTemplate = selectedTemplateId === 'custom'
    ? createTemplateFromConfig()
    : hasSelectedTemplate
      ? (getAllTemplateById(selectedTemplateId) || allTemplates[0])
      : allTemplates[0];
  const templateForDisplay =
    selectedTemplateId === 'custom'
      ? selectedTemplate
      : hasSelectedTemplate
        ? selectedTemplate
        : null;
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
              size: ${selectedTemplate.pageWidth}in ${selectedTemplate.pageHeight}in !important;
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
              page-break-after: auto !important;
              page-break-inside: avoid !important;
              position: relative !important;
              overflow: hidden !important;
              left: 0 !important;
              top: 0 !important;
              right: auto !important;
              bottom: auto !important;
              transform: none !important;
            }
            .label-page[data-is-last="false"] {
              page-break-after: always !important;
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

  // For custom mode, allow rendering even without products (to show template preview)
  const noProducts = products.length === 0;
  
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

  useEffect(() => {
    if (totalLabelsToGenerate <= 0) {
      if (activeLabelIndex !== 0) {
        setActiveLabelIndex(0);
      }
      return;
    }

    if (activeLabelIndex > totalLabelsToGenerate - 1) {
      setActiveLabelIndex(totalLabelsToGenerate - 1);
    }
  }, [activeLabelIndex, totalLabelsToGenerate]);

  // For custom mode, allow rendering even without products (to show template configuration)
  if (noProducts && !isCustomMode) {
    return null;
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
      {/* Encoding Banner - Only show if encoding is selected */}
      {effectiveEncoding && (
        <div className="mb-6">
          <div className="flex flex-col gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-800">
                Encoding: {encodingInfo.label}
              </p>
              <p className="text-sm text-blue-700">{encodingInfo.description}</p>
              {encodingInfo.helperText && (
                <p className="text-xs text-blue-600 mt-1">{encodingInfo.helperText}</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2 text-sm font-medium text-blue-800">
                <input
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-blue-300 rounded"
                  checked={showHints}
                  onChange={(event) => {
                    const checked = event.target.checked;
                    setShowHints(checked);
                    if (!checked) {
                      setTemplateHintVisible(false);
                    }
                  }}
                />
                Show hints
              </label>
              <button
                type="button"
                onClick={onChangeEncoding}
                className="inline-flex items-center justify-center rounded-md border border-blue-400 bg-white px-4 py-2 text-sm font-medium text-blue-700 shadow-sm transition-colors hover:bg-blue-100"
              >
                Change Encoding
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="mb-6 bg-white rounded-lg shadow-md p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Template Selection */}
          <div>
            <div className="relative">
              <label htmlFor="template-select" className="block text-sm font-medium text-gray-700 mb-2">
                Label Template
              </label>
              {showHints && templateHintVisible && (
                <div className="absolute left-full top-0 ml-3 w-52 rounded-md border border-blue-300 bg-white px-3 py-2 text-xs font-medium text-blue-700 shadow-lg">
                  Select a label template to match your sheet layout. You can change this later.
                </div>
              )}
            </div>
            <select
              id="template-select"
              value={selectedTemplateId}
              onChange={(e) => {
                const newValue = e.target.value;
                setSelectedTemplateId(newValue);
                setLabelsPerPage(undefined); // Reset to max
                setTemplateHintVisible(false);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white cursor-pointer text-gray-900"
              style={{ color: '#1f2937' }}
            >
              <option value={SELECT_TEMPLATE_OPTION} disabled>
                Select Template…
              </option>
              {allTemplates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name} ({template.rows}×{template.columns})
                </option>
              ))}
              <option value="custom">Custom Template (Configure Below)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {templateForDisplay ? templateForDisplay.description : 'Choose a template to see its details.'}
            </p>
          </div>

          {/* Custom Template Configuration Form */}
          {selectedTemplateId === 'custom' && (
            <div className="md:col-span-4 mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Custom Label Template Configuration</h3>
              
              {/* Visual Preview */}
              <div className="mb-6 p-4 bg-white rounded-lg border border-gray-300">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Preview</h4>
                <div className="relative border-2 border-gray-400 bg-white overflow-visible" style={{ 
                  width: '100%', 
                  maxWidth: '600px',
                  aspectRatio: `${customTemplateConfig.pageWidth} / ${customTemplateConfig.pageHeight}`,
                  margin: '0 auto',
                  minHeight: '300px'
                }}>
                  {/* Page background */}
                  <div className="absolute inset-0 bg-white">
                    {/* Top margin indicator */}
                    <div 
                      className="absolute left-0 right-0 bg-blue-100 border-b-2 border-blue-400"
                      style={{ 
                        height: `${(customTemplateConfig.topMargin / customTemplateConfig.pageHeight) * 100}%`,
                        top: 0
                      }}
                    >
                      <span className="absolute -top-6 left-0 text-xs text-blue-600 font-medium">Top margin: {customTemplateConfig.topMargin} cm</span>
                    </div>
                    
                    {/* Side margin indicators */}
                    <div 
                      className="absolute top-0 bottom-0 bg-blue-100 border-r-2 border-blue-400"
                      style={{ 
                        width: `${(customTemplateConfig.sideMargin / customTemplateConfig.pageWidth) * 100}%`,
                        left: 0
                      }}
                    >
                      <span className="absolute -left-20 top-1/2 -translate-y-1/2 text-xs text-blue-600 font-medium whitespace-nowrap" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>Side margin: {customTemplateConfig.sideMargin} cm</span>
                    </div>
                    
                    {/* Label grid area */}
                    <div 
                      className="absolute bg-gray-50"
                      style={{
                        left: `${(customTemplateConfig.sideMargin / customTemplateConfig.pageWidth) * 100}%`,
                        top: `${(customTemplateConfig.topMargin / customTemplateConfig.pageHeight) * 100}%`,
                        width: `${((customTemplateConfig.horizontalPitch * customTemplateConfig.numberAcross) / customTemplateConfig.pageWidth) * 100}%`,
                        height: `${((customTemplateConfig.verticalPitch * customTemplateConfig.numberDown) / customTemplateConfig.pageHeight) * 100}%`
                      }}
                    >
                      {/* Draw label grid */}
                      {Array.from({ length: customTemplateConfig.numberDown }).map((_, row) => 
                        Array.from({ length: customTemplateConfig.numberAcross }).map((_, col) => {
                          const labelLeft = (col * customTemplateConfig.horizontalPitch) / (customTemplateConfig.horizontalPitch * customTemplateConfig.numberAcross) * 100;
                          const labelTop = (row * customTemplateConfig.verticalPitch) / (customTemplateConfig.verticalPitch * customTemplateConfig.numberDown) * 100;
                          const labelWidthPct = (customTemplateConfig.labelWidth / (customTemplateConfig.horizontalPitch * customTemplateConfig.numberAcross)) * 100;
                          const labelHeightPct = (customTemplateConfig.labelHeight / (customTemplateConfig.verticalPitch * customTemplateConfig.numberDown)) * 100;
                          
                          return (
                            <div
                              key={`${row}-${col}`}
                              className="absolute border border-gray-400 bg-white"
                              style={{
                                left: `${labelLeft}%`,
                                top: `${labelTop}%`,
                                width: `${labelWidthPct}%`,
                                height: `${labelHeightPct}%`
                              }}
                            />
                          );
                        })
                      )}
                      
                      {/* Horizontal pitch indicator (arrow) */}
                      {customTemplateConfig.numberAcross > 1 && (
                        <div className="absolute" style={{
                          left: `${(customTemplateConfig.labelWidth / (customTemplateConfig.horizontalPitch * customTemplateConfig.numberAcross)) * 100}%`,
                          top: '0%',
                          width: `${((customTemplateConfig.horizontalPitch - customTemplateConfig.labelWidth) / (customTemplateConfig.horizontalPitch * customTemplateConfig.numberAcross)) * 100}%`,
                          height: '100%'
                        }}>
                          <div className="absolute top-0 left-0 right-0 h-1 bg-green-500"></div>
                          <div className="absolute top-0 left-0 w-0 h-0 border-t-4 border-t-green-500 border-r-4 border-r-transparent"></div>
                          <div className="absolute top-0 right-0 w-0 h-0 border-t-4 border-t-green-500 border-l-4 border-l-transparent"></div>
                          <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-green-600 font-medium whitespace-nowrap bg-white px-1">
                            Horizontal pitch: {customTemplateConfig.horizontalPitch} cm
                          </span>
                        </div>
                      )}
                      
                      {/* Vertical pitch indicator (arrow) */}
                      {customTemplateConfig.numberDown > 1 && (
                        <div className="absolute" style={{
                          left: '0%',
                          top: `${(customTemplateConfig.labelHeight / (customTemplateConfig.verticalPitch * customTemplateConfig.numberDown)) * 100}%`,
                          height: `${((customTemplateConfig.verticalPitch - customTemplateConfig.labelHeight) / (customTemplateConfig.verticalPitch * customTemplateConfig.numberDown)) * 100}%`,
                          width: '100%'
                        }}>
                          <div className="absolute top-0 left-0 bottom-0 w-1 bg-green-500"></div>
                          <div className="absolute top-0 left-0 w-0 h-0 border-l-4 border-l-green-500 border-b-4 border-b-transparent"></div>
                          <div className="absolute bottom-0 left-0 w-0 h-0 border-l-4 border-l-green-500 border-t-4 border-t-transparent"></div>
                          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -left-20 text-xs text-green-600 font-medium whitespace-nowrap bg-white px-1" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>
                            Vertical pitch: {customTemplateConfig.verticalPitch} cm
                          </span>
                        </div>
                      )}
                      
                      {/* Label dimensions indicator (highlighted first label) */}
                      <div 
                        className="absolute border-2 border-red-500 bg-red-100 bg-opacity-30"
                        style={{
                          left: 0,
                          top: 0,
                          width: `${(customTemplateConfig.labelWidth / (customTemplateConfig.horizontalPitch * customTemplateConfig.numberAcross)) * 100}%`,
                          height: `${(customTemplateConfig.labelHeight / (customTemplateConfig.verticalPitch * customTemplateConfig.numberDown)) * 100}%`
                        }}
                      >
                        <div className="absolute -right-12 top-0 bg-red-500 text-white text-xs px-2 py-1 font-medium whitespace-nowrap">
                          Width: {customTemplateConfig.labelWidth} cm
                        </div>
                        <div className="absolute left-0 -bottom-8 bg-red-500 text-white text-xs px-2 py-1 font-medium whitespace-nowrap">
                          Height: {customTemplateConfig.labelHeight} cm
                        </div>
                      </div>
                      
                      {/* Number across indicator */}
                      <div 
                        className="absolute -bottom-8 left-0 right-0 text-center"
                      >
                        <span className="text-xs text-gray-600 font-medium bg-white px-2">
                          Number across: {customTemplateConfig.numberAcross}
                        </span>
                      </div>
                      
                      {/* Number down indicator */}
                      <div 
                        className="absolute -right-8 top-0 bottom-0 flex items-center"
                      >
                        <span className="text-xs text-gray-600 font-medium whitespace-nowrap bg-white px-2" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>
                          Number down: {customTemplateConfig.numberDown}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-6 text-xs text-gray-600 text-center space-y-1">
                  <p className="font-medium">Page: {customTemplateConfig.pageWidth} cm × {customTemplateConfig.pageHeight} cm</p>
                  <p className="font-medium">Total Labels: {customTemplateConfig.numberAcross * customTemplateConfig.numberDown}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Label Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Label Name
                  </label>
                  <input
                    type="text"
                    value={customTemplateConfig.labelName}
                    onChange={(e) => setCustomTemplateConfig({ ...customTemplateConfig, labelName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    placeholder="e.g., Tower W225 Mini Label"
                  />
                </div>

                {/* Top Margin */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Top Margin (cm)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={customTemplateConfig.topMargin}
                    onChange={(e) => setCustomTemplateConfig({ ...customTemplateConfig, topMargin: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  />
                </div>

                {/* Side Margin */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Side Margin (cm)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={customTemplateConfig.sideMargin}
                    onChange={(e) => setCustomTemplateConfig({ ...customTemplateConfig, sideMargin: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  />
                </div>

                {/* Vertical Pitch */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vertical Pitch (cm)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={customTemplateConfig.verticalPitch}
                    onChange={(e) => setCustomTemplateConfig({ ...customTemplateConfig, verticalPitch: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  />
                </div>

                {/* Horizontal Pitch */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Horizontal Pitch (cm)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={customTemplateConfig.horizontalPitch}
                    onChange={(e) => setCustomTemplateConfig({ ...customTemplateConfig, horizontalPitch: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  />
                </div>

                {/* Page Size */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Page Size
                  </label>
                  <select
                    value={customTemplateConfig.pageSize}
                    onChange={(e) => {
                      const pageSize = e.target.value;
                      let pageWidth = customTemplateConfig.pageWidth;
                      let pageHeight = customTemplateConfig.pageHeight;
                      
                      if (pageSize === 'A4') {
                        pageWidth = 21.0;
                        pageHeight = 29.7;
                      } else if (pageSize === 'Letter') {
                        pageWidth = 21.59;
                        pageHeight = 27.94;
                      }
                      
                      setCustomTemplateConfig({ ...customTemplateConfig, pageSize, pageWidth, pageHeight });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  >
                    <option value="Custom">Custom</option>
                    <option value="A4">A4</option>
                    <option value="Letter">Letter</option>
                  </select>
                </div>

                {/* Page Width */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Page Width (cm)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={customTemplateConfig.pageWidth}
                    onChange={(e) => setCustomTemplateConfig({ ...customTemplateConfig, pageWidth: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    disabled={customTemplateConfig.pageSize !== 'Custom'}
                  />
                </div>

                {/* Label Height */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Label Height (cm)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={customTemplateConfig.labelHeight}
                    onChange={(e) => setCustomTemplateConfig({ ...customTemplateConfig, labelHeight: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  />
                </div>

                {/* Label Width */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Label Width (cm)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={customTemplateConfig.labelWidth}
                    onChange={(e) => setCustomTemplateConfig({ ...customTemplateConfig, labelWidth: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  />
                </div>

                {/* Number Across */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Number Across
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={customTemplateConfig.numberAcross}
                    onChange={(e) => setCustomTemplateConfig({ ...customTemplateConfig, numberAcross: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  />
                </div>

                {/* Number Down */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Number Down
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={customTemplateConfig.numberDown}
                    onChange={(e) => setCustomTemplateConfig({ ...customTemplateConfig, numberDown: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  />
                </div>

                {/* Page Height */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Page Height (cm)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={customTemplateConfig.pageHeight}
                    onChange={(e) => setCustomTemplateConfig({ ...customTemplateConfig, pageHeight: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    disabled={customTemplateConfig.pageSize !== 'Custom'}
                  />
                </div>
              </div>
              
              {/* Encoding Selection Section */}
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="text-sm font-semibold text-gray-800 mb-3">Barcode Encoding (Optional)</h4>
                <p className="text-xs text-gray-600 mb-4">
                  Choose a barcode encoding type to enable barcode generation. You can also upload an Excel file or manually enter barcode numbers.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                  <button
                    type="button"
                    onClick={() => {
                      const newEncoding: EncodingType = 'ean13';
                      setCustomEncodingType(newEncoding);
                    }}
                    className={`p-3 rounded-lg border-2 transition-all text-left ${
                      customEncodingType === 'ean13'
                        ? 'border-blue-500 bg-blue-100 shadow-md'
                        : 'border-gray-200 bg-white hover:border-blue-400'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        customEncodingType === 'ean13' ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
                      }`}>
                        {customEncodingType === 'ean13' && (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">EAN-13</div>
                        <div className="text-xs text-gray-600">13-digit retail barcodes</div>
                      </div>
                    </div>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => {
                      const newEncoding: EncodingType = 'code128';
                      setCustomEncodingType(newEncoding);
                    }}
                    className={`p-3 rounded-lg border-2 transition-all text-left ${
                      customEncodingType === 'code128'
                        ? 'border-blue-500 bg-blue-100 shadow-md'
                        : 'border-gray-200 bg-white hover:border-blue-400'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        customEncodingType === 'code128' ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
                      }`}>
                        {customEncodingType === 'code128' && (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">CODE-128</div>
                        <div className="text-xs text-gray-600">Alphanumeric barcodes</div>
                      </div>
                    </div>
                  </button>
                </div>
                
                {customEncodingType && (
                  <div className="mt-4 p-3 bg-white rounded-lg border border-blue-200">
                    <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
                      <input
                        type="checkbox"
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        checked={enableDirectBarcodeInsert}
                        onChange={(e) => setEnableDirectBarcodeInsert(e.target.checked)}
                      />
                      Enable Direct Barcode Number Insertion
                    </label>
                    <p className="text-xs text-gray-500 mb-3">
                      Manually enter barcode numbers to create products directly without uploading a file.
                    </p>
                    
                    {enableDirectBarcodeInsert && (
                      <div className="mt-3">
                        <label className="block text-xs font-medium text-gray-700 mb-2">
                          Enter Barcode Numbers (one per line or comma-separated)
                        </label>
                        <textarea
                          rows={4}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
                          placeholder={customEncodingType === 'ean13' 
                            ? 'Enter 13-digit EAN-13 barcodes, one per line:\n6001234567890\n6001234567891'
                            : 'Enter CODE-128 barcodes, one per line:\nABC123\nXYZ789'}
                          value={manualBarcodes}
                          onChange={(e) => {
                            setManualBarcodes(e.target.value);
                          }}
                        />
                        {(() => {
                          const barcodeLines = manualBarcodes.split('\n').map(line => line.trim()).filter(line => line.length > 0);
                          const barcodeCount = barcodeLines.length;
                          return (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  if (barcodeCount === 0) {
                                    alert('Please enter at least one barcode number');
                                    return;
                                  }
                                  
                                  // Validate EAN-13 if selected
                                  if (customEncodingType === 'ean13') {
                                    const invalidBarcodes = barcodeLines.filter(barcode => !/^\d{13}$/.test(barcode));
                                    if (invalidBarcodes.length > 0) {
                                      alert(`Invalid EAN-13 barcodes (must be exactly 13 digits):\n${invalidBarcodes.join('\n')}`);
                                      return;
                                    }
                                  }
                                  
                                  // Create products from manual barcodes
                                  const newProducts: Product[] = barcodeLines.map((barcode, index) => ({
                                    code: barcode,
                                    Code: barcode,
                                    description: `Product ${index + 1}`,
                                    Description: `Product ${index + 1}`,
                                    price: '',
                                    Price: '',
                                  }));
                                  
                                  // Add to existing products via callback
                                  if (onAddProducts) {
                                    onAddProducts(newProducts);
                                    // Select the newly added products
                                    const newIndices = Array.from({ length: newProducts.length }, (_, i) => products.length + i);
                                    setSelectedProducts(new Set([...Array.from(selectedProducts), ...newIndices]));
                                    // Clear manual barcodes
                                    setManualBarcodes('');
                                    alert(`Added ${newProducts.length} product(s) from barcode numbers`);
                                  } else {
                                    alert('Cannot add products: callback not available');
                                  }
                                }}
                                className="mt-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                                disabled={barcodeCount === 0}
                              >
                                Add {barcodeCount} Barcode{barcodeCount !== 1 ? 's' : ''} as Products
                              </button>
                              {barcodeCount > 0 && (
                                <p className="text-xs text-gray-500 mt-2">
                                  {customEncodingType === 'ean13' 
                                    ? `EAN-13 barcodes must be exactly 13 digits.`
                                    : `CODE-128 barcodes can contain letters and numbers.`}
                                </p>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Save Button */}
              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleSaveCustomTemplate}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Save Custom Template
                </button>
              </div>
            </div>
          )}

          {/* Labels Per Page */}
          <div>
            <label htmlFor="labels-per-page" className="block text-sm font-medium text-gray-700 mb-2">
              Labels Per Page {hasSelectedTemplate ? `(max: ${maxLabelsPerPage})` : '(select template first)'}
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
              placeholder={hasSelectedTemplate ? `Max: ${maxLabelsPerPage}` : 'Select template'}
              disabled={!hasSelectedTemplate}
            />
            <p className="text-xs text-gray-500 mt-1">
              {hasSelectedTemplate ? `Leave empty for maximum (${maxLabelsPerPage})` : 'Pick a template to enable this control.'}
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
              disabled={!hasSelectedTemplate}
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
              <div>Labels/Page:{' '}
                <strong>
                  {hasSelectedTemplate ? labelsPerPage || maxLabelsPerPage : '---'}
                </strong>
              </div>
              <div>Total Pages:{' '}
                <strong>
                  {hasSelectedTemplate ? totalPages : '---'}
                </strong>
              </div>
              <div>
                Will Generate:{' '}
                <strong>
                  {hasSelectedTemplate ? `${actualPages} page${actualPages !== 1 ? 's' : ''}` : '---'}
                </strong>
              </div>
              <div>
                Label Size:{' '}
                <strong>
                  {templateForDisplay
                    ? `${templateForDisplay.labelWidth}" × ${templateForDisplay.labelHeight}"`
                    : '---'}
                </strong>
              </div>
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

      <div className="mb-6 bg-white rounded-lg shadow-md p-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Media Overlays</h3>
              <p className="text-sm text-gray-500">
                Upload images and position them directly on your labels. Drag edges to resize, use the rotation control, and manage
                layer order as needed.
              </p>
            </div>
            <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                checked={applyImagesToAll}
                onChange={(event) => {
                  setApplyImagesToAll(event.target.checked);
                }}
              />
              Apply images to all labels
            </label>
          </div>

          {!applyImagesToAll && selectedProducts.size === 0 && (
            <div className="mt-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              Select at least one product to apply images to individual labels, or leave “Apply images to all labels” checked.
            </div>
          )}

          <div className="mt-4 grid gap-6 md:grid-cols-[minmax(220px,280px)_1fr]">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Import images</label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(event) => {
                  handleAddImages(event.target.files);
                  if (event.target.value) {
                    event.target.value = '';
                  }
                }}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100
                  cursor-pointer"
              />
              <div className="mt-2 text-xs text-gray-500">
                Maximum {MAX_IMAGES_PER_LABEL} images per label.
              </div>
              <div className="mt-3 text-xs text-gray-500 space-y-1">
                <p>Supported formats: PNG, JPG, GIF.</p>
                <p>
                  Active context:{' '}
                  <span className="font-semibold text-gray-700">
                    {applyImagesToAll ? 'All labels' : `Label #${activeLabelIndex + 1}`}
                  </span>
                </p>
                <p>Images are kept in memory for this session.</p>
              </div>
              {imageLimitMessage && (
                <div className="mt-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                  {imageLimitMessage}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                  Images on {applyImagesToAll ? 'every label' : `label #${activeLabelIndex + 1}`}
                </h4>
                {activeImages.length === 0 ? (
                  <div className="text-sm text-gray-500 border border-dashed border-gray-300 rounded-lg p-4 text-center">
                    Upload an image, then drag it inside the preview. Use the controls below to fine-tune position and size.
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    {activeImages.map((image) => {
                      const isSelected = image.id === activeImageId;
                      return (
                        <button
                          key={image.id}
                          type="button"
                          draggable
                          onClick={() => handleImageSelect(activeLabelIndex, image.id)}
                          onDragStart={(event) => {
                            event.dataTransfer.setData('application/json', JSON.stringify({ imageId: image.id }));
                            event.dataTransfer.effectAllowed = 'move';
                            setDraggingImageId(image.id);
                            handleImageSelect(activeLabelIndex, image.id);
                          }}
                          onDragEnd={() => setDraggingImageId(null)}
                          className={`relative border-2 rounded-md overflow-hidden h-16 w-16 flex items-center justify-center bg-gray-50 transition-colors ${
                            isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:border-blue-400'
                          }`}
                        >
                          <NextImage
                            src={image.src}
                            alt="Label overlay preview"
                            width={64}
                            height={64}
                            unoptimized
                            className="max-h-full max-w-full object-contain"
                          />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {selectedImage && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2 flex flex-wrap items-center justify-between text-xs text-gray-500">
                    <span>
                      Layer:{' '}
                      <span className="font-semibold text-gray-700">
                        {(selectedImage.layer ?? DEFAULT_IMAGE_LAYER) === 'foreground'
                          ? 'Foreground (above label content)'
                          : 'Background (behind label content)'}
                      </span>
                    </span>
                    {selectedImage.layer === 'background' ? (
                      <span className="text-gray-400">
                        While editing, label text is temporarily non-interactive so you can drag background media.
                      </span>
                    ) : null}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Horizontal position ({Math.round(selectedImage.x * 100)}%)
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={Math.round(selectedImage.x * 100)}
                      onChange={(event) => handlePositionInputChange('x', Number(event.target.value))}
                      className="w-full accent-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Vertical position ({Math.round(selectedImage.y * 100)}%)
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={Math.round(selectedImage.y * 100)}
                      onChange={(event) => handlePositionInputChange('y', Number(event.target.value))}
                      className="w-full accent-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Width ({Math.round(selectedImage.width * 100)}%)
                    </label>
                    <input
                      type="range"
                      min={10}
                      max={100}
                      step={1}
                      value={Math.round(selectedImage.width * 100)}
                      onChange={(event) => handleWidthSliderChange(Number(event.target.value))}
                      className="w-full accent-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Rotation ({Math.round(selectedImage.rotation)}°)
                    </label>
                    <input
                      type="range"
                      min={-180}
                      max={180}
                      step={1}
                      value={Math.round(selectedImage.rotation)}
                      onChange={(event) => handleRotationInputChange(Number(event.target.value))}
                      className="w-full accent-blue-600"
                    />
                  </div>
                  <div className="md:col-span-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleDuplicateImage}
                      className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 border border-gray-200 rounded-md hover:bg-gray-200 transition-colors"
                    >
                      Duplicate
                    </button>
                    <button
                      type="button"
                      onClick={handleResetImagePosition}
                      className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 border border-gray-200 rounded-md hover:bg-gray-200 transition-colors"
                    >
                      Center & Reset
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReorderImage(selectedImage.id, 'front')}
                      className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 border border-gray-200 rounded-md hover:bg-gray-200 transition-colors"
                    >
                      Bring Above Text
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReorderImage(selectedImage.id, 'forward')}
                      className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 border border-gray-200 rounded-md hover:bg-gray-200 transition-colors"
                    >
                      Move Forward
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReorderImage(selectedImage.id, 'backward')}
                      className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 border border-gray-200 rounded-md hover:bg-gray-200 transition-colors"
                    >
                      Move Backward
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReorderImage(selectedImage.id, 'back')}
                      className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 border border-gray-200 rounded-md hover:bg-gray-200 transition-colors"
                    >
                      Send Behind Text
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(selectedImage.id)}
                      className="px-3 py-1.5 text-xs font-medium text-white bg-red-500 border border-red-500 rounded-md hover:bg-red-600 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}
            </div>
        </div>
      </div>

      <div className="mb-6 bg-white rounded-lg border border-gray-200 p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Field Layout Controls</h3>
          <p className="text-xs text-gray-600">
            Toggle to reposition price, barcode, brand, and description directly on the label. Changes apply to every label.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isFieldEditing && (
            <button
              type="button"
              onClick={() => setFieldLayout(cloneFieldLayout(DEFAULT_FIELD_LAYOUT))}
              className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-100"
            >
              Reset Layout
            </button>
          )}
          <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
            <input
              type="checkbox"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              checked={isFieldEditing}
              onChange={(event) => setIsFieldEditing(event.target.checked)}
            />
            Enable field positioning
          </label>
        </div>
      </div>

      {!hasSelectedTemplate && (
        <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Choose a label template to match your sheet layout. Hints can be toggled in the banner above.
        </div>
      )}

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
              💡 <strong>IMPORTANT:</strong> In the print dialog, set margins to &quot;None&quot; (or &quot;Minimum&quot;), scale to &quot;100%&quot; or &quot;Actual size&quot;, and disable headers/footers. The browser print preview may show extra margins that won&apos;t appear in the actual print/PDF.
            </div>
      </div>

          {/* Label Grid */}
          {hasSelectedTemplate && selectedProducts.size > 0 && (
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
                    size: ${selectedTemplate.pageWidth}in ${selectedTemplate.pageHeight}in !important;
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
                      page-break-after: auto !important;
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
                    .label-page[data-is-last="false"] {
                      page-break-after: always !important;
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
                    .label-template .react-rnd__handle,
                    .label-template .label-image-handle {
                      display: none !important;
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
                  applyImagesToAll={applyImagesToAll}
                  globalImages={globalLabelImages}
                  labelImages={labelImageMap}
                  onLabelClick={handleLabelClick}
                  activeLabelIndex={activeLabelIndex}
                  onImageChange={handleImageChange}
                  onImageSelect={handleImageSelect}
                  activeImageId={activeImageId}
                  draggingImageId={draggingImageId}
                  onImageDrop={handleImageDrop}
                  barcodeFormat={barcodeFormat}
                  fieldLayout={effectiveFieldLayout}
                  isFieldEditing={isFieldEditing}
                  onFieldLayoutChange={handleFieldLayoutChange}
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

