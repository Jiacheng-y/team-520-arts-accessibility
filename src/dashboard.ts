import './style.css';
import './dashboard.css';
import { supabase, errorMessage } from './client';
const $ = <T extends HTMLElement = HTMLElement>(s: string) => document.querySelector<T>(s)!;
let requestVersion = 0;
function lock(message = '') { requestVersion++; $('#metrics-panel').hidden = true; $('#auth-panel').hidden = false; $('#signout').hidden = true; $('#auth-status').textContent = message; for (const el of document.querySelectorAll('.metric-grid strong'))
    el.textContent = '—'; for (const id of ['audiences', 'preferences', 'trend', 'outreach-summary'])
    $('#' + id).replaceChildren(); }
function rows(target: string, values: Record<string, number>, labels: Record<string, string>) { const root = $(target); root.replaceChildren(); for (const [key, value] of Object.entries(values)) {
    const row = document.createElement('div');
    row.className = 'breakdown-row';
    const label = document.createElement('span');
    label.textContent = labels[key] || key;
    const count = document.createElement('strong');
    count.textContent = String(value);
    row.append(label, count);
    root.append(row);
} if (!root.childElementCount)
    root.textContent = 'No responses yet.'; }
async function load() { if (!supabase)
    return; const version = ++requestVersion; $('#metrics-status').textContent = 'Loading…'; try {
    const from = $<HTMLInputElement>('#date-from').value;
    const to = $<HTMLInputElement>('#date-to').value;
    if (from && to && from > to)
        throw new Error('The start date must be on or before the end date.');
    const { data, error } = await supabase.rpc('dashboard_metrics', { date_from: from ? `${from}T00:00:00Z` : null, date_to: to ? new Date(Date.parse(`${to}T00:00:00Z`) + 86400000).toISOString() : null, campaign_filter: $<HTMLInputElement>('#campaign').value.trim() || null });
    if (version !== requestVersion)
        return;
    if (error) {
        if (error.code === '42501') {
            lock('This account is not authorized to view the dashboard.');
            return;
        }
        throw error;
    }
    $('#auth-panel').hidden = true;
    $('#metrics-panel').hidden = false;
    $('#signout').hidden = false;
    $('#count-signups').textContent = String(data.signups);
    $('#count-visitors').textContent = String(data.visitors);
    $('#count-museums').textContent = String(data.museums);
    $('#count-paid').textContent = String(data.paid);
    $('#conversion').textContent = data.visitors ? `${(data.converted / data.visitors * 100).toFixed(1)}%` : '—';
    $('#unattributed').textContent = `${data.unattributed} signups without a matching tracked visit in this period.`;
    rows('#audiences', data.audiences, { museum: 'Museum staff', educator: 'Educators', visitor: 'Visitors', other: 'Other' });
    rows('#preferences', data.preferences, { layer: 'Role-playing layer', audio: 'Audio guide', both: 'Both', unsure: 'Unsure' });
    const trend = $('#trend');
    trend.replaceChildren();
    const maximum = Math.max(1, ...data.trend.map((v: {
        count: number;
    }) => v.count));
    for (const point of data.trend) {
        const row = document.createElement('div');
        row.className = 'trend-row';
        const date = document.createElement('span');
        date.textContent = point.day;
        const bar = document.createElement('span');
        bar.className = 'trend-bar';
        bar.style.width = `${point.count / maximum * 100}%`;
        const count = document.createElement('strong');
        count.textContent = String(point.count);
        row.append(date, bar, count);
        trend.append(row);
    }
    if (!data.trend.length)
        trend.textContent = 'No signups in this period.';
    rows('#outreach-summary', data.outreach, { sent: 'Sent', replied: 'Replied', meeting: 'Meetings', bounced: 'Bounced' });
    $('#updated-at').textContent = `Updated ${new Date().toLocaleString()}. All date filters use UTC.`;
    $('#metrics-status').textContent = '';
}
catch (error) {
    if (version !== requestVersion)
        return;
    const message = errorMessage(error);
    if ($('#metrics-panel').hidden)
        $('#auth-status').textContent = message;
    else
        $('#metrics-status').textContent = message;
} }
$('#login-form').addEventListener('submit', async (e) => { e.preventDefault(); if (!supabase) {
    $('#auth-status').textContent = 'Supabase is not configured. Follow the setup instructions in README.md.';
    return;
} const button = $<HTMLButtonElement>('#login-form button'); button.disabled = true; $('#auth-status').textContent = 'Signing in…'; try {
    const { error } = await supabase.auth.signInWithPassword({ email: $<HTMLInputElement>('#admin-email').value, password: $<HTMLInputElement>('#admin-password').value });
    if (error)
        throw error;
    $<HTMLInputElement>('#admin-password').value = '';
    await load();
}
catch (error) {
    $('#auth-status').textContent = errorMessage(error);
}
finally {
    button.disabled = false;
} });
$('#signout').addEventListener('click', async () => { lock(); await supabase?.auth.signOut(); });
$('#refresh').addEventListener('click', () => void load());
$('#filters').addEventListener('submit', e => { e.preventDefault(); void load(); });
$<HTMLInputElement>('#outreach-date').value = new Date().toISOString().slice(0, 10);
$('#outreach-form').addEventListener('submit', async (e) => { e.preventDefault(); if (!supabase)
    return; const button = $<HTMLButtonElement>('#outreach-form button'); button.disabled = true; try {
    const data = Object.fromEntries(new FormData($<HTMLFormElement>('#outreach-form')));
    const { error } = await supabase.from('outreach_contacts').upsert(data, { onConflict: 'contact_code' });
    if (error)
        throw error;
    $('#outreach-status').textContent = 'Contact saved.';
    await load();
}
catch (error) {
    $('#outreach-status').textContent = errorMessage(error);
}
finally {
    button.disabled = false;
} });
if (!supabase)
    lock('Supabase is not configured. Add the project settings described in README.md.');
else {
    supabase.auth.onAuthStateChange(event => { if (event === 'SIGNED_OUT')
        lock(); });
    void supabase.auth.getSession().then(({ data }) => { if (data.session)
        void load(); });
}
