// Routes the site's contact, volunteer, and equipment forms to
// about@flashforwardfoundation.org via FormSubmit.co (no backend needed).
// Preserves the existing Webflow .w-form-done / .w-form-fail success/error UI.
(function () {
  var FORM_ENDPOINT = 'https://formsubmit.co/ajax/about@flashforwardfoundation.org';

  document.addEventListener('DOMContentLoaded', function () {
    var form = document.getElementById('wf-form-ContactForm');
    if (!form) return;

    var params = new URLSearchParams(window.location.search);
    if (params.get('topic') === 'sponsor-a-light') {
      var destinationNames = {
        'greatest-need': 'Where needed most',
        drc: 'DR Congo',
        haiti: 'Haiti through Brighten Haiti',
        india: 'India',
      };
      var requestedDestination = destinationNames[params.get('destination')] || destinationNames['greatest-need'];
      var requestedFrequency = params.get('frequency') === 'monthly' ? 'monthly' : 'one time';
      var requestedLights = Math.max(1, Math.min(100, parseInt(params.get('lights'), 10) || 1));
      var subjectField = form.querySelector('#subject');
      var messageField = form.querySelector('#Message');
      if (subjectField) {
        var sponsorOption = document.createElement('option');
        sponsorOption.value = 'SponsorALight';
        sponsorOption.textContent = 'Sponsor a Light';
        subjectField.appendChild(sponsorOption);
        subjectField.value = sponsorOption.value;
      }
      if (messageField && !messageField.value) {
        messageField.value = 'I’m interested in sponsoring ' + requestedLights + ' ' + (requestedLights === 1 ? 'light' : 'lights') + ' ' + requestedFrequency + '. Preferred destination: ' + requestedDestination + '. Please send me more information.';
      }
    }

    var wrapper = form.closest('.w-form') || form.parentElement;
    var doneMsg = wrapper ? wrapper.querySelector('.w-form-done') : null;
    var failMsg = wrapper ? wrapper.querySelector('.w-form-fail') : null;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var submitBtn = form.querySelector('input[type="submit"]');
      var originalValue = submitBtn ? submitBtn.value : null;
      if (submitBtn) {
        submitBtn.value = submitBtn.getAttribute('data-wait') || 'Please wait...';
        submitBtn.disabled = true;
      }

      fetch(FORM_ENDPOINT, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: new FormData(form),
      })
        .then(function (res) {
          if (!res.ok) throw new Error('Form submission failed');
          form.style.display = 'none';
          if (doneMsg) doneMsg.style.display = 'block';
        })
        .catch(function () {
          if (failMsg) failMsg.style.display = 'block';
          if (submitBtn) {
            submitBtn.disabled = false;
            if (originalValue) submitBtn.value = originalValue;
          }
        });
    });
  });
})();
