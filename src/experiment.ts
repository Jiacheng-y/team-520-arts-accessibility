export const experiment = 'product-format-v1';
export const variants = ['worksheet', 'mobile', 'device'] as const;
export type Variant = typeof variants[number];
type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem'>;
export function assignVariant(storage: Storage, random = Math.random): Variant {
  const key = `btf:${experiment}`;
  try {
    const saved = storage.getItem(key);
    if (variants.includes(saved as Variant)) return saved as Variant;
  } catch { /* Assignment still works when storage is blocked. */ }
  const variant = variants[Math.floor(random() * variants.length)];
  try { storage.setItem(key, variant); } catch { /* Keep the assignment in memory. */ }
  return variant;
}
let current: Variant | undefined;
export function assignedVariant(): Variant {
  if (!current) {
    // Access localStorage inside the guarded methods: even its getter can throw.
    current = assignVariant({getItem: key => localStorage.getItem(key), setItem: (key, value) => localStorage.setItem(key, value)});
  }
  return current;
}
export function experimentAttribution() { return {experiment, variant: assignedVariant()}; }
