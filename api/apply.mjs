// Internship application endpoint. The site's own form posts here; this checks it, stores the
// resume through the Apps Script web app, then submits every answer to the Google Form as a real
// formResponse POST so the form's automations run as they do for any response. (Responses that
// Apps Script creates with FormResponse.submit() do not fire submit triggers, so it has to be HTTP.)
//
// Env (Vercel project settings): GFORM_ID, APPS_SCRIPT_URL, APPS_SCRIPT_SECRET, SUBMIT_KEY,
// TURNSTILE_SECRET, TURNSTILE_SITE_KEY. Field to entry-ID mapping lives in ./_apply-fields.mjs.
import { FIELDS, RESUME_ENTRY, KEY_ENTRY, PAGE_COUNT, COLLECTS_EMAIL } from './_apply-fields.mjs';

const MAX_BYTES = 4 * 1024 * 1024; // Vercel request bodies cap at 4.5 MB
const TYPES = {
  pdf: { mime: 'application/pdf', magic: [0x25, 0x50, 0x44, 0x46] },
  docx: { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', magic: [0x50, 0x4b, 0x03, 0x04] },
  doc: { mime: 'application/msword', magic: [0xd0, 0xcf, 0x11, 0xe0] },
};
const env = (k) => process.env[k] || '';
const ready = () => ['GFORM_ID', 'APPS_SCRIPT_URL', 'APPS_SCRIPT_SECRET', 'SUBMIT_KEY', 'TURNSTILE_SECRET', 'TURNSTILE_SITE_KEY'].every(env)
  && RESUME_ENTRY && KEY_ENTRY && FIELDS.length > 0 && FIELDS.every((f) => f.entry);

const json = (status, body) => new Response(JSON.stringify(body), {
  status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
});
const fail = (status, error, message) => json(status, { ok: false, error, message });

export function GET() {
  return ready() ? json(200, { ready: true, siteKey: env('TURNSTILE_SITE_KEY') }) : json(200, { ready: false });
}

export async function POST(request) {
  if (!ready()) return fail(503, 'not_configured', 'Applications are not open on this page yet.');

  let form;
  try { form = await request.formData(); } catch { return fail(400, 'bad_request', 'Something went wrong sending the form. Please try again.'); }

  // Bots: hidden field filled in, or the form sent faster than a person can fill it.
  const started = Number(form.get('_t')) || 0;
  if (form.get('website') || !started || Date.now() - started < 4000) return fail(400, 'spam', 'Please try again.');

  const token = String(form.get('cf-turnstile-response') || '');
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '';
  const ts = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: new URLSearchParams({ secret: env('TURNSTILE_SECRET'), response: token, remoteip: ip }),
  }).then((r) => r.json()).catch(() => ({ success: false }));
  if (!ts.success) return fail(400, 'captcha', 'Please complete the check above the Submit button and try again.');

  const answers = {};
  const errors = {};
  for (const f of FIELDS) {
    const values = form.getAll(f.name).map((v) => String(v).trim()).filter(Boolean);
    if (f.required && !values.length) { errors[f.name] = 'Required'; continue; }
    if (values.some((v) => v.length > (f.max || 2000))) { errors[f.name] = 'Too long'; continue; }
    if (f.type === 'email' && values[0] && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values[0])) { errors[f.name] = 'Enter a valid email'; continue; }
    if (f.options && values.some((v) => !f.options.includes(v))) { errors[f.name] = 'Pick one of the options'; continue; }
    answers[f.name] = values;
  }

  const file = form.get('resume');
  const ext = file && typeof file === 'object' ? String(file.name).toLowerCase().split('.').pop() : '';
  let bytes = null;
  if (!file || typeof file !== 'object' || !file.size) errors.resume = 'Add your resume';
  else if (file.size > MAX_BYTES) errors.resume = 'Resume must be 4 MB or smaller';
  else if (!TYPES[ext]) errors.resume = 'Use a PDF or Word file';
  else {
    bytes = new Uint8Array(await file.arrayBuffer());
    if (!TYPES[ext].magic.every((b, i) => bytes[i] === b)) errors.resume = 'That file does not look like a PDF or Word document';
  }
  if (Object.keys(errors).length) return json(422, { ok: false, error: 'invalid', message: 'Check the highlighted fields.', fields: errors });

  const emailField = FIELDS.find((f) => f.type === 'email');
  const email = emailField ? answers[emailField.name]?.[0] || '' : '';
  const nameParts = FIELDS.filter((f) => f.autocomplete === 'given-name' || f.autocomplete === 'family-name').map((f) => answers[f.name]?.[0] || '');

  let stored;
  try {
    const r = await fetch(env('APPS_SCRIPT_URL'), {
      method: 'POST',
      headers: { 'content-type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        secret: env('APPS_SCRIPT_SECRET'),
        email,
        filename: `${nameParts.join(' ').trim() || 'Applicant'} - Resume.${ext}`,
        mimeType: TYPES[ext].mime,
        data: Buffer.from(bytes).toString('base64'),
      }),
      redirect: 'follow',
    });
    stored = await r.json();
  } catch {
    stored = { ok: false, error: 'storage' };
  }
  if (!stored.ok && stored.error === 'duplicate') return fail(409, 'duplicate', 'We already have an application from this email. Write to about@flashforwardfoundation.org if you need to change it.');
  if (!stored.ok || !stored.fileId) return fail(502, 'storage', 'We could not save your resume. Please try again in a minute.');

  const body = new URLSearchParams();
  for (const f of FIELDS) for (const v of answers[f.name] || []) body.append(`entry.${f.entry}`, v);
  body.append(`entry.${RESUME_ENTRY}`, `https://drive.google.com/open?id=${stored.fileId}`);
  body.append(`entry.${KEY_ENTRY}`, env('SUBMIT_KEY'));
  if (COLLECTS_EMAIL) body.append('emailAddress', email);
  if (PAGE_COUNT > 1) body.append('pageHistory', Array.from({ length: PAGE_COUNT }, (_, i) => i).join(','));

  const gr = await fetch(`https://docs.google.com/forms/d/${env('GFORM_ID')}/formResponse`, {
    method: 'POST', body, redirect: 'manual',
  }).catch(() => null);
  if (!gr || gr.status !== 200) {
    console.error('formResponse failed', gr?.status, stored.fileId);
    return fail(502, 'form', 'We could not record your application. Please try again in a minute.');
  }
  return json(200, { ok: true });
}
