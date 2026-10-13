// Maps the site's application fields to the Google Form's entry IDs (the numbers in entry.123456).
// Regenerate the IDs with tools/apply/gform-fields.py once the form opens without sign-in.
// `name` must match the input names in the #apply form on the internship pages.
// Leave an entry empty and /api/apply reports not ready, so the pages keep the plain Google Form link.
export const FIELDS = [
  { name: 'first_name', entry: '', required: true, autocomplete: 'given-name', max: 80 },
  { name: 'last_name', entry: '', required: true, autocomplete: 'family-name', max: 80 },
  { name: 'email', entry: '', required: true, type: 'email', max: 200 },
  { name: 'school', entry: '', required: true, max: 200 },
  { name: 'grade', entry: '', required: true, options: ['9th grade', '10th grade', '11th grade', '12th grade', 'College freshman', 'College sophomore', 'College junior', 'College senior', 'Other'] },
  { name: 'track', entry: '', required: true, options: ['Marketing & Communications', 'Partnerships & Operations', 'Fundraising & Development', 'Not sure yet'] },
  { name: 'why', entry: '', required: true, max: 1500 },
];
export const RESUME_ENTRY = ''; // short-answer question that receives the Drive link
export const KEY_ENTRY = ''; // short-answer question that receives SUBMIT_KEY
export const PAGE_COUNT = 1; // sections in the Google Form
export const COLLECTS_EMAIL = false; // true if the form's "Collect email addresses" is "Responder input"
