const API_BASE = ''; // same origin, so just ''

// Modal elements
const authModal = document.getElementById('authModal');
const startBtn = document.getElementById('startBtn');
const trialBtn = document.getElementById('trialBtn');
const learnMoreBtn = document.getElementById('learnMoreBtn');
const closeButtons = document.querySelectorAll('.modal .close');

[startBtn, trialBtn].forEach((btn) => {
  if (btn) {
    btn.addEventListener('click', () => {
      authModal.style.display = 'block';
    });
  }
});

if (learnMoreBtn) {
  learnMoreBtn.addEventListener('click', () => {
    document.getElementById('about').scrollIntoView({ behavior: 'smooth' });
  });
}

closeButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    btn.closest('.modal').style.display = 'none';
  });
});

window.addEventListener('click', (e) => {
  if (e.target === authModal) {
    authModal.style.display = 'none';
  }
});

// Tabs (Login / Register)
const tabButtons = document.querySelectorAll('.auth-tab-btn');
const tabContents = document.querySelectorAll('.auth-tab-content');

tabButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const target = btn.getAttribute('data-tab');

    tabButtons.forEach((b) => b.classList.remove('active'));
    tabContents.forEach((c) => c.classList.remove('active'));

    btn.classList.add('active');
    document.getElementById(target).classList.add('active');
  });
});

// Auth forms
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const loginError = document.getElementById('loginError');
const registerError = document.getElementById('registerError');

if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.textContent = '';

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok) {
        loginError.textContent = data.message || 'Login failed';
        return;
      }

      // Save user to localStorage and redirect to dashboard
      localStorage.setItem('mmUser', JSON.stringify(data.user));
      window.location.href = 'dashboard.html';
    } catch (err) {
      console.error(err);
      loginError.textContent = 'Server error. Try again.';
    }
  });
}

if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    registerError.textContent = '';

    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document
      .getElementById('registerPassword')
      .value.trim();
    const fitnessGoal = document.getElementById('fitnessGoal').value;
    const bodyType = document.getElementById('bodyType').value;

    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          fitnessGoal,
          bodyType
        })
      });

      const data = await res.json();
      if (!res.ok) {
        registerError.textContent = data.message || 'Registration failed';
        return;
      }

      // Save user to localStorage and redirect
      localStorage.setItem('mmUser', JSON.stringify(data.user));
      window.location.href = 'dashboard.html';
    } catch (err) {
      console.error(err);
      registerError.textContent = 'Server error. Try again.';
    }
  });
}

// Simple subscribe form demo
const subscribeForm = document.getElementById('subscribeForm');
if (subscribeForm) {
  subscribeForm.addEventListener('submit', (e) => {
    e.preventDefault();
    alert('Thanks for subscribing to MoveMentor!');
    subscribeForm.reset();
  });
}