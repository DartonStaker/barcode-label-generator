export type EncodingType = 'code128' | 'ean13';

export interface EncodingOption {
  label: string;
  description: string;
  helperText: string;
  barcodeFormat: 'CODE128' | 'EAN13';
  templateFileName: string;
  instructions: string[];
}

export const ENCODING_OPTIONS: Record<EncodingType, EncodingOption> = {
  code128: {
    label: 'CODE-128',
    description: 'General-purpose alphanumeric encoding (e.g. Amazon FBA, internal logistics).',
    helperText: 'Codes may include letters, digits, spaces, and symbols. Preserve any leading zeros.',
    barcodeFormat: 'CODE128',
    templateFileName: 'barcode-import-template-code128.xlsx',
    instructions: [
      '1. Enter each product on a new row starting from row 2.',
      '2. Column A (Barcode Numbers): CODE-128 values. Letters, digits, spaces, and symbols are accepted (up to 48 characters).',
      '3. Column B (Brand): Brand name that appears above the description on the label.',
      '4. Column D (Description): Product name or description that appears on the label.',
      '5. Column F (Price (R)): Selling price (numbers or values like "R 65.00").',
      '6. Leave other columns blank—they are reserved to match the original Summer 2025 Price List layout.',
      '7. Save the file and import it using the Upload Excel File control on the main page.',
    ],
  },
  ean13: {
    label: 'EAN-13',
    description: '13-digit retail barcodes (e.g. Takealot, supermarket supply).',
    helperText: 'Codes must contain exactly 13 numeric digits, including the check digit.',
    barcodeFormat: 'EAN13',
    templateFileName: 'barcode-import-template-ean13.xlsx',
    instructions: [
      '1. Enter each product on a new row starting from row 2.',
      '2. Column A (Barcode Numbers): 13-digit EAN-13 barcode (numbers only, include the check digit).',
      '3. Column B (Brand): Brand name that appears above the description on the label.',
      '4. Column D (Description): Product name or description that appears on the label.',
      '5. Column F (Price (R)): Selling price (numbers or values like "R 65.00").',
      '6. Leave other columns blank—they are reserved to match the original Summer 2025 Price List layout.',
      '7. Save the file and import it using the Upload Excel File control on the main page.',
    ],
  },
};


