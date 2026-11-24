const menuToggle = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#main-nav');

menuToggle.addEventListener('click', () => {
  const open = menuToggle.getAttribute('aria-expanded') === 'true';
  menuToggle.setAttribute('aria-expanded', String(!open));
});

navigation.addEventListener('click', event => {
  if (event.target.closest('a')) menuToggle.setAttribute('aria-expanded', 'false');
});

document.addEventListener('keydown', event => {
  if (event.key !== 'Escape' || menuToggle.getAttribute('aria-expanded') !== 'true') return;
  if (event.target.closest('.nav-services[open]')) return;
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.focus();
}, { capture: true });

const form = document.querySelector('#call-request');
let attempt;

form.addEventListener('submit', async event => {
  event.preventDefault();
  const button = form.querySelector('button[type="submit"]');
  const status = form.querySelector('[role="status"]');
  if (button.disabled) return;

  const data = Object.fromEntries(new FormData(form));
  const payload = {
    fullName: data.name.trim(),
    email: data.email,
    website: data.website,
    role: 'Help defining a role',
    message: [
      'STAFFING INQUIRY',
      data.phone.trim() && `Phone: ${data.phone.trim()}`,
      data.message.trim()
    ].filter(Boolean).join('\n')
  };

  const fingerprint = JSON.stringify(payload);
  if (!attempt || attempt.fingerprint !== fingerprint) {
    attempt = { fingerprint, id: crypto.randomUUID() };
  }

  button.disabled = true;
  form.setAttribute('aria-busy', 'true');
  status.textContent = 'Sending your request…';

  try {
    const response = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, requestId: attempt.id })
    });
    const result = await response.json();
    if (!response.ok || !result.ok) {
      throw new Error(result.error || 'Unable to send your request. Please try again.');
    }
    form.reset();
    attempt = null;
    status.textContent = 'Your staffing inquiry has been received. EMSIT will follow up with you.';
  } catch (error) {
    status.textContent = error instanceof TypeError || error instanceof SyntaxError
      ? 'Unable to send your request. Your details have been kept. Please try again.'
      : error.message;
  } finally {
    button.disabled = false;
    form.removeAttribute('aria-busy');
  }
});
