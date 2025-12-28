export type LabelImageLayer = 'foreground' | 'background';

export interface LabelImage {
  id: string;
  src: string;
  x: number; // 0 - 1 (percentage of label width)
  y: number; // 0 - 1 (percentage of label height)
  width: number; // 0 - 1 (percentage of label width)
  height: number; // 0 - 1 (percentage of label height)
  rotation: number; // degrees
  zIndex: number;
  layer?: LabelImageLayer;
}

export type LabelImageUpdate = Partial<Omit<LabelImage, 'id' | 'src'>>;


