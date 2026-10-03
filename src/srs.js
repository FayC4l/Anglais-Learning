// Spaced repetition (Leitner, 5 boxes): a card answered right moves up a box and comes back later;
// a card answered wrong goes back to box 1 and comes back tomorrow. Pure.

export const INTERVALS = [0, 1, 2, 4, 8, 16]; // days before the next review, by box (1-5)

/** Day number of a date (local calendar day). */
export function dayNumber(date = new Date()) {
  return Math.floor((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())) / 86400000);
}

/** Adds new cards (box 1, due today). Existing cards are left untouched. Returns how many were added. */
export function addCards(srs, ids, today = dayNumber()) {
  let n = 0;
  for (const id of ids) {
    if (!id || srs[id]) continue;
    srs[id] = { box: 1, due: today };
    n++;
  }
  return n;
}

/** Records a review. */
export function answerCard(srs, id, ok, today = dayNumber()) {
  const c = srs[id] || { box: 1, due: today };
  if (ok) {
    c.box = Math.min(5, c.box + 1);
    c.due = today + INTERVALS[c.box];
  } else {
    c.box = 1;
    c.due = today + 1;
  }
  srs[id] = c;
  return c;
}

/** Cards due today (or late), the most overdue and lowest boxes first. */
export function dueCards(srs, today = dayNumber(), limit = Infinity) {
  return Object.entries(srs)
    .filter(([, c]) => c.due <= today)
    .sort((a, b) => a[1].due - b[1].due || a[1].box - b[1].box)
    .slice(0, limit)
    .map(([id]) => id);
}

/** Cards per box (index 1-5), for the progress display. */
export function boxCounts(srs) {
  const out = [0, 0, 0, 0, 0, 0];
  for (const c of Object.values(srs)) out[c.box]++;
  return out;
}
