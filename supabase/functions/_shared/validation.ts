type Attribution = {
    source?: string;
    medium?: string;
    campaign?: string;
    ref?: string;
};
export type Submission = {
    kind: string;
    experiment?: string;
    variant?: string;
    pricing_experiment?: string;
    pricing_variant?: string;
    interest?: string;
    email?: string;
    audience?: string;
    organization?: string;
    role?: string;
    consent?: boolean;
    website?: string;
    visitor_id?: string | null;
    event_id?: string;
    receipt?: string;
    challenge?: string;
    preference?: string;
    paid_pilot?: string;
    budget?: string;
    attribution: Attribution;
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function text(value: unknown, max: number, required = false): string { if (value === undefined || value === null)
    value = ''; if (typeof value !== 'string' || value.length > max)
    throw new Error('Invalid field'); const result = value.trim(); if (required && !result)
    throw new Error('Missing field'); return result; }
function choice(value: unknown, values: string[]): string { if (typeof value !== 'string' || !values.includes(value))
    throw new Error('Invalid choice'); return value; }
function id(value: unknown): string { if (typeof value !== 'string' || !uuid.test(value))
    throw new Error('Invalid identifier'); return value; }
export function parseSubmission(input: unknown): Submission {
    if (!input || typeof input !== 'object' || Array.isArray(input))
        throw new Error('Invalid request');
    const x = input as Record<string, unknown>;
    const kind = choice(x.kind, ['signup', 'visit', 'qualify', 'delete']);
    const attribution: Attribution = {};
    if (x.attribution) {
        if (typeof x.attribution !== 'object' || Array.isArray(x.attribution))
            throw new Error('Invalid attribution');
        for (const key of ['source', 'medium', 'campaign', 'ref'] as const) {
            const value = text((x.attribution as Record<string, unknown>)[key], 200);
            if (value)
                attribution[key] = value;
        }
    }
    if (kind === 'delete')
        return { kind, receipt: id(x.receipt), attribution };
    if (kind === 'qualify')
        return { kind, receipt: id(x.receipt), challenge: choice(x.challenge, ['high', 'medium', 'low', 'unknown']), ...(x.interest !== undefined ? {interest: choice(x.interest, ['very', 'somewhat', 'not_now', 'unsure'])} : {preference: choice(x.preference, ['layer', 'audio', 'both', 'unsure'])}), paid_pilot: choice(x.paid_pilot, ['yes', 'maybe', 'no']), budget: text(x.budget, 1000), attribution };
    const assignment = x.experiment !== undefined || x.variant !== undefined
        ? {experiment: choice(x.experiment, ['product-format-v1']), variant: choice(x.variant, ['worksheet', 'mobile', 'device'])} : {};
    const pricing = x.pricing_experiment !== undefined || x.pricing_variant !== undefined
        ? {pricing_experiment: choice(x.pricing_experiment, ['museum-pricing-v1']), pricing_variant: choice(x.pricing_variant, ['inquiry', 'pilot'])} : {};
    if (pricing.pricing_experiment && !['mobile', 'device'].includes(assignment.variant || '')) throw new Error('Invalid pricing concept');
    if (kind === 'visit')
        return { kind, ...assignment, ...pricing, visitor_id: id(x.visitor_id), event_id: id(x.event_id), attribution };
    const email = text(x.email, 254, true).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        throw new Error('Invalid email');
    if (x.consent !== true)
        throw new Error('Consent required');
    const audience = choice(x.audience, ['museum', 'educator', 'visitor', 'other']);
    return { kind, ...assignment, ...pricing, receipt: id(x.receipt), email, audience, organization: text(x.organization, 160, audience === 'museum'), role: text(x.role, 120, audience === 'museum'), consent: true, website: text(x.website, 500), visitor_id: x.visitor_id ? id(x.visitor_id) : null, attribution };
}
