// Vocabulary mini-games: memory, word rain, true/false flash, sound bubbles, spelling.
import { h, icon, shuffle, sample, pick, clamp } from "../ui.js";
import { matches, clean } from "../answer.js";
import { speak, sfx } from "../audio.js";
import { burst, burstAt, shake, floatText } from "../fx.js";

// ---------- Paires express (memory) ----------

export function memory(api) {
  const { stage, unit } = api;
  const pool = unit.vocab.filter((v) => v.en.length <= 22 && v.fr.length <= 30);
  const items = sample(pool.length >= 6 ? pool : unit.vocab, 6);
  const cards = shuffle(items.flatMap((v, i) => [{ pair: i, text: v.en, en: true }, { pair: i, text: v.fr, en: false }]));
  const grid = h("div", { class: "mem-grid" });
  let open = [];
  let lock = false;
  let found = 0;
  let moves = 0;
  const t0 = performance.now();
  const timer = setInterval(() => api.setTime((performance.now() - t0) / 1000), 250);
  cards.forEach((c, i) => {
    const el = h("button", { type: "button", class: `mem-card ${c.en ? "en" : "fr"}`, "aria-label": `Carte ${i + 1}`, style: { "--i": i } }, h("span", { class: "mem-inner" }, h("span", { class: "mem-back", html: icon("sparkle") }), h("span", { class: "mem-front" }, c.text)));
    el.addEventListener("click", () => {
      if (lock || el.classList.contains("flipped") || api.ended) return;
      el.classList.add("flipped");
      el.setAttribute("aria-label", c.text);
      sfx.flip();
      if (c.en) speak(c.text);
      open.push({ el, c });
      if (open.length < 2) return;
      moves++;
      const [a, b] = open;
      open = [];
      if (a.c.pair === b.c.pair) {
        found++;
        setTimeout(() => {
          a.el.classList.add("matched");
          b.el.classList.add("matched");
          sfx.correct();
          burstAt(b.el, { color: ["#12805C", "#3DD49B", "#FFC23D"], count: 16 });
          api.addScore(50, b.el);
          if (found === items.length) {
            clearInterval(timer);
            const s = Math.round((performance.now() - t0) / 1000);
            const bonus = Math.max(0, 300 - s * 4 - Math.max(0, moves - 6) * 10);
            api.addScore(bonus);
            setTimeout(() => api.end({ line: `${moves} essais en ${s} secondes.` }), 700);
          }
        }, 250);
      } else {
        lock = true;
        setTimeout(() => {
          sfx.wrong();
          a.el.classList.add("nope");
          b.el.classList.add("nope");
        }, 350);
        setTimeout(() => {
          a.el.classList.remove("flipped", "nope");
          b.el.classList.remove("flipped", "nope");
          lock = false;
        }, 950);
      }
    });
    grid.append(el);
  });
  stage.append(h("p", { class: "g-hint" }, "Les cartes bleues sont en anglais, les cartes claires en français."), grid);
  return () => clearInterval(timer);
}

// ---------- Pluie de mots (word rain) ----------

export function rain(api) {
  const { stage, unit } = api;
  const sky = h("div", { class: "rain-sky" }, h("div", { class: "rain-ground" }));
  const input = h("input", { class: "answer-input rain-input", type: "text", placeholder: "Tape le mot anglais…", autocomplete: "off", autocapitalize: "off", autocorrect: "off", spellcheck: "false", "aria-label": "Mot anglais", id: "rain-input" });
  stage.append(sky, input);
  let lives = 3;
  api.setLives(lives, 3);
  let drops = [];
  let last = performance.now();
  let spawnIn = 600;
  let elapsed = 0;
  let raf = 0;
  let combo = 0;
  const missed = [];
  const bag = [];
  const nextItem = () => {
    if (!bag.length) bag.push(...shuffle(unit.vocab));
    return bag.pop();
  };
  const spawn = () => {
    const v = nextItem();
    const el = h("div", { class: "drop-word" }, v.fr);
    sky.append(el);
    const w = sky.clientWidth;
    const elW = Math.min(el.offsetWidth, w - 16);
    const x = 8 + Math.random() * Math.max(0, w - elW - 16);
    drops.push({ v, el, x, y: -40, speed: 34 + Math.min(70, elapsed * 0.9) + Math.random() * 10 });
  };
  const frame = (t) => {
    if (api.ended) return;
    const dt = Math.min(64, t - last) / 1000;
    last = t;
    elapsed += dt;
    spawnIn -= dt * 1000;
    if (spawnIn <= 0) {
      spawn();
      spawnIn = Math.max(1100, 2700 - elapsed * 22);
    }
    const ground = sky.clientHeight - 34;
    for (const d of drops) {
      d.y += d.speed * dt;
      d.el.style.transform = `translate(${d.x}px, ${d.y}px)`;
      if (d.y >= ground && !d.dead) {
        d.dead = true;
        lives--;
        combo = 0;
        missed.push(d.v);
        api.setLives(lives, 3);
        sfx.hurt();
        shake(sky);
        d.el.classList.add("splash");
        d.el.textContent = d.v.en;
        setTimeout(() => d.el.remove(), 900);
        if (lives <= 0) {
          api.end({ line: `Tu as tenu ${Math.round(elapsed)} secondes.`, review: uniq(missed) });
          return;
        }
      }
    }
    drops = drops.filter((d) => !d.dead);
    raf = requestAnimationFrame(frame);
  };
  input.addEventListener("input", () => {
    const val = input.value;
    if (!val.trim()) return;
    const hit = drops.find((d) => matches(val, [d.v.en, ...(d.v.alt || [])]));
    if (!hit) return;
    hit.dead = true;
    combo++;
    const r = hit.el.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 2, { color: ["#00958F", "#2CC9C0", "#FFC23D"], count: 18 });
    sfx.pop();
    if (combo > 0 && combo % 5 === 0) sfx.combo(combo / 5);
    api.addScore(10 + Math.min(20, combo * 2) + Math.round(hit.speed / 10), hit.el);
    hit.el.remove();
    drops = drops.filter((d) => d !== hit);
    input.value = "";
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      // Enter with a wrong word clears it, with a small penalty to discourage guessing.
      if (input.value.trim()) {
        shake(input);
        input.value = "";
        combo = 0;
      }
    }
  });
  setTimeout(() => input.focus(), 50);
  raf = requestAnimationFrame((t) => {
    last = t;
    frame(t);
  });
  return () => cancelAnimationFrame(raf);
}

function uniq(list) {
  const seen = new Set();
  return list.filter((v) => (seen.has(v.en) ? false : seen.add(v.en)));
}

// ---------- Éclair (true/false) ----------

export function flash(api) {
  const { stage, unit } = api;
  let timeLeft = 45;
  let streak = 0;
  let best = 0;
  let good = 0;
  let current = null;
  const wrongs = [];
  const card = h("div", { class: "flash-card" });
  const yes = h("button", { type: "button", class: "btn btn-go flash-btn" }, h("span", { html: icon("check") }), "Vrai");
  const no = h("button", { type: "button", class: "btn btn-stop flash-btn" }, h("span", { html: icon("close") }), "Faux");
  const mult = h("div", { class: "flash-mult" });
  stage.append(mult, h("div", { class: "flash-deck" }, card), h("div", { class: "flash-actions" }, no, yes));
  const next = () => {
    const v = pick(unit.vocab);
    const truth = Math.random() < 0.5;
    const other = pick(unit.vocab.filter((x) => x !== v && clean(x.fr) !== clean(v.fr)));
    current = { v, truth, shown: truth ? v.fr : other.fr };
    card.classList.remove("out-left", "out-right");
    card.replaceChildren(h("span", { class: "flash-en" }, v.en), h("span", { class: "flash-eq" }, "="), h("span", { class: "flash-fr" }, current.shown));
    card.classList.remove("in");
    void card.offsetWidth;
    card.classList.add("in");
  };
  const answer = (said) => {
    if (api.ended || !current) return;
    const ok = said === current.truth;
    if (ok) {
      streak++;
      good++;
      best = Math.max(best, streak);
      const m = 1 + Math.floor(streak / 5);
      api.addScore(10 * m);
      sfx.correct();
      if (streak % 5 === 0) {
        sfx.combo(m);
        floatText(`×${m}`, mult, { color: "var(--amber)", size: 2 });
      }
    } else {
      streak = 0;
      timeLeft -= 3;
      sfx.wrong();
      shake(card);
      wrongs.push(current.v);
    }
    mult.textContent = streak >= 5 ? `Série ${streak} · points ×${1 + Math.floor(streak / 5)}` : streak ? `Série ${streak}` : "";
    card.classList.add(said ? "out-right" : "out-left");
    current = null;
    setTimeout(next, 180);
  };
  yes.addEventListener("click", () => answer(true));
  no.addEventListener("click", () => answer(false));
  const onKey = (e) => {
    if (e.key === "ArrowRight" || e.key.toLowerCase() === "v") answer(true);
    if (e.key === "ArrowLeft" || e.key.toLowerCase() === "f") answer(false);
  };
  document.addEventListener("keydown", onKey);
  const t0 = performance.now();
  let lastT = t0;
  const timer = setInterval(() => {
    const now = performance.now();
    timeLeft -= (now - lastT) / 1000;
    lastT = now;
    api.setTime(timeLeft);
    if (timeLeft <= 0) {
      clearInterval(timer);
      api.end({ line: `${good} bonnes réponses, meilleure série : ${best}.`, review: uniq(wrongs) });
    }
  }, 100);
  next();
  return () => {
    clearInterval(timer);
    document.removeEventListener("keydown", onKey);
  };
}

// ---------- Bulles sonores (listening) ----------

export function bubbles(api) {
  const { stage, unit } = api;
  const ROUNDS = 10;
  let round = 0;
  let lives = 3;
  let raf = 0;
  const missed = [];
  api.setLives(lives, 3);
  const pond = h("div", { class: "pond" });
  const replay = h("button", { type: "button", class: "audio-big small", "aria-label": "Réécouter", html: icon("speaker") });
  const label = h("div", { class: "pond-label" });
  stage.append(h("div", { class: "pond-top" }, replay, label), pond);
  let target = null;
  let live = [];
  let t0 = 0;
  replay.addEventListener("click", () => target && speak(target.en));

  const startRound = () => {
    if (api.ended) return;
    if (round >= ROUNDS || lives <= 0) {
      api.end({ line: lives > 0 ? "Toutes les bulles ont été jouées." : "Plus de vies !", review: uniq(missed) });
      return;
    }
    round++;
    label.textContent = `Bulle ${round} / ${ROUNDS}`;
    pond.replaceChildren();
    target = pick(unit.vocab);
    const others = sample(unit.vocab.filter((v) => v !== target && clean(v.fr) !== clean(target.fr)), 3);
    const opts = shuffle([target, ...others]);
    const w = pond.clientWidth;
    const lane = w / opts.length;
    live = opts.map((v, i) => {
      const el = h("button", { type: "button", class: "bubble-btn" }, v.fr);
      pond.append(el);
      const size = el.offsetWidth;
      const b = { v, el, x: lane * i + lane / 2 - size / 2, y: pond.clientHeight + 20 + Math.random() * 60, speed: 38 + round * 3 + Math.random() * 14, phase: Math.random() * 6, done: false };
      el.addEventListener("click", () => tap(b));
      return b;
    });
    t0 = performance.now();
    setTimeout(() => speak(target.en), 200);
  };

  const tap = (b) => {
    if (b.done || api.ended) return;
    if (b.v === target) {
      const r = b.el.getBoundingClientRect();
      burst(r.left + r.width / 2, r.top + r.height / 2, { color: ["#DB2E7A", "#FF5FA2", "#FFC23D"], count: 22 });
      sfx.pop();
      const speedBonus = Math.max(0, 50 - Math.round((performance.now() - t0) / 120));
      api.addScore(50 + speedBonus, b.el);
      live.forEach((x) => {
        x.done = true;
        x.el.classList.add(x === b ? "popped" : "fade");
      });
      setTimeout(startRound, 600);
    } else {
      b.done = true;
      b.el.classList.add("bad");
      sfx.wrong();
      lives--;
      api.setLives(lives, 3);
      if (lives <= 0) {
        missed.push(target);
        live.forEach((x) => (x.done = true));
        setTimeout(startRound, 700);
      }
    }
  };

  let last = performance.now();
  const frame = (t) => {
    if (api.ended) return;
    const dt = Math.min(64, t - last) / 1000;
    last = t;
    let escaped = false;
    for (const b of live) {
      if (b.done && !b.el.classList.contains("bad")) continue;
      b.y -= b.speed * dt;
      b.phase += dt * 2;
      b.el.style.transform = `translate(${b.x + Math.sin(b.phase) * 10}px, ${b.y}px)`;
      if (b.v === target && !b.done && b.y < -b.el.offsetHeight) escaped = true;
    }
    if (escaped) {
      live.forEach((x) => (x.done = true));
      missed.push(target);
      lives--;
      api.setLives(lives, 3);
      sfx.hurt();
      floatText(target.en, pond, { color: "var(--stop)", size: 1.3 });
      setTimeout(startRound, 900);
    }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  setTimeout(startRound, 100);
  return () => cancelAnimationFrame(raf);
}

// ---------- Épelle-le (spelling) ----------

export function spell(api) {
  const { stage, unit } = api;
  const words = sample(
    unit.vocab.filter((v) => /^[a-z' -]+$/i.test(v.en) && v.en.replace(/[^a-z]/gi, "").length >= 3 && v.en.length <= 14),
    6,
  );
  let wi = -1;
  let pos = 0;
  let errorsHere = 0;
  let current = null;
  const missed = [];
  const fr = h("div", { class: "spell-fr" });
  const slots = h("div", { class: "spell-slots" });
  const bulbs = h("div", { class: "spell-bulbs", "aria-label": "Fautes" });
  const listen = h("button", { type: "button", class: "icon-btn", "aria-label": "Écouter le mot", html: icon("speaker") });
  const kb = h("div", { class: "kb" });
  const progress = h("div", { class: "spell-progress" });
  stage.append(progress, h("div", { class: "spell-card" }, fr, listen, slots, bulbs), kb);
  listen.addEventListener("click", () => current && speak(current.en));
  ["qwertyuiop", "asdfghjkl", "zxcvbnm"].forEach((row) => {
    const r = h("div", { class: "kb-row" });
    for (const ch of row) r.append(h("button", { type: "button", class: "kb-key", "data-k": ch, onClick: () => press(ch) }, ch));
    kb.append(r);
  });
  const chars = () => [...current.en];
  const letterAt = (i) => chars()[i];
  const skipFixed = () => {
    while (pos < chars().length && !/[a-z]/i.test(letterAt(pos))) {
      slots.children[pos].classList.add("filled");
      pos++;
    }
  };
  const nextWord = () => {
    wi++;
    if (wi >= words.length) {
      api.end({ line: missed.length ? `${words.length - missed.length} mots parfaits sur ${words.length}.` : "Tous les mots sans aide !", review: missed });
      return;
    }
    current = words[wi];
    pos = 0;
    errorsHere = 0;
    progress.textContent = `Mot ${wi + 1} / ${words.length}`;
    fr.textContent = current.fr;
    slots.replaceChildren(...chars().map((c) => h("span", { class: `slot ${/[a-z]/i.test(c) ? "" : "fixed"}` }, /[a-z]/i.test(c) ? "" : c === " " ? " " : c)));
    bulbs.replaceChildren(...[0, 1, 2].map(() => h("span", { class: "bulb on" })));
    skipFixed();
  };
  const press = (ch) => {
    if (api.ended || !current || pos >= chars().length) return;
    const want = letterAt(pos);
    const key = kb.querySelector(`[data-k="${ch}"]`);
    if (ch.toLowerCase() === want.toLowerCase()) {
      sfx.type();
      const slot = slots.children[pos];
      slot.textContent = want;
      slot.classList.add("filled", "pop");
      key?.classList.add("good");
      setTimeout(() => key?.classList.remove("good"), 160);
      pos++;
      errorsHere = 0;
      bulbs.querySelectorAll(".bulb").forEach((b) => b.classList.add("on"));
      skipFixed();
      if (pos >= chars().length) {
        const clean = slots.querySelectorAll(".revealed").length === 0;
        api.addScore(clean ? 60 : 25, slots);
        if (!clean) missed.push(current);
        sfx.correct();
        burstAt(slots, { color: ["#4B3FCF", "#8679FF", "#FFC23D"], count: 18 });
        speak(current.en);
        slots.classList.add("win");
        setTimeout(() => {
          slots.classList.remove("win");
          nextWord();
        }, 900);
      }
    } else {
      sfx.wrong();
      key?.classList.add("bad");
      setTimeout(() => key?.classList.remove("bad"), 250);
      shake(slots);
      errorsHere++;
      api.addScore(-5);
      const lit = bulbs.querySelectorAll(".bulb.on");
      lit[lit.length - 1]?.classList.remove("on");
      if (errorsHere >= 3) {
        const slot = slots.children[pos];
        slot.textContent = want;
        slot.classList.add("filled", "revealed");
        pos++;
        errorsHere = 0;
        bulbs.querySelectorAll(".bulb").forEach((b) => b.classList.add("on"));
        skipFixed();
        if (pos >= chars().length) {
          missed.push(current);
          speak(current.en);
          setTimeout(nextWord, 900);
        }
      }
    }
  };
  const onKey = (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (/^[a-z]$/i.test(e.key)) press(e.key);
  };
  document.addEventListener("keydown", onKey);
  nextWord();
  return () => document.removeEventListener("keydown", onKey);
}

export { clamp };
