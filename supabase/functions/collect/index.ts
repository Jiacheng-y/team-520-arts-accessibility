import { createClient } from 'npm:@supabase/supabase-js@2';
import { parseSubmission } from '../_shared/validation.ts';
const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
async function hash(value: string) { const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)); return Array.from(new Uint8Array(digest)).map(x => x.toString(16).padStart(2, '0')).join(''); }
Deno.serve(async (req: Request) => {
    const origin = req.headers.get('origin') || '';
    const allowed = (Deno.env.get('ALLOWED_ORIGINS') || '').split(',').map(x => x.trim()).filter(Boolean);
    const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : 'null', 'Access-Control-Allow-Headers': 'content-type,apikey,authorization,x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Vary': 'Origin', 'Cache-Control': 'no-store' };
    const respond = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers });
    if (!allowed.includes(origin))
        return respond({ error: 'Origin not allowed' }, 403);
    if (req.method === 'OPTIONS')
        return new Response(null, { status: 204, headers });
    if (req.method !== 'POST')
        return respond({ error: 'Method not allowed' }, 405);
    try {
        // Bound the streamed body before parsing; Content-Length alone is untrusted.
        const reader = req.body?.getReader();
        if (!reader)
            return respond({ error: 'Missing body' }, 400);
        let raw = '';
        let bytes = 0;
        const decoder = new TextDecoder();
        while (true) {
            const { done, value } = await reader.read();
            if (done)
                break;
            bytes += value.length;
            if (bytes > 8192) {
                await reader.cancel();
                return respond({ error: 'Request too large' }, 413);
            }
            raw += decoder.decode(value, { stream: true });
        }
        raw += decoder.decode();
        const data = parseSubmission(JSON.parse(raw));
        const secret = Deno.env.get('RATE_LIMIT_SALT');
        if (!secret)
            return respond({ error: 'Service not configured' }, 503);
        // Store only a daily salted hash, never the raw address. Configure trusted proxy headers on self-hosted deployments.
        const address = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
        const bucket = await hash(`${secret}:${data.kind}:${new Date().toISOString().slice(0, 10)}:${address}`);
        const { data: permitted, error: rateError } = await db.rpc('consume_rate_limit', { bucket_key: bucket, request_limit: data.kind === 'visit' ? 120 : 30 });
        if (rateError)
            throw rateError;
        if (!permitted)
            return respond({ error: 'Rate limited' }, 429);
        if (data.kind === 'visit') {
            const { error } = await db.from('analytics_events').upsert({ id: data.event_id, visitor_id: data.visitor_id, attribution: data.attribution }, { onConflict: 'id', ignoreDuplicates: true });
            if (error)
                throw error;
            return respond({ ok: true });
        }
        if (data.kind === 'signup') {
            const receipt = data.receipt!;
            if (data.website)
                return respond({ ok: true, receipt });
            // Retries reuse the same client receipt. A different submission cannot replace an existing receipt.
            const { error } = await db.from('waitlist_signups').upsert({ email: data.email, audience: data.audience, organization: data.organization, role: data.role, visitor_id: data.visitor_id, attribution: data.attribution, receipt_hash: await hash(receipt), consent_version: '2026-11-09' }, { onConflict: 'email', ignoreDuplicates: true });
            if (error)
                throw error;
            return respond({ ok: true, receipt });
        }
        const receiptHash = await hash(data.receipt!);
        if (data.kind === 'delete') {
            const { error } = await db.rpc('delete_signup_by_receipt', { receipt_digest: receiptHash });
            if (error)
                throw error;
            return respond({ ok: true });
        }
        const { data: signup, error: lookupError } = await db.from('waitlist_signups').select('id').eq('receipt_hash', receiptHash).eq('audience', 'museum').maybeSingle();
        if (lookupError)
            throw lookupError;
        if (signup) {
            const { error } = await db.from('qualification_responses').upsert({ signup_id: signup.id, challenge: data.challenge, preference: data.preference, paid_pilot: data.paid_pilot, budget: data.budget }, { onConflict: 'signup_id' });
            if (error)
                throw error;
        }
        return respond({ ok: true });
    }
    catch (error) {
        if (error instanceof SyntaxError || error instanceof Error && /Invalid|Missing|Consent/.test(error.message))
            return respond({ error: 'Invalid submission' }, 400);
        console.error('collect request failed');
        return respond({ error: 'Unable to process request' }, 500);
    }
});
