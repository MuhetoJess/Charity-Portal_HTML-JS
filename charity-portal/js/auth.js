/* ============================================================
   auth.js
   Login + registration for two user classes (Donor and Charity).
   Dummy accounts live in data/users.json. A new registration is
   POSTed to data/save_user.php, which appends it to users.json
   and writes the file back to disk - so new accounts persist for
   real (any browser, any computer on the network), not just in
   this one browser's storage.

   This is still a demo-level setup: no password hashing, no
   server-side session, minimal validation in the PHP. Fine for
   coursework with dummy data; swap in a real backend/database
   before this handles real user information.
   ============================================================ */

/* ---------- data loading ---------- */

async function loadAllUsers() {
  // cache: "no-store" so a save right before this always shows up,
  // instead of the browser serving a stale cached copy of the file.
  const res = await fetch("data/users.json", { cache: "no-store" });
  if (!res.ok) throw new Error("Could not load data/users.json (" + res.status + ")");
  return res.json();
}

/* ---------- role tabs (shared markup on login.html & register.html) ---------- */

function wireRoleTabs() {
  const tabButtons = document.querySelectorAll(".role-tabs button");
  const panels = document.querySelectorAll(".auth-panel");
  if (!tabButtons.length) return;

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabButtons.forEach((b) => b.classList.remove("active"));
      panels.forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(btn.dataset.target).classList.add("active");
    });
  });
}

/* ---------- password strength meter ---------- */

function scorePassword(pwd) {
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
  if (/\d/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  return score; // 0-4
}

function wireStrengthMeter(passwordInputId, meterBarId, meterLabelId) {
  const input = document.getElementById(passwordInputId);
  const bar = document.getElementById(meterBarId);
  const label = document.getElementById(meterLabelId);
  if (!input || !bar) return;

  const levels = [
    { width: "10%", color: "#c0392b", text: "Very weak" },
    { width: "35%", color: "#c0392b", text: "Weak" },
    { width: "60%", color: "#b9770e", text: "Okay" },
    { width: "80%", color: "#1e8449", text: "Good" },
    { width: "100%", color: "#1e8449", text: "Strong" }
  ];

  input.addEventListener("input", () => {
    const score = scorePassword(input.value);
    const level = levels[score];
    bar.style.width = input.value ? level.width : "0%";
    bar.style.background = level.color;
    if (label) label.textContent = input.value ? level.text : "";
  });
}

/* ---------- confirm-password live validation ---------- */

function wireConfirmPassword(passwordId, confirmId) {
  const pwd = document.getElementById(passwordId);
  const confirm = document.getElementById(confirmId);
  if (!pwd || !confirm) return;

  const check = () => {
    if (confirm.value && confirm.value !== pwd.value) {
      confirm.setCustomValidity("Passwords do not match.");
    } else {
      confirm.setCustomValidity("");
    }
  };
  pwd.addEventListener("input", check);
  confirm.addEventListener("input", check);
}

/* ---------- login handling ---------- */
/* showFormMessage() lives in main.js (loaded before this file). */

function wireLoginForm(formId, role, msgId) {
  const form = document.getElementById(formId);
  if (!form) return;
  const msgEl = document.getElementById(msgId);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const email = form.querySelector('[name="email"]').value.trim();
    const password = form.querySelector('[name="password"]').value;
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    try {
      const all = await loadAllUsers();
      const list = role === "charity" ? all.charities : all.donors;
      const user = list.find(
        (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
      );

      if (!user) {
        showFormMessage(msgEl, "Incorrect email or password. Please try again.", "error");
        submitBtn.disabled = false;
        return;
      }

      const session = { role, id: user.id, name: user.name, email: user.email };
      sessionStorage.setItem(CGP_SESSION_KEY, JSON.stringify(session));

      showFormMessage(msgEl, "Login successful. Redirecting to your dashboard...", "success");
      setTimeout(() => {
        window.location.href = role === "charity" ? "charity-dashboard.html" : "donor-dashboard.html";
      }, 700);
    } catch (err) {
      showFormMessage(msgEl, "Something went wrong loading account data: " + err.message, "error");
      submitBtn.disabled = false;
    }
  });
}

/* ---------- registration handling ---------- */

function wireRegisterForm(formId, role, msgId) {
  const form = document.getElementById(formId);
  if (!form) return;
  const msgEl = document.getElementById(msgId);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const email = form.querySelector('[name="email"]').value.trim();
    const password = form.querySelector('[name="password"]').value;
    const name = form.querySelector('[name="name"]').value.trim();
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    const user = { name, email, password };
    if (role === "charity") {
      user.regNumber = form.querySelector('[name="regNumber"]').value.trim();
      user.category = form.querySelector('[name="category"]').value;
    } else {
      user.phone = form.querySelector('[name="phone"]').value.trim();
    }

    try {
      const res = await fetch("data/save_user.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, user })
      });
      const result = await res.json();

      if (!result.ok) {
        showFormMessage(msgEl, result.error || "Could not create account.", "error");
        submitBtn.disabled = false;
        return;
      }

      const session = { role, id: result.user.id, name: result.user.name, email: result.user.email };
      sessionStorage.setItem(CGP_SESSION_KEY, JSON.stringify(session));

      showFormMessage(msgEl, "Account created and saved to users.json! Redirecting...", "success");
      setTimeout(() => {
        window.location.href = role === "charity" ? "charity-dashboard.html" : "donor-dashboard.html";
      }, 700);
    } catch (err) {
      showFormMessage(msgEl, "Something went wrong: " + err.message, "error");
      submitBtn.disabled = false;
    }
  });
}
