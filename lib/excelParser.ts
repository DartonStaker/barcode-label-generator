import * as XLSX from 'xlsx';

export interface Product {
  code?: string;
  description?: string;
  price?: string | number;
  [key: string]: any;
}

export async function parseExcelFile(file: File): Promise<Product[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          reject(new Error('File is empty or could not be read'));
          return;
        }

        // Try reading as array buffer first (better for .xlsx), fallback to binary
        let workbook: XLSX.WorkBook;
        try {
          if (data instanceof ArrayBuffer) {
            workbook = XLSX.read(data, { type: 'array' });
          } else {
            workbook = XLSX.read(data, { type: 'binary' });
          }
        } catch (err) {
          reject(new Error(`Failed to parse Excel file: ${err instanceof Error ? err.message : 'Unknown error'}`));
          return;
        }
        
        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          reject(new Error('Excel file has no sheets'));
          return;
        }
        
        // Get the first sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        if (!worksheet) {
          reject(new Error('Could not read worksheet data'));
          return;
        }
        
        // Convert to JSON with headers
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1,
          defval: '',
          blankrows: false
        }) as any[][];
        
        if (!jsonData || jsonData.length === 0) {
          reject(new Error('Excel sheet is empty'));
          return;
        }
        
        // Find header row (first non-empty row)
        let headerRowIndex = 0;
        for (let i = 0; i < Math.min(5, jsonData.length); i++) {
          const row = jsonData[i];
          if (row && row.some(cell => cell && String(cell).trim() !== '')) {
            headerRowIndex = i;
            break;
          }
        }
        
        const headers = (jsonData[headerRowIndex] || []).map((h: any) => 
          String(h || '').trim()
        );
        
        if (headers.length === 0 || headers.every(h => !h)) {
          reject(new Error('Could not find column headers in Excel file'));
          return;
        }
        
        // Log all headers found for debugging
        console.log('All Excel headers found:', headers);
        
        // Normalize header names (case-insensitive matching)
        const normalizedHeaders = headers.map(h => h.toLowerCase());
        
        // Find common column indices
        const findColumnIndex = (variations: string[]): number => {
          for (const variation of variations) {
            const index = normalizedHeaders.findIndex(h => 
              h.includes(variation.toLowerCase()) || variation.toLowerCase().includes(h)
            );
            if (index !== -1) return index;
          }
          return -1;
        };
        
        const codeIndex = findColumnIndex(['barcode numbers', 'barcode number', 'code', 'sku', 'product code', 'item code', 'barcode', 'identifier']);
        const descIndex = findColumnIndex(['description', 'item', 'product', 'name', 'title', 'product name', 'product description']);
        const priceIndex = findColumnIndex(['price', 'cost', 'unit price', 'amount', 'selling price', 'retail price', 'list price']);
        
        // Debug: Log found indices
        console.log('Column indices:', { codeIndex, descIndex, priceIndex, headers });
        
        const products: Product[] = [];
        
        // Process each data row (start after header row)
        for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.length === 0) continue;
          
          // Check if row is empty
          const hasData = row.some((cell: any) => {
            const val = String(cell || '').trim();
            return val !== '' && val !== null && val !== undefined;
          });
          
          if (!hasData) continue;
          
          const product: Product = {};
          
          // Map all columns to product object (preserve all data)
          headers.forEach((header, index) => {
            if (header && header.trim()) {
              const value = row[index];
              // Store with original header name
              product[header.trim()] = value !== undefined && value !== null ? value : '';
              // Also store with normalized key for easier access
              const normalizedKey = header.trim().toLowerCase().replace(/\s+/g, '');
              if (normalizedKey) {
                product[normalizedKey] = value !== undefined && value !== null ? value : '';
              }
            } else {
              // Column without header - check if it has data
              const value = row[index];
              if (value !== undefined && value !== null && String(value).trim() !== '') {
                // Store by column index (A=0, B=1, C=2, D=3, E=4, F=5, etc.)
                const columnLetter = String.fromCharCode(65 + index); // A, B, C, D, E, F...
                product[`Column${columnLetter}`] = value;
                product[`col${index}`] = value; // Also store by index
              }
            }
          });
          
          // Also set normalized fields for backward compatibility
          if (codeIndex !== -1 && row[codeIndex]) {
            product.code = String(row[codeIndex]).trim();
          }
          
          // Find description - check Column D (index 3) or search for text values
          if (descIndex !== -1 && row[descIndex]) {
            product.description = String(row[descIndex]).trim();
          } else {
            // Check Column D (index 3) specifically
            if (row[3] !== undefined && row[3] !== null && String(row[3]).trim() !== '') {
              product.description = String(row[3]).trim();
            } else {
              // Search all columns for text that looks like a description
              for (let i = 0; i < row.length; i++) {
                const value = row[i];
                if (value && String(value).trim() && 
                    !String(value).match(/^\d+$/) && // Not just numbers
                    !String(value).includes('R') && // Not a price
                    String(value).length > 1 && String(value).length < 50) {
                  // Could be a description
                  const header = headers[i] || '';
                  if (!header.toLowerCase().includes('barcode') && 
                      !header.toLowerCase().includes('code') &&
                      !header.toLowerCase().includes('price')) {
                    product.description = String(value).trim();
                    break;
                  }
                }
              }
            }
          }
          
          // Find price - check Column F (index 5) or search for R-prefixed values
          if (priceIndex !== -1 && row[priceIndex]) {
            const priceValue = row[priceIndex];
            product.price = priceValue;
          } else {
            // Check Column F (index 5) specifically
            if (row[5] !== undefined && row[5] !== null && String(row[5]).trim() !== '') {
              const priceValue = row[5];
              if (String(priceValue).includes('R') || typeof priceValue === 'number') {
                product.price = priceValue;
              }
            } else {
              // Search all columns for price-like values
              for (let i = 0; i < row.length; i++) {
                const value = row[i];
                if (value && String(value).includes('R')) {
                  product.price = value;
                  break;
                }
              }
            }
          }
          
          // Add product if it has at least some data (be more lenient)
          const hasCode = codeIndex !== -1 && row[codeIndex] && String(row[codeIndex]).trim();
          const hasDescription = descIndex !== -1 && row[descIndex] && String(row[descIndex]).trim();
          const hasAnyData = Object.values(product).some(val => val && String(val).trim() !== '');
          
          if (hasCode || hasDescription || hasAnyData) {
            products.push(product);
          }
        }
        
        // Debug logging - show first product for debugging
        if (products.length > 0) {
          console.log('Excel parsing debug:', {
            totalRows: jsonData.length,
            headerRowIndex,
            headers: headers.filter(h => h),
            codeIndex,
            descIndex,
            priceIndex,
            productsFound: products.length,
            firstProduct: products[0],
            allProductKeys: Object.keys(products[0] || {})
          });
        }

        if (products.length === 0) {
          const headerList = headers.filter(h => h).join(', ');
          reject(new Error(
            `No products found. Found ${jsonData.length} total rows with headers: ${headerList || 'none'}. ` +
            `Please ensure your Excel file has product data rows below the header row. ` +
            `Detected columns: ${headerList || 'Could not detect column headers'}`
          ));
          return;
        }
        
        resolve(products);
      } catch (error) {
        reject(new Error(
          `Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`
        ));
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file. The file may be corrupted or read-only protected.'));
    
    // Try reading as ArrayBuffer first (better for .xlsx files)
    if (file.name.toLowerCase().endsWith('.xlsx')) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsBinaryString(file);
    }
  });
}

