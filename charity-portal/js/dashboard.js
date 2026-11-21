/* ============================================================
   dashboard.js
   Powers donor-dashboard.html and charity-dashboard.html.
   All data is read straight from data/donations.json +
   data/users.json. A new pledge is POSTed to
   data/save_donation.php, which appends it to donations.json
   and writes the file back to disk - so it shows up on the
   charity's dashboard too, not just the donor's own browser.
   ============================================================ */

function requireSession(expectedRole) {
  const session = getSession();
  if (!session || session.role !== expectedRole) {
    window.location.href = "login.html";
    return null;
  }
  return session;
}

async function loadDonations() {
  // cache: "no-store" so a pledge just saved always shows up immediately.
  const res = await fetch("data/donations.json", { cache: "no-store" });
  if (!res.ok) throw new Error("Could not load data/donations.json (" + res.status + ")");
  return res.json();
}

async function loadUsersData() {
  const res = await fetch("data/users.json", { cache: "no-store" });
  if (!res.ok) throw new Error("Could not load data/users.json (" + res.status + ")");
  return res.json();
}

function formatRWF(amount) {
  return "RWF " + Number(amount).toLocaleString();
}

function statusBadge(status) {
  const cls = status.toLowerCase() === "completed" ? "completed" : "pending";
  return `<span class="badge ${cls}">${status}</span>`;
}

/* ---------------------- DONOR DASHBOARD ---------------------- */

async function initDonorDashboard() {
  const session = requireSession("donor");
  if (!session) return;

  document.getElementById("donorNameHeading").textContent = session.name;

  const [donations, users] = await Promise.all([loadDonations(), loadUsersData()]);
  const myDonations = donations
    .filter((d) => d.donorId === session.id)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  renderDonorStats(myDonations);
  renderDonorTable(myDonations);
  populateCharitySelect(users.charities);
  wirePledgeForm(session, users.charities);
}

function renderDonorStats(myDonations) {
  const total = myDonations.reduce((sum, d) => sum + Number(d.amount), 0);
  const charitiesSupported = new Set(myDonations.map((d) => d.charityId)).size;

  document.getElementById("statTotalGiven").textContent = formatRWF(total);
  document.getElementById("statDonationCount").textContent = myDonations.length;
  document.getElementById("statCharityCount").textContent = charitiesSupported;
}

function renderDonorTable(myDonations) {
  const tbody = document.getElementById("donorDonationsBody");
  const emptyState = document.getElementById("donorEmptyState");
  tbody.innerHTML = "";

  if (!myDonations.length) {
    emptyState.style.display = "block";
    return;
  }
  emptyState.style.display = "none";

  myDonations.forEach((d) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${d.date}</td>
      <td>${d.charityName}</td>
      <td>${formatRWF(d.amount)}</td>
      <td>${statusBadge(d.status)}</td>
      <td>${d.note ? d.note : "&mdash;"}</td>
    `;
    tbody.appendChild(tr);
  });
}

function populateCharitySelect(charities) {
  const select = document.getElementById("pledgeCharity");
  if (!select) return;
  charities.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.name;
    opt.dataset.name = c.name;
    select.appendChild(opt);
  });
}

function wirePledgeForm(session, charities) {
  const form = document.getElementById("pledgeForm");
  if (!form) return;
  const msgEl = document.getElementById("pledgeMsg");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const charityId = form.pledgeCharity.value;
    const charity = charities.find((c) => c.id === charityId);
    const amount = Number(form.pledgeAmount.value);
    const frequency = form.querySelector('input[name="frequency"]:checked').value;
    const note = form.pledgeNote.value.trim();
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    const payload = {
      donorId: session.id,
      donorName: session.name,
      charityId: charityId,
      charityName: charity ? charity.name : "Unknown charity",
      amount: amount,
      note: note ? note + (frequency === "monthly" ? " (monthly pledge)" : "") : (frequency === "monthly" ? "Monthly pledge" : "")
    };

    try {
      const res = await fetch("data/save_donation.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await res.json();

      if (!result.ok) {
        showFormMessage(msgEl, result.error || "Could not record pledge.", "error");
        submitBtn.disabled = false;
        return;
      }

      const donations = await loadDonations();
      const myDonations = donations
        .filter((d) => d.donorId === session.id)
        .sort((a, b) => new Date(b.date) - new Date(a.date));
      renderDonorStats(myDonations);
      renderDonorTable(myDonations);

      form.reset();
      showFormMessage(msgEl, "Thank you! Your pledge of " + formatRWF(amount) + " has been saved to donations.json.", "success");
    } catch (err) {
      showFormMessage(msgEl, "Something went wrong: " + err.message, "error");
    } finally {
      submitBtn.disabled = false;
    }
  });
}

/* --------------------- CHARITY DASHBOARD --------------------- */

async function initCharityDashboard() {
  const session = requireSession("charity");
  if (!session) return;

  document.getElementById("charityNameHeading").textContent = session.name;

  const donations = await loadDonations();
  const received = donations
    .filter((d) => d.charityId === session.id)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  renderCharityStats(received);
  renderCharityTable(received);
  renderDonorList(received);
}

function renderCharityStats(received) {
  const total = received.reduce((sum, d) => sum + Number(d.amount), 0);
  const donorCount = new Set(received.map((d) => d.donorId)).size;
  const pendingCount = received.filter((d) => d.status.toLowerCase() === "pending").length;

  document.getElementById("statTotalReceived").textContent = formatRWF(total);
  document.getElementById("statDonorCount").textContent = donorCount;
  document.getElementById("statPendingCount").textContent = pendingCount;
}

function renderCharityTable(received) {
  const tbody = document.getElementById("charityDonationsBody");
  const emptyState = document.getElementById("charityEmptyState");
  tbody.innerHTML = "";

  if (!received.length) {
    emptyState.style.display = "block";
    return;
  }
  emptyState.style.display = "none";

  received.forEach((d) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${d.date}</td>
      <td>${d.donorName}</td>
      <td>${formatRWF(d.amount)}</td>
      <td>${statusBadge(d.status)}</td>
      <td>${d.note ? d.note : "&mdash;"}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderDonorList(received) {
  const list = document.getElementById("charityDonorList");
  if (!list) return;
  list.innerHTML = "";

  const byDonor = {};
  received.forEach((d) => {
    if (!byDonor[d.donorId]) byDonor[d.donorId] = { name: d.donorName, total: 0, count: 0 };
    byDonor[d.donorId].total += Number(d.amount);
    byDonor[d.donorId].count += 1;
  });

  const donors = Object.values(byDonor).sort((a, b) => b.total - a.total);

  if (!donors.length) {
    list.innerHTML = '<li class="empty-state">No donors yet.</li>';
    return;
  }

  donors.forEach((d) => {
    const li = document.createElement("li");
    li.innerHTML = `<strong>${d.name}</strong> &mdash; ${formatRWF(d.total)} across ${d.count} gift${d.count > 1 ? "s" : ""}`;
    list.appendChild(li);
  });
}
