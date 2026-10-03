// Runs a sequence of questions: progress, countdown, feedback sheet, combo. Used by tests,
// boss fights, the mistakes notebook and the grammar mini-game.
import { h, icon, dialog, sleep } from "./ui.js";
import { renderQuestion, feedbackDetails, KIND_LABEL } from "./questions.js";
import { recordAnswer, save } from "./store.js";
import { sfx, speak } from "./audio.js";
import { floatText, shake, burstAt } from "./fx.js";
import { quip, mooseSays } from "./humor.js";

const ENCOURAGE_OK = ["Correct !", "Exact !", "Bien joué !", "Parfait !", "Yes!", "Nailed it!", "Bravo !"];
const ENCOURAGE_KO = ["Pas tout à fait…", "Presque !", "Pas encore…", "Bonne tentative !", "Regarde bien :"];

/**
 * @param {HTMLElement} root
 * @param {object[]} questions
 * @param {object} opts
 *  - title: label shown at the top
 *  - onAnswered(result, q, index, ui): may return {stop: true}; awaited before feedback
 *  - onDone(results, {quit}): called at the end
 *  - aside: optional element placed above the question (boss arena)
 *  - feedback: show the feedback sheet (default true)
 *  - accent: CSS colour for the progress bar
 */
export function runQuiz(root, questions, opts = {}) {
  const results = [];
  let index = -1;
  let current = null;
  let timerRaf = 0;
  let combo = 0;
  let stopped = false;
  let lastTick = -1;

  const segs = h("div", { class: "quiz-progress", style: { "--n": questions.length } }, questions.map(() => h("span", { class: "seg" })));
  const comboEl = h("div", { class: "combo", "aria-live": "polite" });
  const quitBtn = h("button", { type: "button", class: "icon-btn", "aria-label": "Quitter", html: icon("close") });
  const timerFill = h("div", { class: "timer-fill" });
  const timerText = h("span", { class: "timer-text" });
  const timer = h("div", { class: "timer" }, timerFill);
  const mount = h("div", { class: "q-mount" });
  const fb = h("div", { class: "feedback", hidden: true, role: "status", "aria-live": "assertive" });
  const counter = h("span", { class: "quiz-count" });
  const top = h("div", { class: "quiz-top" }, quitBtn, h("div", { class: "quiz-top-mid" }, h("div", { class: "quiz-meta" }, h("span", { class: "quiz-title" }, opts.title || ""), counter, timerText), segs), comboEl);
  const wrap = h("div", { class: "quiz", style: opts.accent ? { "--accent": opts.accent } : null }, top, timer, opts.aside || null, mount, fb);
  root.replaceChildren(wrap);

  quitBtn.addEventListener("click", async () => {
    const pausedAt = performance.now();
    cancelAnimationFrame(timerRaf);
    const v = await dialog({
      title: "Abandonner ?",
      body: "<p>Si tu quittes maintenant, ce test ne compte pas. Les erreurs déjà faites restent dans ton carnet.</p>",
      actions: [
        { label: "Continuer", value: false, primary: true },
        { label: "Quitter", value: true, danger: true },
      ],
    });
    if (v) {
      stop();
      opts.onDone?.(results, { quit: true });
    } else if (current && !current.answered && !stopped) {
      deadline += performance.now() - pausedAt;
      timerRaf = requestAnimationFrame(frame);
    }
  });

  let deadline = 0;
  let startedAt = 0;
  let timedQ = null;
  function frame() {
    if (stopped || !current || current.answered) return;
    const q = timedQ;
    const left = deadline - performance.now();
    const k = Math.max(0, left / (q.time * 1000));
    timerFill.style.transform = `scaleX(${k})`;
    timer.classList.toggle("low", left < 6000);
    const s = Math.ceil(left / 1000);
    timerText.textContent = `${Math.max(0, s)} s`;
    if (left < 5000 && s !== lastTick && s > 0) {
      lastTick = s;
      sfx.tick();
    }
    if (left <= 0) {
      current.timeout();
      return;
    }
    timerRaf = requestAnimationFrame(frame);
  }
  function runTimer(q) {
    cancelAnimationFrame(timerRaf);
    timedQ = q;
    startedAt = performance.now();
    deadline = startedAt + q.time * 1000;
    lastTick = -1;
    timerRaf = requestAnimationFrame(frame);
  }

  function stop() {
    stopped = true;
    cancelAnimationFrame(timerRaf);
    current?.destroy();
  }

  async function onAnswer(q, { ok, given }) {
    cancelAnimationFrame(timerRaf);
    const ms = performance.now() - startedAt;
    const timedOut = !ok && given === "";
    results.push({ q, ok, given, ms, timedOut });
    recordAnswer(q.ref, ok, ms, q.skill);
    save();
    const seg = segs.children[index];
    seg.classList.add(ok ? "ok" : "ko");
    if (ok) {
      combo++;
      sfx.correct();
      if (combo >= 3) {
        sfx.combo(combo);
        comboEl.textContent = `Combo ×${combo}`;
        comboEl.classList.remove("pop");
        void comboEl.offsetWidth;
        comboEl.classList.add("pop");
      }
      burstAt(mount.querySelector(".right, .btn-validate, .q-card"), { color: ["#12805C", "#3DD49B", "#FFC23D"], count: 14 });
    } else {
      combo = 0;
      comboEl.textContent = "";
      sfx.wrong();
      shake(mount.querySelector(".q-card"));
    }
    const extra = (await opts.onAnswered?.({ ok, given, ms, timedOut, combo }, q, index, { mount, wrap })) || {};
    if (stopped) return;
    if (opts.feedback === false) {
      await sleep(ok ? 450 : 900);
      return next(extra.stop);
    }
    showFeedback(q, ok, given, timedOut, extra.stop);
  }

  /** Maurice comments now and then: always on a long combo or a timeout, sometimes otherwise. */
  function mooseLine(ok, timedOut) {
    if (opts.moose === false) return null;
    if (timedOut) return mooseSays(quip("timeout"), "sm");
    if (ok && combo > 0 && combo % 5 === 0) return mooseSays(quip("streak"), "sm");
    if (Math.random() < 0.3) return mooseSays(quip(ok ? "correct" : "wrong"), "sm");
    return null;
  }

  function showFeedback(q, ok, given, timedOut, stopAfter) {
    const title = ok ? ENCOURAGE_OK[Math.floor(Math.random() * ENCOURAGE_OK.length)] : timedOut ? "Temps écoulé !" : ENCOURAGE_KO[Math.floor(Math.random() * ENCOURAGE_KO.length)];
    const hearBtn =
      q.expected && /[a-z]/i.test(q.expected) && q.kind !== "choose_fr" && q.kind !== "reading" && q.kind !== "listening"
        ? h("button", { type: "button", class: "icon-btn fb-hear", "aria-label": "Écouter la bonne réponse", html: icon("speaker"), onClick: () => speak(q.kind === "error" ? fixedSentence(q) : q.say || q.expected) })
        : null;
    const cont = h("button", { type: "button", class: `btn ${ok ? "btn-go" : "btn-stop"} btn-continue` }, stopAfter ? "Voir le résultat" : "Continuer");
    fb.className = `feedback ${ok ? "is-ok" : "is-ko"}`;
    fb.replaceChildren(
      h("div", { class: "fb-inner" }, h("div", { class: "fb-head" }, h("span", { class: "fb-icon", html: icon(ok ? "check" : "close") }), h("strong", { class: "fb-title" }, title), hearBtn), mooseLine(ok, timedOut), ok ? (q.explain && q.kind !== "choose_fr" ? h("p", { class: "fb-explain" }, q.explain) : null) : feedbackDetails(q, given), cont),
    );
    fb.hidden = false;
    let armed = false;
    setTimeout(() => (armed = true), 250);
    const go = () => {
      if (!armed) return;
      document.removeEventListener("keydown", onKey);
      fb.classList.add("leaving");
      setTimeout(() => {
        fb.hidden = true;
        fb.classList.remove("leaving");
        next(stopAfter);
      }, 160);
    };
    const onKey = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        go();
      }
    };
    cont.addEventListener("click", go);
    document.addEventListener("keydown", onKey);
    setTimeout(() => cont.focus({ preventScroll: true }), 80);
  }

  function next(forceEnd) {
    current?.destroy();
    index++;
    if (forceEnd || index >= questions.length) {
      stop();
      opts.onDone?.(results, { quit: false });
      return;
    }
    const q = questions[index];
    counter.textContent = `${index + 1} / ${questions.length}`;
    [...segs.children].forEach((s, i) => s.classList.toggle("now", i === index));
    mount.classList.remove("enter");
    void mount.offsetWidth;
    mount.classList.add("enter");
    current = renderQuestion(q, mount, { onAnswer: (r) => onAnswer(q, r) });
    mount.dataset.kind = KIND_LABEL[q.kind] || "";
    runTimer(q);
  }

  next();
  return { stop };
}

function fixedSentence(q) {
  const t = q.tokens.slice();
  const punct = (t[q.wrong].match(/[.,!?;:]+$/) || [""])[0];
  t[q.wrong] = q.accept[0] + punct;
  return t.join(" ");
}

/** Score summary for results. */
export function scoreOf(results) {
  if (!results.length) return 0;
  return results.filter((r) => r.ok).length / results.length;
}
