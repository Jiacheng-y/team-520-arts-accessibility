import './style.css';
import { collect, errorMessage } from './client';
import { read, consent, visitorId, firstAttribution, trackVisit } from './analytics';
const $ = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
// Vite rewrites HTML asset URLs for the configured GitHub Pages repository base.
const audience = $<HTMLSelectElement>('#audience');
const signup = $<HTMLFormElement>('#signup-form');
const qualification = $<HTMLFormElement>('#qualification-form');
let receipt = '';
const signupReceipts = new Map<string, string>();
function updateAudience() { const museum = audience.value === 'museum'; $('#museum-fields').hidden = !museum; for (const el of $('#museum-fields').querySelectorAll<HTMLInputElement>('input')) {
    el.required = museum;
    el.disabled = !museum;
} signup.querySelector<HTMLButtonElement>('[type=submit]')!.innerHTML = `${museum ? 'Join the pilot waitlist' : 'Join the waitlist'} <span aria-hidden="true">↗</span>`; }
audience.addEventListener('change', updateAudience);
updateAudience();
for (const link of document.querySelectorAll<HTMLElement>('[data-audience]'))
    link.addEventListener('click', () => { audience.value = link.dataset.audience!; updateAudience(); });
const stories: Record<string, string> = { detective: 'Your mission: a letter is missing its final line. Can an empty balance help you find the answer?', collector: 'Imagine your mission: a string of pearls has a story to tell. What details might reveal its journey?', artist: 'Imagine your mission: follow the light across the canvas. What has the painter chosen to bring into focus?', historical: 'Imagine your mission: step into the room in the painting. What can its objects tell you about a life long ago?' };
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-role]'))
    button.addEventListener('click', () => { for (const other of document.querySelectorAll('[data-role]')) {
        other.classList.remove('active');
        other.setAttribute('aria-pressed', 'false');
    } button.classList.add('active'); button.setAttribute('aria-pressed', 'true'); $('#role-story').textContent = stories[button.dataset.role!]; });
function showReceipt() { if (!receipt)
    return; const note = document.createElement('p'); note.className = 'receipt'; note.textContent = `For a new signup, keep this private deletion code to remove it in Privacy & data. Already registered? Keep your original code; this new code cannot change an existing signup: ${receipt}`; $('.form-card').append(note); }
function finish() { signup.hidden = true; qualification.hidden = true; $('#thank-you').hidden = false; $('#thank-you').setAttribute('tabindex', '-1'); $('#thank-you').focus(); }
signup.addEventListener('submit', async (event) => { event.preventDefault(); const button = signup.querySelector<HTMLButtonElement>('[type=submit]')!; button.disabled = true; $('#signup-status').textContent = 'Saving your place…'; const data = new FormData(signup); const email = String(data.get('email')).trim().toLowerCase(); if (!signupReceipts.has(email))
    signupReceipts.set(email, crypto.randomUUID()); try {
    const result = await collect({ kind: 'signup', receipt: signupReceipts.get(email), email: data.get('email'), audience: data.get('audience'), organization: data.get('organization') || '', role: data.get('role') || '', consent: data.get('consent') === 'on', website: data.get('website') || '', visitor_id: visitorId(), attribution: firstAttribution() });
    receipt = result.receipt || '';
    signup.hidden = true;
    $('#signup-status').textContent = '';
    showReceipt();
    if (audience.value === 'museum' && receipt) {
        qualification.hidden = false;
        $('#challenge').focus();
    }
    else {
        finish();
    }
}
catch (error) {
    $('#signup-status').textContent = errorMessage(error);
}
finally {
    button.disabled = false;
} });
qualification.addEventListener('submit', async (event) => { event.preventDefault(); const button = qualification.querySelector<HTMLButtonElement>('[type=submit]')!; button.disabled = true; $('#qualification-status').textContent = 'Saving your perspective…'; try {
    await collect({ kind: 'qualify', receipt, ...Object.fromEntries(new FormData(qualification)) });
    finish();
}
catch (error) {
    $('#qualification-status').textContent = errorMessage(error);
}
finally {
    button.disabled = false;
} });
$('#skip-questions').addEventListener('click', finish);
const dialog = $<HTMLDialogElement>('#privacy-dialog');
for (const button of document.querySelectorAll('[data-open-privacy]'))
    button.addEventListener('click', () => dialog.showModal());
$('.close-dialog').addEventListener('click', () => dialog.close());
function setConsent(allow: boolean) { consent(allow); $('#analytics-consent').hidden = true; $('#privacy-status').textContent = allow ? 'Analytics enabled.' : 'Analytics declined. Your signup still works.'; }
$('#consent-allow').addEventListener('click', () => setConsent(true));
$('#consent-decline').addEventListener('click', () => setConsent(false));
$('#allow-analytics').addEventListener('click', () => setConsent(true));
$('#deny-analytics').addEventListener('click', () => setConsent(false));
$('#analytics-consent').hidden = read('analytics') !== null || new URLSearchParams(location.search).get('internal') === '1';
void trackVisit();
$('#delete-form').addEventListener('submit', async (event) => { event.preventDefault(); const button = $<HTMLButtonElement>('#delete-form button'); button.disabled = true; try {
    await collect({ kind: 'delete', receipt: $<HTMLInputElement>('#deletion-code').value.trim() });
    $('#delete-status').textContent = 'Any signup matching that code has been deleted.';
}
catch (error) {
    $('#delete-status').textContent = errorMessage(error);
}
finally {
    button.disabled = false;
} });
$('#year').textContent = String(new Date().getFullYear());
