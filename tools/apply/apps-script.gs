// Flash Forward intern applications: resume storage for /api/apply.
// Paste into a new Apps Script project owned by the account that owns the intern Google Form.
// Project Settings > Script properties:
//   SECRET       same value as APPS_SCRIPT_SECRET in Vercel
//   FOLDER_ID    Drive folder for resumes (the ID at the end of the folder's URL)
//   FORM_ID      the form's edit ID (docs.google.com/forms/d/<FORM_ID>/edit)
//   EMAIL_TITLE  exact title of the form's email question, e.g. "Email"
// Deploy > New deployment > Web app: Execute as "Me", Who has access "Anyone". Copy the /exec URL
// into APPS_SCRIPT_URL in Vercel. Re-deploy (Manage deployments > Edit > New version) after edits.
//
// This script only stores the file and checks for a repeat email. /api/apply then submits the
// application to the form itself, so the form's own submit automations still run.

function doPost(e) {
  var p = PropertiesService.getScriptProperties();
  var body;
  try { body = JSON.parse(e.postData.contents); } catch (err) { return out({ ok: false, error: 'bad_request' }); }
  if (!body.secret || body.secret !== p.getProperty('SECRET')) return out({ ok: false, error: 'forbidden' });

  var email = String(body.email || '').trim().toLowerCase();
  if (email && alreadyApplied(email, p)) return out({ ok: false, error: 'duplicate' });

  var name = String(body.filename || 'Resume').replace(/[\\\/:*?"<>|]/g, '').slice(0, 120);
  var blob = Utilities.newBlob(Utilities.base64Decode(body.data), body.mimeType, name);
  var file = DriveApp.getFolderById(p.getProperty('FOLDER_ID')).createFile(blob);
  if (email) file.setDescription('Applicant: ' + email);
  return out({ ok: true, fileId: file.getId() });
}

// Replaces the form's "Limit to 1 response", which requires applicants to sign in to Google.
function alreadyApplied(email, p) {
  var title = p.getProperty('EMAIL_TITLE') || 'Email';
  var responses = FormApp.openById(p.getProperty('FORM_ID')).getResponses();
  for (var i = responses.length - 1; i >= 0; i--) {
    var items = responses[i].getItemResponses();
    for (var j = 0; j < items.length; j++) {
      if (items[j].getItem().getTitle() === title && String(items[j].getResponse()).trim().toLowerCase() === email) return true;
    }
  }
  return false;
}

function out(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
