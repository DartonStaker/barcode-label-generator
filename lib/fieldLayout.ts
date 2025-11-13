export type LabelFieldKey = 'price' | 'code' | 'barcode' | 'line1' | 'line2';

export interface FieldPlacement {
  x: number; // 0-1
  y: number; // 0-1
  width: number; // 0-1
  height: number; // 0-1
}

export type FieldLayout = Record<LabelFieldKey, FieldPlacement>;

export const DEFAULT_FIELD_LAYOUT: FieldLayout = {
  price: {
    x: 0.05,
    y: 0.03,
    width: 0.9,
    height: 0.12,
  },
  code: {
    x: 0.1,
    y: 0.18,
    width: 0.8,
    height: 0.08,
  },
  barcode: {
    x: 0.08,
    y: 0.27,
    width: 0.84,
    height: 0.38,
  },
  line1: {
    x: 0.06,
    y: 0.7,
    width: 0.88,
    height: 0.12,
  },
  line2: {
    x: 0.06,
    y: 0.82,
    width: 0.88,
    height: 0.12,
  },
};


