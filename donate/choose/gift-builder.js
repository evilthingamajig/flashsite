(function () {
  'use strict';

  const LIGHT_COST = 5.17;
  const destinationLabels = {
    'greatest-need': 'Destination chosen by Flash Forward',
    drc: 'Preferred destination: DR Congo',
    haiti: 'Preferred destination: Haiti through Brighten Haiti',
    india: 'Preferred destination: India'
  };
  const updateMessages = {
    'greatest-need': 'You’ll receive personalized updates from the country and partner your gift supports.',
    drc: 'You’ll receive personalized updates from Flash Forward’s work with Malaika in DR Congo.',
    haiti: 'You’ll receive personalized updates from Flash Forward’s work with Brighten Haiti.',
    india: 'You’ll receive personalized updates from Flash Forward’s work with Loksadhana in India.'
  };

  function initializeBuilder(builder) {
    let quantity = 1;
    let destination = builder.dataset.destination || 'greatest-need';
    const quantityButtons = Array.from(builder.querySelectorAll('[data-quantity]'));
    const customQuantity = builder.querySelector('[data-custom-quantity]');
    const frequencies = Array.from(builder.querySelectorAll('input[type="radio"][value="once"], input[type="radio"][value="monthly"]'));
    const summaryLabel = builder.querySelector('[data-gift-summary-label]');
    const summaryAmount = builder.querySelector('[data-gift-summary-amount]');
    const summaryDestination = builder.querySelector('[data-gift-summary-destination]');
    const action = builder.querySelector('[data-donate-action]');
    const updatesMessage = builder.querySelector('[data-updates-message]');

    function frequency() {
      const checked = frequencies.find((input) => input.checked);
      return checked ? checked.value : 'once';
    }

    function render() {
      const recurring = frequency() === 'monthly';
      const amount = (LIGHT_COST * quantity).toFixed(2);
      const lightWord = quantity === 1 ? 'light' : 'lights';
      summaryLabel.textContent = `${quantity} ${lightWord}, ${recurring ? 'every month' : 'one time'}`;
      summaryAmount.textContent = `$${amount}${recurring ? '/mo' : ''}`;
      summaryDestination.textContent = destinationLabels[destination] || destinationLabels['greatest-need'];
      if (updatesMessage) updatesMessage.textContent = updateMessages[destination] || updateMessages['greatest-need'];
      const contactUrl = new URL('/contact-us', window.location.origin);
      contactUrl.searchParams.set('topic', 'sponsor-a-light');
      contactUrl.searchParams.set('destination', destination);
      contactUrl.searchParams.set('frequency', recurring ? 'monthly' : 'once');
      contactUrl.searchParams.set('lights', String(quantity));
      action.href = `${contactUrl.pathname}${contactUrl.search}`;
      action.dataset.amount = amount;
      action.dataset.frequency = recurring ? 'monthly' : 'once';
      action.dataset.destination = destination;
      action.setAttribute('aria-label', `Ask about sponsoring ${quantity} ${lightWord} ${recurring ? 'monthly' : 'one time'}; ${summaryDestination.textContent}`);
    }

    function selectPreset(button) {
      quantity = Number(button.dataset.quantity);
      if (customQuantity) customQuantity.value = '';
      quantityButtons.forEach((item) => {
        const active = item === button;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-pressed', String(active));
      });
      render();
    }

    quantityButtons.forEach((button) => button.addEventListener('click', () => selectPreset(button)));
    frequencies.forEach((input) => input.addEventListener('change', render));
    if (customQuantity) {
      customQuantity.addEventListener('input', () => {
        if (customQuantity.value === '') return;
        quantity = Math.max(1, Math.min(100, Math.floor(Number(customQuantity.value) || 1)));
        customQuantity.value = String(quantity);
        quantityButtons.forEach((item) => {
          item.classList.remove('is-active');
          item.setAttribute('aria-pressed', 'false');
        });
        render();
      });
      customQuantity.addEventListener('blur', () => {
        if (customQuantity.value !== '') return;
        const first = quantityButtons.find((item) => item.dataset.quantity === '1');
        if (first) selectPreset(first);
      });
    }
    if (builder.hasAttribute('data-follow-destination')) {
      document.addEventListener('flash:destinationchange', (event) => {
        if (!event.detail || !destinationLabels[event.detail.destination]) return;
        destination = event.detail.destination;
        builder.dataset.destination = destination;
        render();
      });
    }
    render();
  }

  document.querySelectorAll('[data-gift-builder]').forEach(initializeBuilder);
}());
