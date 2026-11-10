import { experimentAttribution } from './experiment';
import { collect } from './client';
const prefix = 'btf:';
export function read(key: string): string | null { try {
    return localStorage.getItem(prefix + key);
}
catch {
    return null;
} }
export function write(key: string, value: string) { try {
    localStorage.setItem(prefix + key, value);
}
catch { /* Storage is optional. */ } }
export function remove(key: string) { try {
    localStorage.removeItem(prefix + key);
}
catch { /* Storage is optional. */ } }
export function attribution() {
    const params = new URLSearchParams(location.search);
    const result: Record<string, string> = {};
    for (const [field, param] of Object.entries({ source: 'utm_source', medium: 'utm_medium', campaign: 'utm_campaign', ref: 'ref' })) {
        const value = params.get(param);
        if (value)
            result[field] = value.slice(0, 200);
    }
    return result;
}
let memoryId: string | null = null;
let sent = false;
const eventId = crypto.randomUUID();
export function visitorId() {
    if (read('analytics') !== 'allow')
        return null;
    if (!memoryId) {
        memoryId = read('visitor') || crypto.randomUUID();
        write('visitor', memoryId);
    }
    return memoryId;
}
export function firstAttribution(): Record<string, string> {
    try {
        const stored = read('attribution');
        if (stored && read('analytics') === 'allow')
            return JSON.parse(stored);
    }
    catch { /* Ignore damaged browser state. */ }
    return attribution();
}
export async function trackVisit() {
    if (sent || new URLSearchParams(location.search).get('internal') === '1')
        return;
    const id = visitorId();
    if (!id)
        return;
    if (!read('attribution'))
        write('attribution', JSON.stringify(attribution()));
    try {
        await collect({ kind: 'visit', visitor_id: id, event_id: eventId, attribution: firstAttribution(), ...experimentAttribution() });
        sent = true;
    }
    catch { /* Analytics must never interrupt signup. */ }
}
export function consent(allow: boolean) { write('analytics', allow ? 'allow' : 'deny'); if (allow) {
    void trackVisit();
}
else {
    remove('visitor');
    remove('attribution');
    memoryId = null;
} }
