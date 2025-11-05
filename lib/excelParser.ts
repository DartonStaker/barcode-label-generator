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
        const workbook = XLSX.read(data, { type: 'binary' });
        
        // Get the first sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1,
          defval: ''
        });
        
        // Assume first row is headers
        if (jsonData.length === 0) {
          resolve([]);
          return;
        }
        
        const headers = jsonData[0] as string[];
        const products: Product[] = [];
        
        // Process each row
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i] as any[];
          if (!row || row.length === 0) continue;
          
          const product: Product = {};
          headers.forEach((header, index) => {
            if (header) {
              product[header.trim()] = row[index] || '';
            }
          });
          
          // Only add products that have at least a code or description
          if (product.code || product.description || product.Code || product.Description) {
            products.push(product);
          }
        }
        
        resolve(products);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsBinaryString(file);
  });
}

