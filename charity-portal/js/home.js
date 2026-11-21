/* ============================================================
   home.js
   Reads data/donations.json + data/users.json and animates the
   "impact" counters on index.html. Purely client-side (fetch of
   a local JSON file) - no database or API involved.
   ============================================================ */

function animateCount(el, endValue, prefix = "", suffix = "", duration = 1200) {
  const start = 0;
  const startTime = performance.now();

  function step(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(start + (endValue - start) * eased);
    el.textContent = prefix + current.toLocaleString() + suffix;
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

async function initHomeStats() {
  const totalEl = document.getElementById("homeStatTotal");
  const donorsEl = document.getElementById("homeStatDonors");
  const charitiesEl = document.getElementById("homeStatCharities");
  if (!totalEl) return; // not on this page

  try {
    const [donationsRes, usersRes] = await Promise.all([
      fetch("data/donations.json"),
      fetch("data/users.json")
    ]);
    const donations = await donationsRes.json();
    const users = await usersRes.json();

    const total = donations.reduce((sum, d) => sum + Number(d.amount), 0);
    const donorCount = users.donors.length;
    const charityCount = users.charities.length;

    animateCount(totalEl, total, "RWF ");
    animateCount(donorsEl, donorCount, "", "+");
    animateCount(charitiesEl, charityCount);
  } catch (err) {
    totalEl.textContent = "Data unavailable";
    console.error(err);
  }
}

function wireCauseTabs() {
  const tabs = document.querySelectorAll(".cause-tab");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initHomeStats();
  wireCauseTabs();
});
