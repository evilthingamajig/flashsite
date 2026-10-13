"""Print a public Google Form's questions with their entry IDs, for api/_apply-fields.mjs.

    python tools/apply/gform-fields.py <form edit or view ID>

Works only when the form opens without sign-in (no file-upload question, no "Limit to 1 response",
no organization restriction). Each question prints as: entry ID, type, required, title, options.
"""
import json
import re
import sys
import urllib.request

TYPES = {0: 'short', 1: 'paragraph', 2: 'choice', 3: 'dropdown', 4: 'checkboxes', 5: 'scale', 7: 'grid',
         8: 'section', 9: 'date', 10: 'time', 13: 'file'}

form_id = sys.argv[1]
req = urllib.request.Request(f'https://docs.google.com/forms/d/{form_id}/viewform',
                             headers={'User-Agent': 'Mozilla/5.0'})
try:
    html = urllib.request.urlopen(req).read().decode('utf-8')
except urllib.error.HTTPError as e:
    sys.exit(f'HTTP {e.code}: the form still needs sign-in. Check its Responses settings.')
m = re.search(r'FB_PUBLIC_LOAD_DATA_ = (.*?);</script>', html, re.S)
if not m:
    sys.exit('No form data on the page. The form may be closed or need sign-in.')
data = json.loads(m.group(1))
pages = 1
for item in data[1][1]:
    kind = TYPES.get(item[3], item[3])
    if kind == 'section':
        pages += 1
        print(f'--- section: {item[1]}')
        continue
    for entry in item[4] or []:
        options = [o[0] for o in entry[1] or [] if o and o[0]]
        print(f'{entry[0]}\t{kind}\trequired={bool(entry[2])}\t{item[1]}' + (f'\t{options}' if options else ''))
print(f'PAGE_COUNT = {pages}')
if 'name="emailAddress"' in html:
    print('COLLECTS_EMAIL = true  (the form collects emails as "Responder input")')
