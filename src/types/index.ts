// Path: src/types/index.ts
export interface AssetPhoto {
  id: string;
  assetId: string;
  url: string;
  caption?: string | null;
  isPrimary: boolean;
  order: number;
  createdAt: string;
}
