// Community stories are published by Flash Forward after review. No account is required.
(function () {
  var feed = document.querySelector('[data-story-feed]');
  if (feed) {
    var search = document.querySelector('[data-story-search]');
    var country = document.querySelector('[data-story-country]');
    var tabs = document.querySelectorAll('[data-story-category]');
    var cards = Array.from(feed.querySelectorAll('[data-story-card]'));
    var count = document.querySelector('[data-story-count]');
    var empty = document.querySelector('[data-story-empty]');
    var selected = 'all';
    function filter() {
      var query = search.value.trim().toLocaleLowerCase();
      var total = 0;
      cards.forEach(function (card) {
        var matches = (selected === 'all' || card.dataset.category === selected)
          && (!country.value || card.dataset.country === country.value)
          && (!query || card.textContent.toLocaleLowerCase().includes(query));
        card.hidden = !matches;
        if (matches) total++;
      });
      count.textContent = total + (total === 1 ? ' story' : ' stories');
      empty.hidden = total > 0;
    }
    tabs.forEach(function (button) {
      button.addEventListener('click', function () {
        selected = button.dataset.storyCategory;
        tabs.forEach(function (tab) { tab.setAttribute('aria-pressed', String(tab === button)); });
        filter();
      });
    });
    search.addEventListener('input', filter);
    country.addEventListener('change', filter);
    document.querySelector('[data-story-reset]').addEventListener('click', function () {
      search.value = '';
      country.value = '';
      selected = 'all';
      tabs.forEach(function (tab) { tab.setAttribute('aria-pressed', String(tab.dataset.storyCategory === 'all')); });
      filter();
      search.focus();
    });
    filter();
  }

  var form = document.querySelector('[data-story-form]');
  if (!form) return;
  form.hidden = false;
  var draft = document.querySelector('[data-story-draft]');
  var draftText = document.querySelector('[data-story-draft-text]');
  var emailLink = document.querySelector('[data-story-email]');
  var copyStatus = document.querySelector('[data-story-copy-status]');
  var subject = '';
  function text(name) { return String(form.elements.namedItem(name).value).trim(); }

  // The draft stays on the page until the author opens their email app and sends it.
  form.addEventListener('submit', function (event) {
    event.preventDefault();
    ['name', 'title', 'story'].forEach(function (name) {
      var min = name === 'story' ? 30 : 1;
      form.elements.namedItem(name).setCustomValidity(text(name).length < min
        ? (name === 'story' ? 'Please write at least 30 characters about your experience.' : 'Please enter a name or title.') : '');
    });
    if (!form.reportValidity()) return;
    subject = 'Story for review: ' + text('title');
    draftText.value = 'To: about@flashforwardfoundation.org\nSubject: ' + subject + '\n\n'
      + 'Name or organization: ' + text('name') + '\n'
      + 'I am sharing as: ' + text('role') + '\n'
      + 'Country or region: ' + (text('region') || 'Not specified') + '\n\n'
      + text('story') + '\n\n'
      + 'I have permission to share this story for review. Please follow up with me about photos and any permissions needed before publication.';
    var body = draftText.value.split('\n').slice(3).join('\n');
    emailLink.href = 'mailto:about@flashforwardfoundation.org?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    copyStatus.textContent = '';
    draft.hidden = false;
    draft.focus();
    draft.scrollIntoView({ behavior: 'auto', block: 'start' });
  });
  form.addEventListener('input', function () {
    ['name', 'title', 'story'].forEach(function (name) { form.elements.namedItem(name).setCustomValidity(''); });
    // Never leave an older draft visible after the author edits their story.
    draft.hidden = true;
    emailLink.removeAttribute('href');
    copyStatus.textContent = '';
  });
  document.querySelector('[data-story-copy]').addEventListener('click', function () {
    if (!navigator.clipboard) {
      draftText.focus(); draftText.select();
      copyStatus.textContent = 'Select and copy the draft above, then paste it into your email.';
      return;
    }
    navigator.clipboard.writeText(draftText.value).then(function () {
      copyStatus.textContent = 'Draft copied. Paste it into an email to about@flashforwardfoundation.org.';
    }).catch(function () {
      draftText.focus(); draftText.select();
      copyStatus.textContent = 'Select and copy the draft above, then paste it into your email.';
    });
  });
})();
