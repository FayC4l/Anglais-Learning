// Adaptive placement test: blocks of questions per CEFR band, moving up or down (pure, no DOM).

export const BANDS = ["A1", "A2", "B1", "B2", "C1", "C2"];
export const BAND_LINE = { A1: 1, A2: 3, B1: 5, B2: 7, C1: 10, C2: 12 };

/**
 * createPlacement({ start, block, max }) → {
 *   band(): band of the next question, record(ok), done, result(): { band, line, asked, correct, perBand }
 * }
 * Rules: a block of `block` questions per band. ≥ 75 % → band passed, go up; ≤ 25 % → band failed, go down;
 * in between → one confirmation block (cumulative ≥ 60 % passes). Stops when a passed band sits right under
 * a failed one, at the bottom or at the top, or after `max` questions.
 */
export function createPlacement({ start = "A2", block = 4, max = 32 } = {}) {
  let idx = Math.max(0, BANDS.indexOf(start));
  const verdict = BANDS.map(() => null); // "pass" | "fail"
  const per = BANDS.map(() => ({ asked: 0, correct: 0 }));
  let cur = { asked: 0, correct: 0, rounds: 0 };
  let asked = 0;
  let correct = 0;
  let done = false;
  let final = null;

  const finish = (i) => {
    done = true;
    final = Math.max(0, Math.min(BANDS.length - 1, i));
  };
  const highestPassed = () => {
    let best = -1;
    verdict.forEach((v, i) => v === "pass" && (best = i));
    return Math.max(0, best);
  };

  function decide() {
    const rate = cur.correct / cur.asked;
    let v = null;
    if (cur.rounds === 1) {
      if (rate >= 0.75) v = "pass";
      else if (rate <= 0.25) v = "fail";
    } else v = rate >= 0.6 ? "pass" : "fail";
    if (!v) return; // ambiguous: one more block at this band
    verdict[idx] = v;
    cur = { asked: 0, correct: 0, rounds: 0 };
    if (v === "pass") {
      if (idx === BANDS.length - 1) return finish(idx);
      if (verdict[idx + 1] === "fail") return finish(idx);
      idx++;
    } else {
      if (idx === 0) return finish(0);
      if (verdict[idx - 1] === "pass") return finish(idx - 1);
      idx--;
    }
  }

  return {
    get done() {
      return done;
    },
    band: () => BANDS[idx],
    lineOf: (b) => BAND_LINE[b],
    record(ok) {
      if (done) return;
      asked++;
      per[idx].asked++;
      cur.asked++;
      if (ok) {
        correct++;
        per[idx].correct++;
        cur.correct++;
      }
      if (cur.asked % block === 0) {
        cur.rounds++;
        decide();
      }
      if (!done && asked >= max) finish(highestPassed());
    },
    result() {
      const i = final ?? highestPassed();
      return { band: BANDS[i], line: BAND_LINE[BANDS[i]], asked, correct, perBand: Object.fromEntries(BANDS.map((b, k) => [b, per[k]])) };
    },
  };
}
