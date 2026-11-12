/**
 * Kad Kahwin Digital · Ameera & Khairy · 19.12.2026
 * RSVP + Ucapan backend (Google Apps Script, bound to a Google Sheet)
 *
 * Sheet columns (tab "RSVP"):
 *   A Timestamp | B Nama | C Kehadiran | D Bilangan | E Ucapan | F Sembunyi
 *
 * Column F "Sembunyi" is for you: type anything (e.g. x) in it to hide
 * that ucapan from the wall on the card. The RSVP still counts.
 */

const SHEET_NAME = 'RSVP';
const HEADERS = ['Timestamp', 'Nama', 'Kehadiran', 'Bilangan', 'Ucapan', 'Sembunyi'];

const MAX_NAME = 60;      // characters
const MAX_WISH = 500;     // characters
const MAX_PAX = 5;        // guests per RSVP
const MAX_WISHES_SHOWN = 300;
// RSVP closes at the end of 5 Dec 2026, Malaysia time
const DEADLINE = new Date('2026-12-05T23:59:59+08:00');

/* ---------------- POST: save one RSVP ---------------- */

function doPost(e) {
  const p = (e && e.parameter) || {};

  // Honeypot: real guests never fill this hidden field. Pretend success to bots.
  if (p.website) return json_({ ok: true });

  if (new Date() > DEADLINE) return json_({ ok: false, error: 'closed' });

  const nama = clean_(p.nama, MAX_NAME, false);
  const kehadiran = p.kehadiran === 'Hadir' || p.kehadiran === 'Tidak Hadir' ? p.kehadiran : '';
  const ucapan = clean_(p.ucapan, MAX_WISH, true);

  if (nama.length < 2 || !kehadiran) return json_({ ok: false, error: 'invalid' });

  let bilangan = 0;
  if (kehadiran === 'Hadir') {
    bilangan = parseInt(p.bilangan, 10);
    if (!(bilangan >= 1 && bilangan <= MAX_PAX)) return json_({ ok: false, error: 'invalid' });
  }

  // Block accidental double-taps: same name + same answer within 30 seconds
  const cache = CacheService.getScriptCache();
  const dupKey = 'rsvp:' + (nama + '|' + kehadiran + '|' + bilangan).toLowerCase();
  if (cache.get(dupKey)) return json_({ ok: true, duplicate: true });

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    getSheet_().appendRow([new Date(), nama, kehadiran, bilangan, ucapan, '']);
  } catch (err) {
    return json_({ ok: false, error: 'busy' });
  } finally {
    lock.releaseLock();
  }

  cache.put(dupKey, '1', 30);
  return json_({ ok: true });
}

/* ---------------- GET: wishes for the wall + total pax ---------------- */

function doGet() {
  const rows = getSheet_().getDataRange().getValues().slice(1); // skip header
  let hadirPax = 0;
  let hadirCount = 0;
  const wishes = [];

  rows.forEach(function (r) {
    const ts = r[0], nama = r[1], kehadiran = r[2], bilangan = r[3], ucapan = r[4], hide = r[5];
    if (kehadiran === 'Hadir') {
      hadirCount++;
      hadirPax += Number(bilangan) || 0;
    }
    if (ucapan && !hide) {
      wishes.push({
        nama: String(nama),
        ucapan: String(ucapan),
        timestamp: ts instanceof Date ? ts.toISOString() : String(ts),
      });
    }
  });

  wishes.reverse(); // newest first
  return json_({
    ok: true,
    hadirPax: hadirPax,
    hadirCount: hadirCount,
    wishes: wishes.slice(0, MAX_WISHES_SHOWN),
  });
}

/* ---------------- Helpers ---------------- */

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  }
  return sheet;
}

/** Trim, limit length, and stop text being treated as a spreadsheet formula. */
function clean_(value, maxLen, keepNewlines) {
  let s = String(value == null ? '' : value);
  s = keepNewlines
    ? s.replace(/\r\n?/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n')
    : s.replace(/\s+/g, ' ');
  s = s.trim().slice(0, maxLen).trim();
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/** Run this once from the editor to create the RSVP tab with headers. */
function setup() {
  getSheet_();
}
