// Sentence and grammar mini-games: builder, error hunt, dictation, grammar gauntlet.
import { h, icon, shuffle, sample, sleep } from "../ui.js";
import { sentenceRefs, grammarRefs } from "../content.js";
import { makeQuestion, renderQuestion, feedbackDetails } from "../questions.js";
import { diffWords } from "../answer.js";
import { recordAnswer } from "../store.js";
import { speak, sfx } from "../audio.js";
import { burstAt, shake } from "../fx.js";
import { runQuiz } from "../runner.js";

/** Plays a list of questions one by one inside the stage, with a short feedback in between. */
function sequence(api, questions, { points, line, onResult }) {
  const { stage } = api;
  let i = -1;
  let current = null;
  let t0 = 0;
  const bar = h("div", { class: "seq-bar" }, questions.map(() => h("span", { class: "seg" })));
  const mount = h("div", { class: "q-mount" });
  const after = h("div", { class: "seq-after" });
  stage.append(bar, mount, after);
  let good = 0;
  const next = () => {
    current?.destroy();
    after.replaceChildren();
    i++;
    if (i >= questions.length) {
      api.end({ line: line(good, questions.length) });
      return;
    }
    [...bar.children].forEach((s, k) => s.classList.toggle("now", k === i));
    const q = questions[i];
    t0 = performance.now();
    mount.classList.remove("enter");
    void mount.offsetWidth;
    mount.classList.add("enter");
    current = renderQuestion(q, mount, {
      replays: 3,
      onAnswer: ({ ok, given }) => {
        const ms = performance.now() - t0;
        recordAnswer(q.ref, ok, ms);
        bar.children[i].classList.add(ok ? "ok" : "ko");
        const extra = onResult?.(q, ok, given) || 0;
        if (ok) {
          good++;
          sfx.correct();
          api.addScore(points(q, ms) + extra, mount.querySelector(".q-card"));
          burstAt(mount.querySelector(".q-card"), { color: ["#2E9E3F", "#4FCB60", "#FFC23D"], count: 14 });
        } else {
          if (extra) api.addScore(extra);
          sfx.wrong();
          shake(mount.querySelector(".q-card"));
        }
        const cont = h("button", { type: "button", class: `btn ${ok ? "btn-go" : "btn-primary"}` }, i + 1 < questions.length ? "Suivant" : "Terminer");
        after.replaceChildren(h("div", { class: `seq-fb ${ok ? "ok" : "ko"}` }, ok ? h("strong", null, "Bravo !") : feedbackDetails(q, given), cont));
        const onKey = (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            document.removeEventListener("keydown", onKey);
            next();
          }
        };
        cont.addEventListener("click", () => {
          document.removeEventListener("keydown", onKey);
          next();
        });
        setTimeout(() => {
          document.addEventListener("keydown", onKey);
          cont.focus({ preventScroll: true });
        }, 250);
      },
    });
  };
  next();
  return () => current?.destroy();
}

export function builder(api) {
  const refs = sample(sentenceRefs(api.unit), 6);
  const qs = refs.map((r) => makeQuestion("build", r));
  return sequence(api, qs, {
    points: (q, ms) => 60 + Math.max(0, 60 - Math.round(ms / 500)),
    line: (g, n) => `${g} phrases parfaites sur ${n}.`,
  });
}

export function dictationGame(api) {
  const refs = sample(sentenceRefs(api.unit), 5);
  const qs = refs.map((r) => makeQuestion("dictation", r));
  return sequence(api, qs, {
    points: () => 100,
    // Partial credit: each correct word is worth points even when the sentence is not perfect.
    onResult: (q, ok, given) => {
      if (ok) return 0;
      const d = diffWords(given || "", q.expected);
      return Math.round((70 * d.filter((x) => x.ok).length) / Math.max(1, d.length));
    },
    line: (g, n) => `${g} phrases parfaites sur ${n}.`,
  });
}

export function hunt(api) {
  const { stage, unit } = api;
  const refs = sample(grammarRefs(unit, "error"), 8);
  let i = -1;
  let lives = 3;
  let t0 = 0;
  let locked = false;
  const missed = [];
  api.setLives(lives, 3);
  const counter = h("div", { class: "hunt-count" });
  const words = h("div", { class: "error-words hunt-words" });
  const note = h("div", { class: "hunt-note" });
  stage.append(counter, h("p", { class: "g-hint" }, "Touche le mot qui est faux."), words, note);
  const next = () => {
    i++;
    if (i >= refs.length || lives <= 0) {
      api.end({ line: lives > 0 ? `${refs.length - missed.length} fautes trouvées sur ${refs.length}.` : "Plus de vies !", review: missed });
      return;
    }
    locked = false;
    const q = makeQuestion("error", refs[i]);
    counter.textContent = `Phrase ${i + 1} / ${refs.length}`;
    note.replaceChildren();
    words.replaceChildren(
      ...q.tokens.map((t, k) => {
        const b = h("button", { type: "button", class: "word-chip", style: { "--i": k } }, t);
        b.addEventListener("click", () => {
          if (locked) return;
          locked = true;
          const ms = performance.now() - t0;
          const ok = k === q.wrong;
          recordAnswer(q.ref, ok, ms);
          const right = words.children[q.wrong];
          const punct = (q.tokens[q.wrong].match(/[.,!?;:]+$/) || [""])[0];
          if (ok) {
            sfx.correct();
            burstAt(b, { color: ["#E1251B", "#FFC23D"], count: 16 });
            api.addScore(50 + Math.max(0, 50 - Math.round(ms / 100)), b);
          } else {
            sfx.wrong();
            shake(b);
            b.classList.add("wrong");
            lives--;
            api.setLives(lives, 3);
            missed.push({ en: q.tokens.join(" "), fr: `faute : « ${q.tokens[q.wrong]} »` });
          }
          right.classList.add("fixed");
          right.innerHTML = `<s>${q.tokens[q.wrong]}</s> <ins>${q.accept[0]}${punct}</ins>`;
          note.replaceChildren(h("p", null, q.explain || ""));
          setTimeout(next, ok ? 1500 : 2300);
        });
        return b;
      }),
    );
    t0 = performance.now();
  };
  next();
}

export function gauntlet(api) {
  const { stage, unit } = api;
  const refs = sample(grammarRefs(unit), 10);
  const qs = refs.map((r) => makeQuestion(unit.grammar[Number(r.split(":g")[1])].type, r));
  const quiz = runQuiz(stage, qs, {
    title: "Défi grammaire",
    onAnswered: ({ ok, ms, combo }) => {
      if (ok) api.addScore(80 + Math.min(60, combo * 10) + Math.max(0, 30 - Math.round(ms / 1000)));
    },
    onDone: (results, { quit }) => {
      const good = results.filter((r) => r.ok).length;
      api.end({ line: quit ? "Défi interrompu." : `${good} bonnes réponses sur ${qs.length}.` });
    },
  });
  return () => quiz.stop();
}

export { icon, shuffle, sleep, speak };
