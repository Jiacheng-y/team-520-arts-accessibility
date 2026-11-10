'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { supabase, errorMessage } from '../src/client';

import { ExperimentResults, type ExperimentResult } from './experiment-results';

type Metrics = {
  experiments?: ExperimentResult[];
  signups: number; visitors: number; museums: number; paid: number; converted: number; unattributed: number;
  audiences: Record<string, number>; preferences: Record<string, number>;
  trend: {day: string; count: number}[]; outreach: Record<string, number>;
};
type Filters = {date_from: string | null; date_to: string | null; campaign_filter: string | null};
const emptyFilters: Filters = {date_from: null, date_to: null, campaign_filter: null};
const audienceLabels = {museum: 'Museum staff', educator: 'Educators', visitor: 'Visitors', other: 'Other'};
function Breakdown({values, labels}: {values: Record<string, number>; labels: Record<string, string>}) {
  return Object.keys(values).length ? <>{Object.entries(values).map(([key, count]) => <div className="breakdown-row" key={key}><span>{labels[key] || key}</span><strong>{count}</strong></div>)}</> : <>No responses yet.</>;
}

export default function Dashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [authStatus, setAuthStatus] = useState('');
  const [metricsStatus, setMetricsStatus] = useState('');
  const [outreachStatus, setOutreachStatus] = useState('');
  const [signedIn, setSignedIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updatedAt, setUpdatedAt] = useState('');
  const [today, setToday] = useState('');
  const sequence = useRef(0);
  const filters = useRef<Filters>(emptyFilters);
  const authorized = useRef(false);

  const lock = useCallback((message = '') => {
    sequence.current++;
    authorized.current = false;
    setMetrics(null);
    setAuthStatus(message);
    setMetricsStatus('');
    setOutreachStatus('');
    setUpdatedAt('');
  }, []);
  const load = useCallback(async () => {
    if (!supabase) return;
    const version = ++sequence.current;
    setMetricsStatus('Loading…');
    try {
      const {data, error} = await supabase.rpc('dashboard_metrics', filters.current);
      if (version !== sequence.current) return;
      if (error) {
        if (['42501', 'PGRST301', 'PGRST302', 'PGRST303'].includes(error.code)) {
          lock('This account is not authorized, or your session has expired. Please sign in with an administrator account.');
          return;
        }
        throw error;
      }
      authorized.current = true;
      setMetrics(data as Metrics);
      setMetricsStatus('');
      setAuthStatus('');
      setUpdatedAt(`Updated ${new Date().toLocaleString()}. All date filters use UTC.`);
    } catch (error) {
      if (version !== sequence.current) return;
      if (authorized.current) setMetricsStatus(errorMessage(error));
      else setAuthStatus(errorMessage(error));
    }
  }, [lock]);

  useEffect(() => {
    setToday(new Date().toISOString().slice(0,10));
    if (!supabase) { lock('Supabase is not configured. Add the project settings described in README.md.'); return; }
    let active = true;
    const {data: subscription} = supabase.auth.onAuthStateChange(event => {
      if (event === 'SIGNED_OUT') { setSignedIn(false); lock(); }
    });
    void supabase.auth.getSession().then(({data, error}) => {
      if (!active) return;
      if (error) { lock(errorMessage(error)); return; }
      if (data.session) { setSignedIn(true); void load(); }
    });
    return () => { active = false; sequence.current++; subscription.subscription.unsubscribe(); };
  }, [load, lock]);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) { setAuthStatus('Supabase is not configured. Follow the setup instructions in README.md.'); return; }
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setAuthStatus('Signing in…');
    try {
      const {error} = await supabase.auth.signInWithPassword({email: String(data.get('email')), password: String(data.get('password'))});
      if (error) throw error;
      (form.elements.namedItem('password') as HTMLInputElement).value = '';
      setSignedIn(true);
      await load();
    } catch (error) { setAuthStatus(errorMessage(error)); }
    finally { setBusy(false); }
  }
  async function signOut() {
    lock();
    const result = await supabase?.auth.signOut();
    if (result?.error) setAuthStatus(errorMessage(result.error));
    else setSignedIn(false);
  }
  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const from = String(data.get('from') || '');
    const to = String(data.get('to') || '');
    if (from && to && from > to) {setMetricsStatus('The start date must be on or before the end date.'); return;}
    filters.current = {
      date_from: from ? `${from}T00:00:00Z` : null,
      date_to: to ? new Date(Date.parse(`${to}T00:00:00Z`) + 86400000).toISOString() : null,
      campaign_filter: String(data.get('campaign') || '').trim() || null,
    };
    void load();
  }
  async function saveOutreach(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    const data = Object.fromEntries(new FormData(event.currentTarget));
    setSaving(true);
    try {
      const {error} = await supabase.from('outreach_contacts').upsert(data, {onConflict:'contact_code'});
      if (error) throw error;
      setOutreachStatus('Contact saved.');
      await load();
    } catch (error) { setOutreachStatus(errorMessage(error)); }
    finally { setSaving(false); }
  }
  const maximum = Math.max(1, ...(metrics?.trend || []).map(point => point.count));
  return (
<div className="dashboard">
<header className="site-header">
<span className="brand">
<span className="brand-mark" aria-hidden="true">◎</span>
<span>BEYOND<br />THE FRAME</span>
</span>
<span className="eyebrow">PRIVATE RESEARCH DASHBOARD</span>
<button id="signout" className="button small outline" hidden={!signedIn} onClick={() => void signOut()}>Sign out</button>
</header>
<main className="wrap">
<section hidden={metrics !== null} id="auth-panel" className="auth-panel">
<p className="eyebrow">FOR THE PROJECT TEAM</p>
<h1>A closer look<br />at <em>the numbers.</em>
</h1>
<p>Sign in with an authorized administrator account.</p>
<form method="post" onSubmit={login} id="login-form" className="form-card">
<label htmlFor="admin-email">Email address</label>
<input name="email" id="admin-email" type="email" autoComplete="username" required />
<label htmlFor="admin-password">Password</label>
<input name="password" id="admin-password" type="password" autoComplete="current-password" required />
<button className="button full" type="submit" disabled={busy}>Sign in <span aria-hidden="true">→</span>
</button>
<p id="auth-status" className="status" role="status">{authStatus}</p>
</form>
</section>
<section id="metrics-panel" hidden={metrics === null}>
<div className="dashboard-heading">
<div>
<p className="eyebrow">THE PILOT / RESEARCH OVERVIEW</p>
<h1>Signs of <em>curiosity.</em>
</h1>
</div>
<button onClick={() => void load()} id="refresh" className="button small outline">Refresh data ↻</button>
</div>
<form onSubmit={applyFilters} id="filters" className="filters">
<div>
<label htmlFor="date-from">From (UTC)</label>
<input type="date" name="from" id="date-from" />
</div>
<div>
<label htmlFor="date-to">Through (UTC)</label>
<input type="date" name="to" id="date-to" />
</div>
<div>
<label htmlFor="campaign">Campaign</label>
<input name="campaign" id="campaign" placeholder="All campaigns" maxLength={200} />
</div>
<button className="button small" type="submit">Apply filters</button>
</form>
<p id="metrics-status" role="status" className="status">{metricsStatus}</p>
<ExperimentResults results={metrics?.experiments} totalSignups={metrics?.signups ?? 0} />
<h2 className="overall-heading">Overall results</h2>
<p className="muted">All signups and tracked visits for the selected filters, including earlier traffic without an assigned concept.</p>
<div className="metric-grid">
<article>
<p>Waitlist emails</p>
<strong id="count-signups">{metrics?.signups ?? "—"}</strong>
<small>Unique email addresses</small>
</article>
<article>
<p>Unique visitors</p>
<strong id="count-visitors">{metrics?.visitors ?? "—"}</strong>
<small>Estimated browsers · analytics allowed</small>
</article>
<article>
<p>Museum staff</p>
<strong id="count-museums">{metrics?.museums ?? "—"}</strong>
<small>Qualified by self-reported audience</small>
</article>
<article>
<p>Paid-pilot interest</p>
<strong id="count-paid">{metrics?.paid ?? "—"}</strong>
<small>“Yes” responses from museum staff</small>
</article>
</div>
<div className="dashboard-grid">
<article className="data-card">
<p className="eyebrow">THE PATH TO A SIGNUP</p>
<h2 id="conversion">{metrics?.visitors ? `${(metrics.converted / metrics.visitors * 100).toFixed(1)}%` : "—"}</h2>
<p>of tracked visitors signed up in the selected period.</p>
<p id="unattributed" className="muted">{metrics ? `${metrics.unattributed} signups without a matching tracked visit in this period.` : ""}</p>
<p className="muted">Visitors are counted once per browser in the selected date range. Different devices, cleared storage, and declined analytics affect the estimate. Dashboard visits are excluded.</p>
</article>
<article className="data-card">
<p className="eyebrow">WHO’S INTERESTED</p>
<h2>By audience</h2>
<div id="audiences" className="breakdown">
<Breakdown values={metrics?.audiences || {}} labels={audienceLabels} />
</div>
</article>
<article className="data-card">
<p className="eyebrow">WAITLIST MOMENTUM</p>
<h2>Recent signups</h2>
<div id="trend" className="trend">{metrics?.trend.length ? metrics.trend.map(point => <div className="trend-row" key={point.day}>
<span>{point.day}</span>
<span className="trend-bar" style={{width: `${point.count / maximum * 100}%`}} />
<strong>{point.count}</strong>
</div>) : "No signups in this period."}</div>
</article>
</div>
<section className="data-card outreach-panel">
<div>
<p className="eyebrow">DIRECT OUTREACH / ENTER ACTUAL OUTCOMES</p>
<h2>From invitation to conversation.</h2>
<p>Visits cannot tell us who replied. Record outcomes here using an opaque contact code, never a name or email.</p>
</div>
<div id="outreach-summary" className="outreach-summary">
<Breakdown values={metrics?.outreach || {}} labels={{sent:"Sent",replied:"Replied",meeting:"Meetings",bounced:"Bounced"}} />
</div>
<form method="post" onSubmit={saveOutreach} id="outreach-form" className="filters">
<div>
<label htmlFor="contact-code">Contact code</label>
<input id="contact-code" name="contact_code" placeholder="m017" pattern="[a-zA-Z0-9_-]{1,40}" required maxLength={40} />
</div>
<div>
<label htmlFor="outreach-channel">Channel</label>
<select id="outreach-channel" name="channel">
<option value="email">Email</option>
<option value="linkedin">LinkedIn</option>
</select>
</div>
<div>
<label htmlFor="outreach-campaign">Campaign</label>
<input id="outreach-campaign" name="campaign" defaultValue="museum_pilot" maxLength={200} required />
</div>
<div>
<label htmlFor="outreach-date">Sent date (UTC)</label>
<input type="date" key={today} defaultValue={today} id="outreach-date" name="sent_at" required />
</div>
<div>
<label htmlFor="outreach-outcome">Outcome</label>
<select id="outreach-outcome" name="outcome">
<option value="sent">Sent</option>
<option value="replied">Replied</option>
<option value="meeting">Meeting booked</option>
<option value="bounced">Bounced</option>
</select>
</div>
<button className="button small" type="submit" disabled={saving}>Save contact</button>
</form>
<p id="outreach-status" role="status">{outreachStatus}</p>
<p className="muted">Saving an existing contact code updates that contact. Outcomes are cumulative: “Meeting booked” also counts as a reply. Filters use the original sent date.</p>
</section>
<p id="updated-at" className="muted">{updatedAt}</p>
</section>
</main>
</div>
  );
}
