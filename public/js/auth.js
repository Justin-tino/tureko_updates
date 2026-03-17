/* ===========================
   TUREKO — AUTH CLIENT JS
   Firebase Authentication
   =========================== */

(function () {
  'use strict';

  // =====================
  // FIREBASE INIT
  // =====================
  const config = window.__FIREBASE_CONFIG__;
  if (!config || !config.apiKey) {
    console.warn('Firebase config missing. Auth features will not work.');
  }

  if (!firebase.apps.length) {
    firebase.initializeApp(config);
  }
  const auth = firebase.auth();

  // =====================
  // DOM ELEMENTS
  // =====================
  const tabSignIn = document.getElementById('tabSignIn');
  const tabSignUp = document.getElementById('tabSignUp');
  const signinForm = document.getElementById('signinForm');
  const signupForm = document.getElementById('signupForm');
  const forgotForm = document.getElementById('forgotForm');
  const authDivider = document.getElementById('authDivider');
  const googleBtn = document.getElementById('googleSignInBtn');
  const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
  const backToSignIn = document.getElementById('backToSignIn');
  const authToast = document.getElementById('authToast');
  const authToastMsg = document.getElementById('authToastMsg');
  const authToastIcon = document.getElementById('authToastIcon');

  // Password strength elements
  const signupPassword = document.getElementById('signupPassword');
  const pwBarFill = document.getElementById('pwBarFill');
  const pwLabel = document.getElementById('pwLabel');
  const ruleLength = document.getElementById('rule-length');
  const ruleUpper = document.getElementById('rule-upper');
  const ruleNumber = document.getElementById('rule-number');
  const ruleSpecial = document.getElementById('rule-special');

  // Verification page elements
  const verifyEmailAddr = document.getElementById('verifyEmailAddr');
  const verifyStatus = document.getElementById('verifyStatus');
  const resendBtn = document.getElementById('resendBtn');

  // Role selector
  const roleSelector = document.getElementById('roleSelector');
  const signupRoleInput = document.getElementById('signupRole');

  // User dropdown
  const navUserBtn = document.getElementById('navUserBtn');
  const navUserDropdown = document.getElementById('navUserDropdown');

  // =====================
  // TOAST NOTIFICATION
  // =====================
  function showToast(message, type) {
    if (!authToast) return;
    authToast.className = 'auth-toast show ' + type;
    const icons = { error: '✕', success: '✓', info: 'ℹ' };
    if (authToastIcon) authToastIcon.textContent = icons[type] || '';
    if (authToastMsg) authToastMsg.textContent = message;
    setTimeout(() => {
      authToast.classList.remove('show');
    }, 6000);
  }

  // =====================
  // MODE TOGGLE (Sign In / Sign Up)
  // =====================
  function setMode(mode) {
    if (!tabSignIn) return;
    const isSignIn = mode === 'signin';
    const isForgot = mode === 'forgot';

    tabSignIn.classList.toggle('active', isSignIn);
    tabSignUp.classList.toggle('active', !isSignIn && !isForgot);

    if (signinForm) signinForm.style.display = isSignIn ? 'block' : 'none';
    if (signupForm) signupForm.style.display = (!isSignIn && !isForgot) ? 'block' : 'none';
    if (forgotForm) forgotForm.style.display = isForgot ? 'block' : 'none';
    if (authDivider) authDivider.style.display = isForgot ? 'none' : 'flex';
    if (googleBtn) googleBtn.style.display = isForgot ? 'none' : 'flex';
  }

  if (tabSignIn) tabSignIn.addEventListener('click', () => setMode('signin'));
  if (tabSignUp) tabSignUp.addEventListener('click', () => setMode('signup'));
  if (forgotPasswordBtn) forgotPasswordBtn.addEventListener('click', () => setMode('forgot'));
  if (backToSignIn) backToSignIn.addEventListener('click', () => setMode('signin'));

  // =====================
  // ROLE SELECTOR
  // =====================
  if (roleSelector) {
    roleSelector.querySelectorAll('.auth-role-card').forEach(card => {
      card.addEventListener('click', () => {
        roleSelector.querySelectorAll('.auth-role-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        if (signupRoleInput) signupRoleInput.value = card.getAttribute('data-role');
      });
    });
  }

  // =====================
  // PASSWORD VISIBILITY TOGGLE
  // =====================
  document.querySelectorAll('.auth-pw-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const input = document.getElementById(targetId);
      if (input) {
        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        btn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
      }
    });
  });

  // =====================
  // PASSWORD STRENGTH METER
  // =====================
  function checkPasswordStrength(pw) {
    const rules = {
      length: pw.length >= 8,
      upper: /[A-Z]/.test(pw),
      number: /[0-9]/.test(pw),
      special: /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/~`]/.test(pw),
    };

    // Update rule indicators
    if (ruleLength) ruleLength.classList.toggle('valid', rules.length);
    if (ruleUpper) ruleUpper.classList.toggle('valid', rules.upper);
    if (ruleNumber) ruleNumber.classList.toggle('valid', rules.number);
    if (ruleSpecial) ruleSpecial.classList.toggle('valid', rules.special);

    const score = Object.values(rules).filter(Boolean).length;
    const levels = ['', 'weak', 'fair', 'good', 'strong'];
    const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
    const level = levels[score] || '';

    if (pwBarFill) {
      pwBarFill.className = 'pw-bar-fill' + (level ? ' ' + level : '');
    }
    if (pwLabel) {
      pwLabel.textContent = pw.length > 0 ? labels[score] : '';
      pwLabel.className = 'pw-label' + (level ? ' ' + level : '');
    }

    return { isValid: score === 4, rules };
  }

  if (signupPassword) {
    signupPassword.addEventListener('input', () => {
      checkPasswordStrength(signupPassword.value);
    });
  }

  // =====================
  // BUTTON LOADING STATE
  // =====================
  function setLoading(btnId, loading) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    const span = btn.querySelector('span');
    const loader = btn.querySelector('.btn-loader');
    btn.disabled = loading;
    if (span) span.style.opacity = loading ? '0.6' : '1';
    if (loader) loader.style.display = loading ? 'inline-block' : 'none';
  }

  // =====================
  // SEND ID TOKEN TO SERVER
  // =====================
  async function createSession(idToken, role) {
    const payload = { idToken };
    if (role) payload.role = role;
    const res = await fetch('/auth/session-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Session creation failed.');
    return data;
  }

  // =====================
  // SIGN IN (Email / Password)
  // =====================
  if (signinForm) {
    signinForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      setLoading('signinSubmit', true);

      const email = document.getElementById('signinEmail').value.trim();
      const password = document.getElementById('signinPassword').value;

      try {
        const cred = await auth.signInWithEmailAndPassword(email, password);
        const idToken = await cred.user.getIdToken();
        const session = await createSession(idToken);

        if (!session.emailVerified) {
          // Send another verification email just in case
          if (!cred.user.emailVerified) {
            await cred.user.sendEmailVerification();
          }
          showToast('Please verify your email first. Check your inbox.', 'info');
          setLoading('signinSubmit', false);
          // Redirect to verification page
          setTimeout(() => {
            window.location.href = '/verify-email';
          }, 1500);
          return;
        }

        showToast('Signed in successfully!', 'success');
        setTimeout(() => { window.location.href = '/dashboard'; }, 800);
      } catch (err) {
        let msg = 'Sign in failed.';
        if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
          msg = 'Invalid email or password.';
        } else if (err.code === 'auth/too-many-requests') {
          msg = 'Too many failed attempts. Please try again later.';
        } else if (err.message) {
          msg = err.message;
        }
        showToast(msg, 'error');
        setLoading('signinSubmit', false);
      }
    });
  }

  // =====================
  // SIGN UP (Email / Password)
  // =====================
  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      setLoading('signupSubmit', true);

      const name = document.getElementById('signupName').value.trim();
      const email = document.getElementById('signupEmail').value.trim();
      const password = document.getElementById('signupPassword').value;
      const confirm = document.getElementById('signupConfirm').value;
      const role = signupRoleInput ? signupRoleInput.value : '';

      // Validate role
      if (!role) {
        showToast('Please select whether you are an Applicant or Business.', 'error');
        setLoading('signupSubmit', false);
        return;
      }

      // Validate passwords
      if (password !== confirm) {
        showToast('Passwords do not match.', 'error');
        setLoading('signupSubmit', false);
        return;
      }

      const { isValid } = checkPasswordStrength(password);
      if (!isValid) {
        showToast('Password does not meet all requirements.', 'error');
        setLoading('signupSubmit', false);
        return;
      }

      try {
        const cred = await auth.createUserWithEmailAndPassword(email, password);

        // Update display name
        await cred.user.updateProfile({ displayName: name });

        // Send verification email
        await cred.user.sendEmailVerification();

        // Create session on server (with role)
        const idToken = await cred.user.getIdToken(true);
        await createSession(idToken, role);

        showToast('Account created! Please verify your email.', 'success');
        setTimeout(() => {
          window.location.href = '/verify-email';
        }, 1200);
      } catch (err) {
        let msg = 'Sign up failed.';
        if (err.code === 'auth/email-already-in-use') {
          msg = 'This email is already registered. Try signing in.';
        } else if (err.code === 'auth/weak-password') {
          msg = 'Password is too weak.';
        } else if (err.code === 'auth/invalid-email') {
          msg = 'Invalid email address.';
        } else if (err.message) {
          msg = err.message;
        }
        showToast(msg, 'error');
        setLoading('signupSubmit', false);
      }
    });
  }

  // =====================
  // FORGOT PASSWORD
  // =====================
  if (forgotForm) {
    forgotForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      setLoading('forgotSubmit', true);

      const email = document.getElementById('forgotEmail').value.trim();

      try {
        await auth.sendPasswordResetEmail(email);
        showToast('Password reset email sent. Check your inbox.', 'success');
        setLoading('forgotSubmit', false);
      } catch (err) {
        let msg = 'Failed to send reset email.';
        if (err.code === 'auth/user-not-found') {
          msg = 'No account found with this email.';
        } else if (err.message) {
          msg = err.message;
        }
        showToast(msg, 'error');
        setLoading('forgotSubmit', false);
      }
    });
  }

  // =====================
  // GOOGLE SIGN IN
  // =====================
  if (googleBtn) {
    googleBtn.addEventListener('click', async () => {
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');

      try {
        const result = await auth.signInWithPopup(provider);
        const idToken = await result.user.getIdToken();
        await createSession(idToken);

        showToast('Signed in with Google!', 'success');
        setTimeout(() => { window.location.href = '/dashboard'; }, 800);
      } catch (err) {
        if (err.code === 'auth/popup-closed-by-user') return;
        let msg = 'Google sign-in failed.';
        if (err.message) msg = err.message;
        showToast(msg, 'error');
      }
    });
  }

  // =====================
  // EMAIL VERIFICATION PAGE — POLLING
  // =====================
  if (verifyEmailAddr) {
    // Show current user email
    const user = auth.currentUser;
    if (user) {
      verifyEmailAddr.textContent = user.email;
    }

    // Listen for auth state to get email
    auth.onAuthStateChanged(u => {
      if (u) {
        verifyEmailAddr.textContent = u.email;
      }
    });

    // Poll server for verification status every 5 seconds
    let pollInterval = setInterval(async () => {
      try {
        const res = await fetch('/auth/check-verification');
        const data = await res.json();
        if (data.verified) {
          clearInterval(pollInterval);
          if (verifyStatus) {
            verifyStatus.innerHTML = '<span style="color:var(--green);font-weight:600;">✓ Email verified!</span>';
          }
          // Re-login to get fresh session with emailVerified = true
          const user = auth.currentUser;
          if (user) {
            await user.reload();
            const idToken = await user.getIdToken(true);
            await createSession(idToken);
          }
          setTimeout(() => { window.location.href = '/dashboard'; }, 1500);
        }
      } catch (err) {
        // Silent — keep polling
      }
    }, 5000);
  }

  // Resend verification email
  if (resendBtn) {
    resendBtn.addEventListener('click', async () => {
      const user = auth.currentUser;
      if (!user) {
        // Try to get user from auth state
        showToast('Please sign in again to resend verification.', 'error');
        return;
      }
      try {
        await user.sendEmailVerification();
        showToast('Verification email sent!', 'success');
        resendBtn.disabled = true;
        resendBtn.textContent = 'Email Sent';
        setTimeout(() => {
          resendBtn.disabled = false;
          resendBtn.textContent = 'Resend Verification Email';
        }, 30000);
      } catch (err) {
        showToast('Failed to resend. Please try again later.', 'error');
      }
    });
  }

  // =====================
  // NAV USER DROPDOWN TOGGLE
  // =====================
  if (navUserBtn && navUserDropdown) {
    navUserBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      navUserDropdown.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
      if (!navUserDropdown.contains(e.target) && !navUserBtn.contains(e.target)) {
        navUserDropdown.classList.remove('open');
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') navUserDropdown.classList.remove('open');
    });
  }

})();
