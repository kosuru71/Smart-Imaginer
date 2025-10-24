export interface ImageFile {
  base64: string;
  mimeType: string;
}

export interface HistoryEntry {
  id: string;
  imageUrl: string;
  fileName: string;
  date: string;
}

export type AspectRatio = '1:1' | '16:9' | '9:16';
