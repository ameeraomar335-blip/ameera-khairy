/* =========================================================
   Kad Kahwin Digital · Ameera & Khairy
   ========================================================= */

const CONFIG = {
  // Paste your Google Apps Script Web App URL between the quotes
  // (it looks like https://script.google.com/macros/s/AKfy..../exec)
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbwzBlcpqqFi71a-ZxelmycraHp5tHRs7MD_pEUl_-p9Pm6GGJgVU8BOUmSZj0dsqztElA/exec",
  MUSIC_VOLUME: 0.6,
  // 19 Dec 2026, 11:00 AM Malaysia time (UTC+8)
  EVENT_START: "2026-12-19T11:00:00+08:00",
  // RSVP closes at the end of 5 Dec 2026, Malaysia time
  RSVP_DEADLINE: "2026-12-05T23:59:59+08:00",
};

(function () {
  "use strict";

  const body = document.body;
  const cover = document.getElementById("cover");
  const card = document.getElementById("card");
  const openBtn = document.getElementById("openBtn");
  const audio = document.getElementById("bgm");
  const musicBtn = document.getElementById("musicBtn");

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Always start at the top (the gate) when the link is opened
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  window.scrollTo(0, 0);

  /* ---------------- Music ---------------- */

  let wantsMusic = true; // the guest's choice via the toggle

  function setMusicUI(playing) {
    musicBtn.setAttribute("aria-pressed", String(playing));
    musicBtn.setAttribute("aria-label", playing ? "Hentikan muzik" : "Mainkan muzik");
  }

  function fadeInVolume() {
    audio.volume = 0;
    const target = CONFIG.MUSIC_VOLUME;
    const step = target / 25;
    const timer = setInterval(() => {
      audio.volume = Math.min(target, audio.volume + step);
      if (audio.volume >= target) clearInterval(timer);
    }, 80);
  }

  function playMusic() {
    const p = audio.play();
    if (p && typeof p.then === "function") {
      p.then(() => setMusicUI(true)).catch(() => setMusicUI(false));
    }
  }

  musicBtn.addEventListener("click", () => {
    if (audio.paused) {
      wantsMusic = true;
      playMusic();
    } else {
      wantsMusic = false;
      audio.pause();
      setMusicUI(false);
    }
  });

  audio.addEventListener("error", () => {
    console.warn("Muzik tidak dijumpai: letakkan fail di assets/music.mp3");
    setMusicUI(false);
  });

  // Pause when the guest switches app / tab; resume when they return
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (!audio.paused) audio.pause();
    } else if (wantsMusic && body.classList.contains("is-open")) {
      playMusic();
    }
  });

  /* ---------------- Gate opening ---------------- */

  function openCard() {
    if (body.classList.contains("is-open")) return;
    body.classList.add("is-open");
    openBtn.disabled = true;

    // Must start inside the tap handler, or browsers block it
    fadeInVolume();
    playMusic();

    cover.classList.add("is-opening");

    const doorsTime = reduceMotion ? 300 : 1900;
    setTimeout(() => {
      cover.classList.add("is-gone");
      body.classList.remove("is-locked");
      card.removeAttribute("aria-hidden");
      musicBtn.hidden = false;
      startReveal();
      // Links like …/#rsvp jump to that section once the gate is open
      const target = location.hash && document.getElementById(location.hash.slice(1));
      if (target) setTimeout(() => target.scrollIntoView({ behavior: "smooth", block: "start" }), 400);
    }, doorsTime);

    setTimeout(() => { cover.hidden = true; }, doorsTime + 1500);
  }

  openBtn.addEventListener("click", openCard);

  /* ---------------- Countdown ---------------- */

  (function countdown() {
    const box = document.getElementById("countdown");
    const done = document.getElementById("countdownDone");
    if (!box) return;
    const target = new Date(CONFIG.EVENT_START).getTime();
    const els = {};
    box.querySelectorAll("[data-unit]").forEach((el) => { els[el.dataset.unit] = el; });
    const pad = (n) => String(n).padStart(2, "0");
    let timer;

    function tick() {
      const diff = target - Date.now();
      if (diff <= 0) {
        clearInterval(timer);
        box.hidden = true;
        done.hidden = false;
        return;
      }
      const s = Math.floor(diff / 1000);
      els.days.textContent = Math.floor(s / 86400);
      els.hours.textContent = pad(Math.floor((s % 86400) / 3600));
      els.minutes.textContent = pad(Math.floor((s % 3600) / 60));
      els.seconds.textContent = pad(s % 60);
    }

    tick();
    timer = setInterval(tick, 1000);
  })();

  /* ---------------- Talking to Google Sheet ---------------- */

  function fetchWithTimeout(url, options, ms) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms || 20000);
    return fetch(url, Object.assign({}, options, { signal: ctrl.signal }))
      .finally(() => clearTimeout(t));
  }

  /* ---------------- Ucapan wall ---------------- */

  const wall = document.getElementById("wishWall");
  const paxStat = document.getElementById("paxStat");

  const dateFmt = new Intl.DateTimeFormat("ms-MY", {
    day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kuala_Lumpur",
  });

  function wishEl(w, isNew) {
    const fig = document.createElement("figure");
    fig.className = "wish" + (isNew ? " is-new" : "");
    const text = document.createElement("blockquote");
    text.className = "wish-text";
    text.textContent = w.ucapan; // textContent = safe, no HTML injection
    const meta = document.createElement("figcaption");
    meta.className = "wish-meta";
    const name = document.createElement("span");
    name.className = "wish-name";
    name.textContent = "— " + w.nama;
    meta.appendChild(name);
    const d = new Date(w.timestamp);
    if (!isNaN(d)) {
      const date = document.createElement("span");
      date.className = "wish-date";
      date.textContent = dateFmt.format(d);
      meta.appendChild(date);
    }
    fig.append(text, meta);
    return fig;
  }

  function setWallStatus(msg) {
    wall.innerHTML = "";
    const p = document.createElement("p");
    p.className = "wish-status";
    p.textContent = msg;
    wall.appendChild(p);
    wall.classList.add("is-short");
  }

  function renderWishes(list) {
    if (!list.length) {
      setWallStatus("Belum ada ucapan. Jadilah yang pertama mendoakan pengantin!");
      return;
    }
    wall.innerHTML = "";
    list.forEach((w) => wall.appendChild(wishEl(w, false)));
    wall.classList.toggle("is-short", list.length < 3);
  }

  function loadWishes() {
    if (!CONFIG.APPS_SCRIPT_URL) {
      setWallStatus("Ucapan akan dipaparkan di sini.");
      return Promise.resolve();
    }
    return fetchWithTimeout(CONFIG.APPS_SCRIPT_URL + "?t=" + Date.now(), { method: "GET" })
      .then((r) => r.json())
      .then((data) => {
        if (!data || !data.ok) throw new Error("bad response");
        renderWishes(data.wishes || []);
        if (data.hadirPax > 0) {
          paxStat.innerHTML = "";
          const strong = document.createElement("strong");
          strong.textContent = data.hadirPax;
          paxStat.append(strong, " tetamu telah mengesahkan kehadiran");
          paxStat.hidden = false;
        }
      })
      .catch(() => setWallStatus("Ucapan tidak dapat dimuatkan buat masa ini. Sila cuba sebentar lagi."));
  }

  /* ---------------- RSVP form ---------------- */

  const form = document.getElementById("rsvpForm");
  const paxField = document.getElementById("paxField");
  const errorBox = document.getElementById("rsvpError");
  const submitBtn = document.getElementById("rsvpSubmit");
  const submitLabel = submitBtn.querySelector(".btn-label");
  const thanks = document.getElementById("rsvpThanks");
  const closed = document.getElementById("rsvpClosed");
  const wishInput = form.elements.ucapan;
  const wishCount = document.getElementById("wishCount");

  function rsvpIsClosed() {
    return Date.now() > new Date(CONFIG.RSVP_DEADLINE).getTime();
  }

  function showError(msg, field) {
    errorBox.textContent = msg;
    errorBox.hidden = false;
    form.querySelectorAll(".is-invalid").forEach((el) => el.classList.remove("is-invalid"));
    if (field) {
      field.classList.add("is-invalid");
      const input = field.querySelector("input, select, textarea");
      if (input) input.focus({ preventScroll: true });
      field.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  function clearError() {
    errorBox.hidden = true;
    form.querySelectorAll(".is-invalid").forEach((el) => el.classList.remove("is-invalid"));
  }

  function setLoading(on) {
    submitBtn.disabled = on;
    submitBtn.classList.toggle("is-loading", on);
    submitLabel.textContent = on ? "Menghantar…" : "Hantar RSVP";
  }

  function closeRsvp() {
    form.hidden = true;
    thanks.hidden = true;
    closed.hidden = false;
  }

  form.addEventListener("change", (e) => {
    if (e.target.name === "kehadiran") {
      paxField.hidden = e.target.value !== "Hadir";
      clearError();
    }
  });

  wishInput.addEventListener("input", () => {
    wishCount.textContent = wishInput.value.length;
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (rsvpIsClosed()) { closeRsvp(); return; }

    const nama = form.elements.nama.value.trim();
    const kehadiranEl = form.querySelector('input[name="kehadiran"]:checked');
    const ucapan = wishInput.value.trim();

    if (nama.length < 2) {
      showError("Sila masukkan nama anda.", form.elements.nama.closest(".field"));
      return;
    }
    if (!kehadiranEl) {
      showError("Sila pilih sama ada anda Hadir atau Tidak Hadir.", form.querySelector("fieldset.field"));
      return;
    }
    if (!CONFIG.APPS_SCRIPT_URL) {
      showError("RSVP belum disambungkan ke Google Sheet. (Pemilik kad: masukkan APPS_SCRIPT_URL dalam script.js)");
      return;
    }
    clearError();

    const kehadiran = kehadiranEl.value;
    const payload = new URLSearchParams({
      nama: nama,
      kehadiran: kehadiran,
      bilangan: kehadiran === "Hadir" ? form.elements.bilangan.value : "0",
      ucapan: ucapan,
      website: form.elements.website.value, // honeypot
    });

    setLoading(true);
    // URL-encoded body = "simple" request, so no CORS preflight to Apps Script
    fetchWithTimeout(CONFIG.APPS_SCRIPT_URL, { method: "POST", body: payload })
      .then((r) => r.json())
      .then((data) => {
        if (data && data.ok) {
          form.reset();
          wishCount.textContent = "0";
          paxField.hidden = true;
          form.hidden = true;
          thanks.hidden = false;
          thanks.scrollIntoView({ behavior: "smooth", block: "center" });
          if (ucapan) {
            // show the guest's own wish straight away, then refresh from the sheet
            if (wall.querySelector(".wish-status")) wall.innerHTML = "";
            wall.prepend(wishEl({ nama: nama, ucapan: ucapan, timestamp: new Date().toISOString() }, true));
          }
          setTimeout(loadWishes, 1500);
        } else if (data && data.error === "closed") {
          closeRsvp();
        } else {
          showError("Maaf, maklumat tidak lengkap. Sila semak dan cuba lagi.");
        }
      })
      .catch(() => {
        showError("Maaf, RSVP tidak dapat dihantar. Sila semak sambungan internet anda dan cuba lagi.");
      })
      .finally(() => setLoading(false));
  });

  document.getElementById("rsvpAgain").addEventListener("click", () => {
    thanks.hidden = true;
    form.hidden = false;
    form.elements.nama.focus({ preventScroll: true });
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  if (rsvpIsClosed()) closeRsvp();
  loadWishes();

  /* ---------------- Scroll reveal ---------------- */

  function startReveal() {
    const items = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) {
      items.forEach((el) => el.classList.add("is-visible"));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });
    items.forEach((el, i) => {
      el.style.transitionDelay = el.closest(".hero") ? `${0.15 * i}s` : "";
      io.observe(el);
    });
  }
})();
