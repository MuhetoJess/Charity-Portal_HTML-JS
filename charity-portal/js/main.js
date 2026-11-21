/* ============================================================
   main.js
   Shared behaviour for every page of the Charity Giving Portal:
   - stamps the footer year
   - runs a live client-side clock (no PHP/server needed)
   - shows/hides nav links depending on whether a user is
     "logged in" (tracked with sessionStorage, see auth.js)
   - wires up the logout button
   ============================================================ */

const CGP_SESSION_KEY = "cgp_session";

function getSession() {
  try {
    const raw = sessionStorage.getItem(CGP_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function clearSession() {
  sessionStorage.removeItem(CGP_SESSION_KEY);
}

function stampFooterYear() {
  const el = document.getElementById("footerYear");
  if (el) el.textContent = new Date().getFullYear();
}

function startLiveClock() {
  const el = document.getElementById("liveClock");
  if (!el) return;
  const tick = () => {
    const now = new Date();
    el.textContent = now.toLocaleString(undefined, {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  };
  tick();
  setInterval(tick, 1000);
}

function refreshNavForSession() {
  const session = getSession();
  const loginItem = document.getElementById("navLoginItem");
  const registerItem = document.getElementById("navRegisterItem");
  const dashboardItem = document.getElementById("navDashboardItem");
  const logoutItem = document.getElementById("navLogoutItem");
  const dashboardLink = document.getElementById("navDashboardLink");
  const greetingEl = document.getElementById("navGreeting");

  if (!loginItem || !registerItem || !dashboardItem || !logoutItem) return;

  if (session) {
    loginItem.style.display = "none";
    registerItem.style.display = "none";
    dashboardItem.style.display = "";
    logoutItem.style.display = "";
    if (dashboardLink) {
      dashboardLink.href =
        session.role === "charity" ? "charity-dashboard.html" : "donor-dashboard.html";
    }
    if (greetingEl) {
      greetingEl.textContent = "Hi, " + session.name.split(" ")[0];
      greetingEl.style.display = "";
    }
  } else {
    loginItem.style.display = "";
    registerItem.style.display = "";
    dashboardItem.style.display = "none";
    logoutItem.style.display = "none";
    if (greetingEl) greetingEl.style.display = "none";
  }
}

function showFormMessage(msgEl, text, type) {
  msgEl.textContent = text;
  msgEl.className = "form-msg show " + type;
}

function wireLogout() {
  const logoutLink = document.getElementById("navLogoutLink");
  if (!logoutLink) return;
  logoutLink.addEventListener("click", (e) => {
    e.preventDefault();
    clearSession();
    window.location.href = "index.html";
  });
}

document.addEventListener("DOMContentLoaded", () => {
  stampFooterYear();
  startLiveClock();
  refreshNavForSession();
  wireLogout();
});
