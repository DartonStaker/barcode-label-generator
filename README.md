# Barcode Label Generator

A web application for generating barcode labels from Excel price list data, matching the LSA-65 template layout.

## Features

- 📊 Upload and parse Excel files (.xlsx, .xls)
- 🏷️ Generate barcode labels automatically in grid layouts
- 📄 Export labels as PDF for printing
- 🎨 Multiple template options (LSA-65 and custom)
- 📐 Configurable labels per page
- 🔄 Bottom-to-top, left-to-right label arrangement
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
2. **Select Template**: Choose from available templates (LSA-65 or Custom)
3. **Configure Labels**: Set how many labels per page (defaults to maximum)
4. **Review Products**: The system will automatically parse and display all products in a grid
5. **Generate Labels**: Labels are arranged bottom-to-top, left-to-right
6. **Print/Export**: Click "Print/Export PDF" to generate printable labels

## Label Templates

### LSA-65 Template
- **Layout**: 7 rows × 4 columns (28 labels per page)
- **Page Size**: 8.5" × 11" (Letter)
- **Label Size**: ~2" × 1.57" (auto-calculated to fit grid)
- **Arrangement**: Bottom-to-top, left-to-right

### Custom Template
- Configurable grid layout
- Adjustable label dimensions
- Flexible spacing options

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
- **Supabase** - Database and backend
- **SheetJS (xlsx)** - Excel file parsing
- **jsbarcode** - Barcode generation
- **react-to-print** - PDF export

## Deployment

This application is configured for deployment on Vercel with Supabase integration.

### Quick Deploy

1. **Set up Supabase** (see [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions)
   - Create a Supabase project
   - Run the migration SQL to create the `products` table
   - Get your Supabase URL and anon key

2. **Deploy to Vercel**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your GitHub repository
   - Add environment variables:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Click Deploy

3. **Your app is live!** 🎉

For detailed step-by-step instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md)

## License

MIT
