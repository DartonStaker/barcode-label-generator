import { createClient } from './client';
import { Product } from '../excelParser';

export async function saveProductsToSupabase(products: Product[]): Promise<void> {
  const supabase = createClient();
  
  // Transform products to match database schema
  const productsToInsert = products.map((product) => {
    const code = product.code || product.Code || product.CODE || product.SKU || '';
    const description = product.description || product.Description || product.DESCRIPTION || product.Item || '';
    const price = product.price || product.Price || product.PRICE || product['Unit Price'] || '';
    
    return {
      code: code || null,
      description: description || null,
      price: typeof price === 'number' ? price.toString() : (price?.toString() || null),
      data: product as any, // Store full product data as JSON
    };
  });

  // Delete existing products first (optional - you might want to keep them)
  // await supabase.from('products').delete().neq('id', '');

  // Insert new products
  const { error } = await supabase
    .from('products')
    .upsert(productsToInsert, { 
      onConflict: 'code',
      ignoreDuplicates: false 
    });

  if (error) {
    throw new Error(`Failed to save products to Supabase: ${error.message}`);
  }
}

export async function getProductsFromSupabase(): Promise<Product[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch products from Supabase: ${error.message}`);
  }

  // Transform database rows back to Product format
  return (data || []).map((row) => {
    const product: Product = {
      code: row.code || '',
      description: row.description || '',
      price: row.price || '',
    };

    // Merge additional data from JSON field
    if (row.data && typeof row.data === 'object') {
      Object.assign(product, row.data);
    }

    return product;
  });
}

export async function deleteProductFromSupabase(id: string): Promise<void> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to delete product from Supabase: ${error.message}`);
  }
}

