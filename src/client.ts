import { createClient } from '@supabase/supabase-js';
export const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
export const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
export const configured = Boolean(url && key);
export const supabase = configured ? createClient(url!, key!) : null;
export async function collect(payload: unknown): Promise<{
    receipt?: string;
}> {
    if (!configured)
        throw new Error('The waitlist is not open yet. Please check back soon.');
    const response = await fetch(`${url}/functions/v1/collect`, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: key! }, body: JSON.stringify(payload), signal: AbortSignal.timeout(15000) });
    if (!response.ok)
        throw new Error(response.status === 429 ? 'Too many requests. Please wait a few minutes and try again.' : 'We couldn’t save that. Please check your details and try again.');
    return response.json();
}
export function errorMessage(error: unknown) { return error instanceof Error ? error.message : 'Something went wrong. Please try again.'; }
