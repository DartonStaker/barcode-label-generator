# Setup Instructions

## Quick Start

1. **Install Dependencies**
   ```powershell
   npm install
   ```

2. **Run Development Server**
   ```powershell
   npm run dev
   ```

3. **Open Browser**
   Navigate to `http://localhost:3000`

## Excel File Format

The application expects an Excel file with the following columns (column names are case-insensitive and flexible):

### Required Fields:
- **Product Code** (variations: `code`, `Code`, `CODE`, `SKU`)
  - Used to generate barcodes
  - Must be unique for each product

### Recommended Fields:
- **Description** (variations: `description`, `Description`, `DESCRIPTION`, `Item`)
  - Product name or description
  - Displayed prominently on the label

- **Price** (variations: `price`, `Price`, `PRICE`, `Unit Price`)
  - Product price
  - Can be a number or formatted string

### Additional Fields:
- Any other columns will be displayed as additional product information
- Maximum 3 additional fields shown per label

## Label Template

The label template matches the LSA-65 format:
- **Size**: 6.5" × 4" (standard label size)
- **Layout**: 
  - Product description at top
  - Barcode in center
  - Product code below barcode
  - Price (if available)
  - Additional product details

## Printing

1. Click "Print/Export PDF" button
2. Use browser's print dialog
3. Select "Save as PDF" or print directly
4. Ensure page size is set to 6.5" × 4" in print settings

## Troubleshooting

### Excel File Not Loading
- Ensure file is .xlsx or .xls format
- Check that file contains data rows (not just headers)
- Verify at least one column contains product codes

### Barcodes Not Generating
- Ensure product codes are valid (alphanumeric, no special characters)
- Check browser console for errors
- Verify jsbarcode library is installed

### Labels Not Printing Correctly
- Check print preview before printing
- Ensure page size is 6.5" × 4"
- Disable headers/footers in print settings
- Use "Fit to page" option if needed

