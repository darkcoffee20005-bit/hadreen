declare module 'subset-font' {
  export default function subsetFont(
    font: Buffer | Uint8Array,
    text: string | undefined,
    options?: {
      targetFormat?: 'sfnt' | 'woff' | 'woff2' | 'truetype';
      preserveNameIds?: number[];
      variationAxes?: Record<string, number | { min: number; max: number; default?: number }>;
      noLayoutClosure?: boolean;
    },
  ): Promise<Buffer>;
}
