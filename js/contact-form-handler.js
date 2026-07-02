// Routes the site's contact/volunteer/equipment/ask-for-help forms to
// about@flashforwardfoundation.org via FormSubmit.co (no backend needed).
// Preserves the existing Webflow .w-form-done / .w-form-fail success/error UI.
(function () {
  var FORM_ENDPOINT = 'https://formsubmit.co/ajax/about@flashforwardfoundation.org';

  document.addEventListener('DOMContentLoaded', function () {
    var form = document.getElementById('wf-form-ContactForm');
    if (!form) return;

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
