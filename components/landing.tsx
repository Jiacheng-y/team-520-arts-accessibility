'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { collect, errorMessage } from '../src/client';
import { read, consent, visitorId, firstAttribution, trackVisit } from '../src/analytics';

import { assignedVariant, experimentAttribution, type Variant } from '../src/experiment';
import { concepts } from '../src/concepts';

const basePath = (process.env.NEXT_PUBLIC_BASE_PATH || '').replace(/\/$/, '');
const stories: Record<string, string> = {
  detective: 'Your mission: a letter is missing its final line. Can an empty balance help you find the answer?',
  collector: 'Imagine your mission: a string of pearls has a story to tell. What details might reveal its journey?',
  artist: 'Imagine your mission: follow the light across the canvas. What has the painter chosen to bring into focus?',
  historical: 'Imagine your mission: step into the room in the painting. What can its objects tell you about a life long ago?',
};

export default function Landing() {
  const [variant, setVariant] = useState<Variant | null>(null);
  const [ready, setReady] = useState(false);
  const [audience, setAudience] = useState('museum');
  const [role, setRole] = useState('detective');
  const [stage, setStage] = useState<'signup' | 'qualify' | 'done'>('signup');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [receipt, setReceipt] = useState('');
  const [banner, setBanner] = useState(false);
  const [privacyStatus, setPrivacyStatus] = useState('');
  const [deleteStatus, setDeleteStatus] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [year, setYear] = useState('2026');
  const dialog = useRef<HTMLDialogElement>(null);
  const signupReceipts = useRef(new Map<string, string>());
  const thankYou = useRef<HTMLDivElement>(null);
  const challenge = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    setVariant(assignedVariant());
    setReady(true);
    setYear(String(new Date().getFullYear()));
    setBanner(read('analytics') === null && new URLSearchParams(location.search).get('internal') !== '1');
    void trackVisit();
  }, []);
  useEffect(() => {
    if (stage === 'done') thankYou.current?.focus();
    if (stage === 'qualify') challenge.current?.focus();
  }, [stage]);

  function setConsent(allow: boolean) {
    consent(allow);
    setBanner(false);
    setPrivacyStatus(allow ? 'Analytics enabled.' : 'Analytics declined. Your signup still works.');
  }
  async function submitSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setStatus('Saving your place…');
    const data = new FormData(event.currentTarget);
    const email = String(data.get('email')).trim().toLowerCase();
    if (!signupReceipts.current.has(email)) signupReceipts.current.set(email, crypto.randomUUID());
    try {
      const result = await collect({kind: 'signup', receipt: signupReceipts.current.get(email), email,
        audience, organization: data.get('organization') || '', role: data.get('role') || '',
        consent: data.get('consent') === 'on', website: data.get('website') || '',
        visitor_id: visitorId(), attribution: firstAttribution(), ...experimentAttribution()});
      setReceipt(result.receipt || '');
      setStatus('');
      setStage(audience === 'museum' && result.receipt ? 'qualify' : 'done');
    } catch (error) { setStatus(errorMessage(error)); }
    finally { setBusy(false); }
  }
  async function submitQualification(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setStatus('Saving your perspective…');
    try {
      await collect({kind: 'qualify', receipt, ...Object.fromEntries(new FormData(event.currentTarget))});
      setStatus('');
      setStage('done');
    } catch (error) { setStatus(errorMessage(error)); }
    finally { setBusy(false); }
  }
  async function deleteSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDeleting(true);
    setDeleteStatus('Deleting…');
    try {
      await collect({kind: 'delete', receipt: String(new FormData(event.currentTarget).get('receipt')).trim()});
      setDeleteStatus('Any signup matching that code has been deleted.');
    } catch (error) { setDeleteStatus(errorMessage(error)); }
    finally { setDeleting(false); }
  }
  if (!variant) return <div className="landing"><p className="wrap" role="status">Loading your experience…</p><noscript>Please enable JavaScript to view the experience and join the waitlist.</noscript></div>;
  const concept = concepts[variant];
  return (
<div className="landing">
<a className="skip" href="#main">Skip to content</a>
<header className="site-header">
<a className="brand" href="#" aria-label="Beyond the Frame home">
<span className="brand-mark" aria-hidden="true">◎</span>
<span>BEYOND<br />THE FRAME</span>
</a>
<nav aria-label="Main navigation">
<a href="#experience">The experience</a>
<a href="#museums">For museums</a>
<a className="button small outline" href="#join">Join the pilot <span aria-hidden="true">↗</span>
</a>
</nav>
</header>
<main id="main">
<section className="hero wrap">
<div className="hero-copy">
<p className="eyebrow">
<span className="little-line">
</span>A NEW WAY TO SEE THE MUSEUM</p>
<h1>Look closer.<br />The painting<br />is <em>the clue.</em>
</h1>
<p className="lede">{concept.lede}</p>
<a className="button" href="#join" data-audience="museum" onClick={() => setAudience("museum")}>Explore a museum pilot <span aria-hidden="true">↗</span>
</a>
<a className="visitor-link" href="#join" data-audience="visitor" onClick={() => setAudience("visitor")}>Here as a visitor? Join the waitlist <span aria-hidden="true">→</span>
</a>
<div className="hero-note">
<span aria-hidden="true">✧</span> Your exhibition. A different perspective.</div>
</div>
<div className="hero-art">
<div className="orbit orbit-one">
</div>
<div className="orbit orbit-two">
</div>
<span className="art-label">A LITTLE ADVENTURE.<br />A CLOSER LOOK.</span>
<div className="concept-hero">
<img src={basePath + "/images/" + concept.image} alt={concept.alt} width="1448" height="1086" fetchPriority="high" />
</div>
<div className="floating-note">
<span className="note-icon" aria-hidden="true">⌕</span>
<div>
<span className="eyebrow">YOUR FIRST MISSION</span>
<p>The answer is in the artwork.</p>
</div>
</div>
<span className="prototype-label">EARLY CONCEPT · ILLUSTRATIVE EXPERIENCE</span>
</div>
</section>
<div className="principles">
<span>Real artworks</span>
<i>✧</i>
<span>{variant === "worksheet" ? "Listen and discover" : "Four perspectives"}</span>
<i>✧</i>
<span>{variant === "worksheet" ? "Discoveries to share" : "A story shaped by you"}</span>
<i>✧</i>
<span>A reason to look closer</span>
</div>
<section id="experience" className="section wrap">
<div className="section-heading">
<div>
<p className="eyebrow">01 / THE EXPERIENCE</p>
<h2>{concept.title}</h2>
</div>
<p>{concept.description}</p>
</div>
<figure className="concept-product">
<img src={basePath + "/images/" + concept.productImage} alt={concept.productAlt} width="1448" height="1086" loading="lazy" />
<figcaption>Product concept · The Cypress Clue</figcaption>
</figure>
<div className="journey">
{concept.steps.map((step, index) => <article key={step.title}>
<div className="step-title"><span>{String(index + 1).padStart(2, '0')}</span><h3>{step.title}</h3></div>
<p>{step.text}</p>
</article>)}
</div>
<p className="caption">Illustrative product concept. Museum and artwork references do not imply a partnership.</p>
</section>
{variant !== 'worksheet' && <section className="roles-section">
<div className="wrap roles-layout">
<div>
<p className="eyebrow">SAME GALLERY. DIFFERENT STORIES.</p>
<h2>Who will you<br />
<em>become?</em>
</h2>
<p>One artwork can hold more than one adventure.</p>
</div>
<div className="role-list">
<button className={"role-choice" + (role === "detective" ? " active" : "")} data-role="detective" aria-pressed={role === "detective"} onClick={() => setRole("detective")}>
<span aria-hidden="true">⌕</span>
<span>
<strong>The Detective</strong>
<small>Follow the details others walk past.</small>
</span>
<span className="role-arrow" aria-hidden="true">↗</span>
</button>
<button className={"role-choice" + (role === "collector" ? " active" : "")} data-role="collector" aria-pressed={role === "collector"} onClick={() => setRole("collector")}>
<span aria-hidden="true">◇</span>
<span>
<strong>The Collector</strong>
<small>Trace the stories behind the treasures.</small>
</span>
<span className="role-arrow" aria-hidden="true">↗</span>
</button>
<button className={"role-choice" + (role === "artist" ? " active" : "")} data-role="artist" aria-pressed={role === "artist"} onClick={() => setRole("artist")}>
<span aria-hidden="true">✳</span>
<span>
<strong>The Artist</strong>
<small>See the choices behind every brushstroke.</small>
</span>
<span className="role-arrow" aria-hidden="true">↗</span>
</button>
<button className={"role-choice" + (role === "historical" ? " active" : "")} data-role="historical" aria-pressed={role === "historical"} onClick={() => setRole("historical")}>
<span aria-hidden="true">♜</span>
<span>
<strong>The Historical Figure</strong>
<small>Step into another time, and another life.</small>
</span>
<span className="role-arrow" aria-hidden="true">↗</span>
</button>
<p id="role-story" className="role-story" aria-live="polite">{stories[role]}</p>
</div>
</div>
</section>}
<section id="museums" className="section wrap museum-section">
<div className="museum-visual concept-museum">
<img src={basePath + "/images/" + concept.image} alt={concept.alt} width="1448" height="1086" loading="lazy" />
<span className="visual-caption">A new invitation to an existing collection.</span>
</div>
<div className="museum-copy">
<p className="eyebrow">02 / MADE WITH MUSEUMS IN MIND</p>
<h2>Your exhibition.<br />A new way<br />to <em>explore.</em>
</h2>
<p className="lede">For education teams who want school groups to do more than pass through.</p>
<div className="benefit">
<span>01</span>
<div>
<h3>Build on what’s already there</h3>
<p>A proposed interactive layer around your existing artworks, designed to sit alongside your interpretation.</p>
</div>
</div>
<div className="benefit">
<span>02</span>
<div>
<h3>Give looking a purpose</h3>
<p>Clues ask visitors to observe the real artwork. Discoveries give them something to discuss together.</p>
</div>
</div>
<div className="benefit">
<span>03</span>
<div>
<h3>Start with a small pilot</h3>
<p>{concept.pilot} Scope and pricing will be discussed with interested teams.</p>
</div>
</div>
<a className="text-link" href="#join" data-audience="museum" onClick={() => setAudience("museum")}>Help shape the pilot <span aria-hidden="true">↗</span>
</a>
</div>
</section>
<section className="invitation">
<div className="wrap">
<p className="eyebrow">AN INVITATION TO LOOK AGAIN</p>
<p className="big-quote">What if “just one more painting”<br />was <em>their idea?</em>
</p>
<span className="quote-rule">
</span>
<p>That’s the possibility we’re exploring.</p>
</div>
</section>
<section id="join" className="section wrap join-section">
<div>
<p className="eyebrow">03 / BE PART OF THE NEXT CHAPTER</p>
<h2>A little curiosity.<br />A new <em>beginning.</em>
</h2>
<p className="lede">We’re inviting museum education teams to help shape Beyond the Frame. Leave your details to hear about a potential pilot.</p>
<p className="muted">Visiting for yourself? You’re welcome on the waitlist, too.</p>
<div className="pilot-note">
<span aria-hidden="true">✧</span>
<p>Early-stage concept. No commitment required.<br />We’ll contact you when there’s a next step.</p>
</div>
</div>
<div className="form-card">
<form id="signup-form" method="post" hidden={stage !== "signup"} onSubmit={submitSignup}>
<h3>Let’s look closer, together.</h3>
<label htmlFor="audience">I’m joining as</label>
<select id="audience" name="audience" value={audience} onChange={event => setAudience(event.target.value)} disabled={busy}>
<option value="museum">Museum staff</option>
<option value="educator">An educator</option>
<option value="visitor">A museum visitor</option>
<option value="other">Other</option>
</select>
<label htmlFor="email">Email address</label>
<input id="email" name="email" type="email" autoComplete="email" placeholder="you@museum.org" maxLength={254} required />
<div id="museum-fields" hidden={audience !== "museum"}>
<label htmlFor="organization">Museum or organization</label>
<input id="organization" name="organization" disabled={audience !== "museum"} autoComplete="organization" maxLength={160} required={audience === "museum"} placeholder="Your museum" />
<label htmlFor="job-role">Your role</label>
<input id="job-role" name="role" disabled={audience !== "museum"} autoComplete="organization-title" maxLength={120} required={audience === "museum"} placeholder="e.g. Education coordinator" />
</div>
<div className="honeypot" aria-hidden="true">
<label htmlFor="website">Leave this empty</label>
<input id="website" name="website" tabIndex={-1} autoComplete="off" />
</div>
<label className="checkbox">
<input name="consent" type="checkbox" required />
<span>I agree to receive emails about Beyond the Frame and potential pilots. I can ask to unsubscribe at any time.</span>
</label>
<button className="button full" type="submit" disabled={!ready || busy}>{audience === "museum" ? "Join the pilot waitlist" : "Join the waitlist"} <span aria-hidden="true">↗</span>
</button>
<p className="form-footnote">Just the next chapter. No noise. <button type="button" className="inline-button" data-open-privacy onClick={() => dialog.current?.showModal()}>Privacy details</button>
</p>
<p id="signup-status" className="status" role="status" aria-live="polite">{stage === "signup" ? status : ""}</p>
</form>
<form id="qualification-form" method="post" hidden={stage !== "qualify"} onSubmit={submitQualification}>
<p className="eyebrow">YOU’RE ON THE LIST</p>
<h3>Help us understand your museum.</h3>
<p>Three optional questions to shape a useful pilot.</p>
<label htmlFor="challenge">How significant is school-group engagement as a challenge?</label>
<select id="challenge" ref={challenge} name="challenge" required>
<option value="">Select one</option>
<option value="high">A major challenge</option>
<option value="medium">Somewhat challenging</option>
<option value="low">Not a priority</option>
<option value="unknown">Unsure</option>
</select>
<label htmlFor="interest">How interested are you in implementing this experience at your museum?</label>
<select id="interest" name="interest" required>
<option value="">Select one</option>
<option value="very">Very interested</option>
<option value="somewhat">Somewhat interested</option>
<option value="not_now">Not currently interested</option>
<option value="unsure">Unsure</option>
</select>
<label htmlFor="paid-pilot">Would you discuss a paid pilot?</label>
<select id="paid-pilot" name="paid_pilot" required>
<option value="">Select one</option>
<option value="yes">Yes, I’m interested</option>
<option value="maybe">Maybe, I’d need more details</option>
<option value="no">Not currently</option>
</select>
<label htmlFor="budget">Budget or approval process <span className="muted">(optional)</span>
</label>
<textarea id="budget" name="budget" rows={3} maxLength={1000} placeholder="A budget range, who would approve it, or ‘unknown’">
</textarea>
<button className="button full" type="submit" disabled={busy}>Share my perspective <span aria-hidden="true">↗</span>
</button>
<button className="inline-button skip-question" type="button" id="skip-questions" disabled={busy} onClick={() => { setStatus(""); setStage("done"); }}>Skip for now</button>
<p id="qualification-status" className="status" role="status">{stage === "qualify" ? status : ""}</p>
</form>
<div id="thank-you" ref={thankYou} tabIndex={-1} hidden={stage !== "done"}>
<span className="success-symbol" aria-hidden="true">✓</span>
<h3>You’re part of the story.</h3>
<p>Thanks for your curiosity. We’ll be in touch about the next chapter.</p>
</div>{receipt && <p className="receipt">For a new signup, keep this private deletion code to remove it in Privacy &amp; data. Already registered? Keep your original code; this new code cannot change an existing signup: {receipt}</p>}</div>
</section>
<section className="faq wrap">
<div>
<p className="eyebrow">A FEW THINGS YOU MIGHT WONDER</p>
<h2>Before you<br />
<em>step inside.</em>
</h2>
</div>
<div className="faq-list">
<details>
<summary>Is this available to use today?</summary>
<p>Not yet. Beyond the Frame is an early-stage concept. We’re collecting interest and speaking with museum teams to shape a first pilot.</p>
</details>
<details>
<summary>Does this replace our existing guide?</summary>
<p>The proposed experience adds guided discoveries to an existing exhibition. We want to learn how it could complement your current interpretation and education programming.</p>
</details>
<details>
<summary>What would a pilot involve?</summary>
<p>We’d discuss a small selection of artworks, the needs of your school groups, and how to evaluate engagement together. Scope, timing, and pricing would be agreed before any commitment.</p>
</details>
<details>
<summary>Do visitors need special equipment?</summary>
<p>{concept.equipment}</p>
</details>
<details>
<summary>Can I join if I don’t work at a museum?</summary>
<p>Absolutely. Select “A museum visitor” or “An educator” in the form. We’ll keep visitor interest separate from museum pilot inquiries.</p>
</details>
</div>
</section>
</main>
<footer className="site-footer wrap">
<a className="brand" href="#">
<span className="brand-mark" aria-hidden="true">◎</span>
<span>BEYOND<br />THE FRAME</span>
</a>
<p>A little adventure. A closer look.</p>
<button className="inline-button" data-open-privacy onClick={() => dialog.current?.showModal()}>Privacy &amp; data</button>
<span>© <span id="year">{year}</span> Beyond the Frame</span>
</footer>
<dialog id="privacy-dialog" ref={dialog}>
<button onClick={() => dialog.current?.close()} className="close-dialog" aria-label="Close privacy information">×</button>
<p className="eyebrow">PRIVACY &amp; DATA</p>
<h2>Your curiosity.<br />Your choice.</h2>
<p>We store the email and details you submit in Supabase to contact you about this early-stage project. Signup is for adults, including museum staff and educators; please don’t submit student details.</p>
<p>We save a display preference in your browser to keep your experience consistent on return visits. We also save which experience you saw with your signup.</p>
<p>If you allow analytics, a random ID saved in your browser helps us estimate unique visitors and understand which outreach links brought people here. It does not identify you until you submit a form, when we associate it with that signup. We don’t fingerprint your device.</p>
<p>You can change your analytics choice below. Declining does not affect signup. To unsubscribe or request deletion, reply to any project email you receive. Before those emails begin, retain the private deletion code shown after signup and use it below.</p>
<div className="privacy-actions">
<button className="button small" id="allow-analytics" onClick={() => setConsent(true)}>Allow analytics</button>
<button className="button small light" id="deny-analytics" onClick={() => setConsent(false)}>Decline analytics</button>
</div>
<p id="privacy-status" role="status">{privacyStatus}</p>
<form id="delete-form" method="post" onSubmit={deleteSignup}>
<label htmlFor="deletion-code">Private deletion code</label>
<input id="deletion-code" name="receipt" required placeholder="Paste your signup deletion code" />
<button className="button small light" type="submit" disabled={deleting}>Delete my signup</button>
<p id="delete-status" role="status">{deleteStatus}</p>
</form>
</dialog>
<div className="consent-banner" id="analytics-consent" hidden={!banner}>
<p>Help us understand interest?<br />
<small>Allow an anonymous browser ID to count visits. Signup works either way.</small>
</p>
<button className="button small" id="consent-allow" onClick={() => setConsent(true)}>Allow</button>
<button className="inline-button" id="consent-decline" onClick={() => setConsent(false)}>No thanks</button>
</div>
</div>
  );
}
