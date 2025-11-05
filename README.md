# Barcode Label Generator

A web application for generating barcode labels from Excel price list data, matching the LSA-65 template layout.

## Features

- 📊 Upload and parse Excel files (.xlsx, .xls)
- 🏷️ Generate barcode labels automatically
- 📄 Export labels as PDF for printing
- 🎨 Template layout matching LSA-65 format
- ✨ Modern, user-friendly interface

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

1. **Upload Excel File**: Click "Upload Excel File" and select your Summer 2025 Price List.xls file
2. **Review Products**: The system will automatically parse and display all products
3. **Generate Labels**: Barcodes are automatically generated for each product
4. **Print/Export**: Click "Print/Export PDF" to generate printable labels

## File Format

The Excel file should contain columns for:
- Product Code (will be used for barcode)
- Description
- Price
- Any additional product information

The system will automatically detect common column name variations.

## Tech Stack

- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **SheetJS (xlsx)** - Excel file parsing
- **jsbarcode** - Barcode generation
- **react-to-print** - PDF export

## Deployment

This application is configured for deployment on Vercel:

1. Push your code to GitHub
2. Import the repository in Vercel
3. Deploy automatically

## License

MIT

