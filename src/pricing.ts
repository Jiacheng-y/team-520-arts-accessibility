export const pricingExperiment = 'museum-pricing-v1';
export type PricingVariant = 'inquiry' | 'pilot';
type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem'>;
export function assignPricing(storage: Storage, random = Math.random): PricingVariant {
  const key = `btf:${pricingExperiment}`;
  try {
    const saved = storage.getItem(key);
    if (saved === 'inquiry' || saved === 'pilot') return saved;
  } catch { /* Storage is optional. */ }
  const offer = random() < .5 ? 'inquiry' : 'pilot';
  try { storage.setItem(key, offer); } catch { /* Retain in memory. */ }
  return offer;
}
export function directAssignment(pathname: string) {
  const match = pathname.match(/\/museums\/(mobile|device)\/(inquiry|pilot)\/?$/);
  return match ? {variant: match[1] as 'mobile' | 'device', pricing_variant: match[2] as PricingVariant} : null;
}
export const offers = {
  inquiry: {
    title: 'Let’s shape your museum or gallery collaboration.',
    summary: 'Interested in bringing Beyond the Frame to your exhibition? Submit the form to discuss collaboration and receive a quotation to set up an exhibition pilot at your museum or gallery.',
    cta: 'Request collaboration & quotation',
    detail: 'Tell us about your museum or gallery. We’ll follow up to discuss your exhibition, collaboration opportunities, and a tailored quotation.',
  },
  pilot: {
    title: '$1,000 for a 30-day exhibition pilot at your museum or gallery.',
    summary: 'For museums and galleries: $1,000 to set up a 30-day Beyond the Frame exhibition pilot at your venue. Bring a new way to explore to your exhibition.',
    cta: 'Inquire about the $1,000 pilot',
    detail: 'The $1,000 price is for museums and galleries to set up a 30-day exhibition pilot at their venue. We’ll confirm the artwork selection, equipment arrangements, timing, and scope with your team before you commit.',
  },
} as const;
