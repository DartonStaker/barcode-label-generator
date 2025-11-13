export interface LabelTemplate {
  id: string;
  name: string;
  description: string;
  labelWidth: number; // in inches
  labelHeight: number; // in inches
  columns: number;
  rows: number;
  pageWidth: number; // in inches (e.g., 8.5 for letter)
  pageHeight: number; // in inches (e.g., 11 for letter)
  marginTop: number; // in inches
  marginBottom: number; // in inches
  marginLeft: number; // in inches
  marginRight: number; // in inches
  gapHorizontal: number; // gap between labels horizontally in inches
  gapVertical: number; // gap between labels vertically in inches
  horizontalPitch?: number; // distance from left edge of one label to next (in inches)
  verticalPitch?: number; // distance from top edge of one label to next (in inches)
}

export const AVAILABLE_TEMPLATES: LabelTemplate[] = [
  {
    id: 'lsa-65',
    name: '65 UP Label Template',
    description: '13 rows x 5 columns (65 labels per page) - Matches physical label sheet with Word dialog pitches',
    // Physical label sheet measurements (extracted from Word template):
    // Top margin: 11.59 mm (657 twips), Bottom margin: 10.02 mm (~0.394")
    // Side margins: 9.4 mm (533 twips)
    // Label width: 38.2 mm (2166 twips), Label height: 21.2 mm (1201 twips)
    // Word dialog specifications:
    // Vertical pitch: 21.2 mm, Horizontal pitch: 38.2 mm
    // Number across: 5, Number down: 13
    labelWidth: 1.5034722222, // 2166 twips = 1.503472" (38.19 mm)
    labelHeight: 0.8340277778, // 1201 twips = 0.834028" (21.18 mm)
    columns: 5,
    rows: 13,
    // Use A4 page size to prevent Chrome from adding margins when printing PDFs
    // A4: 21 cm x 29.7 cm = 8.26771653543307" x 11.69291338582677"
    // Content will be scaled to match physical margins
    pageWidth: 8.26771653543307, // A4 width: 21 cm = exactly 8.26771653543307 inches
    pageHeight: 11.69291338582677, // A4 height: 29.7 cm = exactly 11.69291338582677 inches
    marginTop: 0.52, // Additional downward shift so top rows match final adjustments
    marginBottom: 0.37, // Large upward adjustment (double final nudge) so last row sits cleanly
    marginLeft: 0.45, // Increased left margin for requested shift
    marginRight: 0.27, // Reduced right margin so content moves closer to edge
    gapHorizontal: 0, // Horizontal pitch = label width, so no gap between labels
    gapVertical: 0, // Vertical pitch = label height, so no gap between labels
    horizontalPitch: 1.5034722222, // Matches table column width (2166 twips)
    verticalPitch: 0.8340277778, // Matches table row height (1201 twips)
  },
  {
    id: '2-4-6-10-18-32-45',
    name: '2,4,6,10,18,32,45 Label Template',
    description: '9 rows x 5 columns (45 labels per page) - Flexible template supporting various label counts',
    // A4 page size for consistent printing
    pageWidth: 8.26771653543307, // A4 width: 21 cm = exactly 8.26771653543307 inches
    pageHeight: 11.69291338582677, // A4 height: 29.7 cm = exactly 11.69291338582677 inches
    // Label dimensions - similar to 65 UP template but adjusted for 9 rows
    labelWidth: 1.5034722222, // ~38.19 mm
    labelHeight: 0.8340277778, // ~21.18 mm
    columns: 5,
    rows: 9,
    // Margins - similar to 65 UP template
    marginTop: 0.52,
    marginBottom: 0.37,
    marginLeft: 0.45,
    marginRight: 0.27,
    gapHorizontal: 0, // Horizontal pitch = label width, so no gap between labels
    gapVertical: 0, // Vertical pitch = label height, so no gap between labels
    horizontalPitch: 1.5034722222, // Matches label width
    verticalPitch: 0.8340277778, // Matches label height
  },
  {
    id: 'custom',
    name: 'Custom Template',
    description: 'Customizable grid layout',
    labelWidth: 4,
    labelHeight: 2,
    columns: 2,
    rows: 5,
    pageWidth: 8.5,
    pageHeight: 11,
    marginTop: 0.5,
    marginBottom: 0.5,
    marginLeft: 0.5,
    marginRight: 0.5,
    gapHorizontal: 0.125,
    gapVertical: 0.125,
  },
];

export function getTemplateById(id: string): LabelTemplate | undefined {
  return AVAILABLE_TEMPLATES.find(t => t.id === id);
}

export function calculateLabelPositions(
  template: LabelTemplate,
  labelsPerPage?: number
): Array<{ row: number; col: number }> {
  const totalCells = template.columns * template.rows;
  
  // If labelsPerPage is 0 or undefined with no explicit request, return empty
  // Otherwise, respect labelsPerPage if specified, or use all positions
  if (labelsPerPage === 0) {
    return [];
  }
  
  const maxLabels = labelsPerPage || totalCells;
  const labelsToShow = Math.min(maxLabels, totalCells);
  
  const positions: Array<{ row: number; col: number }> = [];
  
  // Fill TOP to BOTTOM, left to right
  // Row 0 represents the top-most physical row on the sheet
  // This ensures label positions fill naturally from the top-left corner
  let count = 0;
  for (let row = 0; row < template.rows && count < labelsToShow; row++) {
    for (let col = 0; col < template.columns && count < labelsToShow; col++) {
      positions.push({ row, col });
      count++;
    }
  }
  
  return positions;
}

export function getLabelPosition(
  template: LabelTemplate,
  row: number,
  col: number
): { left: number; top: number; width: number; height: number } {
  // Use pitch values if available (more accurate for label templates)
  if (template.horizontalPitch && template.verticalPitch) {
    // Calculate grid dimensions (unscaled)
    const gridWidth = ((template.columns - 1) * template.horizontalPitch) + template.labelWidth;
    const gridHeight = ((template.rows - 1) * template.verticalPitch) + template.labelHeight;
    
    // For A4 page size, scale the grid to fill the page with proper margins
    // Target margins: 10mm sides, 11mm bottom, 13mm top
    const a4Width = 8.26771653543307;
    const a4Height = 11.69291338582677;
    const isA4Page = Math.abs(template.pageWidth - a4Width) < 0.001 && Math.abs(template.pageHeight - a4Height) < 0.001;
    
    let scaleX = 1;
    let scaleY = 1;
    let offsetX = 0;
    let offsetY = 0;
    
    if (isA4Page) {
      // Calculate target grid size to achieve physical margins
      const targetWidth = a4Width - template.marginLeft - template.marginRight; // A4 - 10mm - 10mm
      const targetHeight = a4Height - template.marginTop - template.marginBottom; // A4 - 13mm - 11mm
      
      // Scale grid to fill target area
      // Scale independently: fill width, fit height (non-uniform scaling to maximize size)
      scaleX = targetWidth / gridWidth;
      scaleY = targetHeight / gridHeight;
      
      // Position grid to achieve target margins
      // Left margin: 10mm, Top margin: 13mm
      offsetX = template.marginLeft;
      offsetY = template.marginTop;
      
      // If scaled grid is smaller than target, center it (shouldn't happen with independent scaling)
      const scaledGridWidth = gridWidth * scaleX;
      const scaledGridHeight = gridHeight * scaleY;
      const extraWidth = targetWidth - scaledGridWidth;
      const extraHeight = targetHeight - scaledGridHeight;
      if (extraWidth > 0) {
        offsetX += extraWidth / 2;
      }
      if (extraHeight > 0) {
        offsetY += extraHeight / 2;
      }
    }
    
    const left = offsetX + (col * template.horizontalPitch * scaleX);
    // Calculate top position: row 0 at the physical top margin, rows increase downward
    const top = offsetY + (row * template.verticalPitch * scaleY);
    
    // Apply scale to label dimensions
    const scaledWidth = template.labelWidth * scaleX;
    const scaledHeight = template.labelHeight * scaleY;
    
    return {
      left: left,
      top: top,
      width: scaledWidth,
      height: scaledHeight,
    };
  }
  
  // Fallback to calculated positioning
  const availableWidth = template.pageWidth - template.marginLeft - template.marginRight;
  const availableHeight = template.pageHeight - template.marginTop - template.marginBottom;
  
  const totalGapWidth = template.gapHorizontal * (template.columns - 1);
  const totalGapHeight = template.gapVertical * (template.rows - 1);
  
  const labelAreaWidth = availableWidth - totalGapWidth;
  const labelAreaHeight = availableHeight - totalGapHeight;
  
  // Calculate actual label dimensions based on available space
  const calculatedLabelWidth = labelAreaWidth / template.columns;
  const calculatedLabelHeight = labelAreaHeight / template.rows;
  
  // Use template dimensions if they fit, otherwise use calculated
  const labelWidth = Math.min(template.labelWidth, calculatedLabelWidth);
  const labelHeight = Math.min(template.labelHeight, calculatedLabelHeight);
  
  // Calculate spacing between labels
  const spacingX = template.columns > 1 
    ? (availableWidth - (labelWidth * template.columns)) / (template.columns - 1)
    : 0;
  const spacingY = template.rows > 1
    ? (availableHeight - (labelHeight * template.rows)) / (template.rows - 1)
    : 0;
  
  const left = template.marginLeft + (col * (labelWidth + spacingX));
  const top = template.marginTop + (row * (labelHeight + spacingY));
  
  // Ensure positions don't exceed page boundaries
  const maxWidth = template.pageWidth - left - template.marginRight;
  const maxHeight = template.pageHeight - top - template.marginBottom;
  
  return {
    left: Math.max(0, Math.min(left, template.pageWidth - labelWidth)),
    top: Math.max(0, Math.min(top, template.pageHeight - labelHeight)),
    width: Math.min(labelWidth, maxWidth),
    height: Math.min(labelHeight, maxHeight),
  };
}

