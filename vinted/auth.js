document.addEventListener('DOMContentLoaded', async () => {
  // Redirect already-logged-in users
  const me = await getMe();
  if (me) { window.location.href = '/vinted/'; return; }

  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');

  if (loginForm) {
    loginForm.addEventListener('submit', async e => {
      e.preventDefault();
      const btn = document.getElementById('btn-login');
      const errEl = document.getElementById('form-error');
      btn.disabled = true; btn.textContent = 'Bezig…'; errEl.textContent = '';
      try {
        await apiFetch('/auth/login', {
          method: 'POST',
          body: JSON.stringify({
            email: document.getElementById('f-email').value.trim(),
            password: document.getElementById('f-password').value,
          }),
        });
        window.location.href = getParam('next') || '/vinted/';
      } catch (err) {
        errEl.textContent = err.message;
        btn.disabled = false; btn.textContent = 'Inloggen';
      }
    });
  }

  if (registerForm) {
    registerForm.addEventListener('submit', async e => {
      e.preventDefault();
      const btn = document.getElementById('btn-register');
      const errEl = document.getElementById('form-error');
      btn.disabled = true; btn.textContent = 'Bezig…'; errEl.textContent = '';
      try {
        await apiFetch('/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            username: document.getElementById('f-username').value.trim(),
            email: document.getElementById('f-email').value.trim(),
            password: document.getElementById('f-password').value,
          }),
        });
        window.location.href = '/vinted/';
      } catch (err) {
        errEl.textContent = err.message;
        btn.disabled = false; btn.textContent = 'Account aanmaken';
      }
    });
  }
});
