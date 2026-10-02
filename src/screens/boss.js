// Boss fight at the end of each line: a cartoon monster drawn on canvas, hearts, HP bar.
import { h, icon, sleep, countUp, reducedMotion } from "../ui.js";
import { levelById } from "../content.js";
import { diff, recordBoss, checkBadges, bossReady, levelUnlocked } from "../store.js";
import { go } from "../router.js";
import { runQuiz, scoreOf } from "../runner.js";
import { bossExam } from "../questions.js";
import { sfx } from "../audio.js";
import { burst, confetti, flash, shake, stamp, floatText } from "../fx.js";
import { reviewList } from "./test.js";

const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#4B3FCF";

/** Creates an animated monster on a canvas. Returns controls. */
export function createMonster(canvas, L) {
  const g = canvas.getContext("2d");
  const color = cssVar(`--l${L}`);
  const ink = cssVar("--ink");
  const seed = (L * 9301 + 49297) % 233280;
  const rnd = (k) => ((Math.sin(seed + k * 12.9898) * 43758.5453) % 1 + 1) % 1;
  const eyes = 1 + (L % 3); // 1 to 3 eyes
  const horns = L % 4; // 0 none, 1 antennas, 2 horns, 3 crown
  const spikes = 5 + Math.floor(rnd(1) * 4);
  const st = { hurt: 0, attack: 0, dead: 0, blinkAt: 2, mood: "idle", x: 0 };
  let raf = 0;
  let dpr = 1;
  const size = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, r.width * dpr);
    canvas.height = Math.max(1, r.height * dpr);
  };
  size();
  const ro = new ResizeObserver(size);
  ro.observe(canvas);
  const t0 = performance.now();
  const calm = reducedMotion();

  const draw = (now) => {
    const t = (now - t0) / 1000;
    const W = canvas.width;
    const H = canvas.height;
    g.clearRect(0, 0, W, H);
    const R = Math.min(W, H * 1.2) * 0.27;
    let cx = W / 2 + st.x * dpr;
    let cy = H * 0.58 + (calm ? 0 : Math.sin(t * 2) * R * 0.04);
    let scale = 1;
    if (st.attack > 0) {
      const k = Math.sin(Math.min(1, st.attack) * Math.PI);
      scale = 1 + k * 0.22;
      cy += k * R * 0.25;
    }
    if (st.hurt > 0) cx += Math.sin(t * 90) * R * 0.06 * st.hurt;
    if (st.dead > 0) {
      scale = Math.max(0, 1 - st.dead);
      cy -= st.dead * R * 0.4;
    }
    // Shadow
    g.fillStyle = "rgba(15,27,51,0.16)";
    g.beginPath();
    g.ellipse(W / 2, H * 0.58 + R * 1.02, R * 0.85 * scale, R * 0.16 * scale, 0, 0, Math.PI * 2);
    g.fill();
    g.save();
    g.translate(cx, cy);
    g.scale(scale, scale);
    if (st.dead > 0) g.rotate(st.dead * 2.5);
    // Horns / antennas / crown (behind the body)
    g.fillStyle = color;
    g.strokeStyle = ink;
    g.lineWidth = R * 0.05;
    g.lineJoin = "round";
    if (horns === 1) {
      for (const s of [-1, 1]) {
        g.beginPath();
        g.moveTo(s * R * 0.3, -R * 0.8);
        g.quadraticCurveTo(s * R * 0.5, -R * 1.35, s * R * 0.62 + Math.sin(t * 3 + s) * R * 0.05, -R * 1.42);
        g.stroke();
        g.beginPath();
        g.arc(s * R * 0.62 + Math.sin(t * 3 + s) * R * 0.05, -R * 1.42, R * 0.11, 0, Math.PI * 2);
        g.fillStyle = cssVar("--amber");
        g.fill();
        g.stroke();
      }
    } else if (horns === 2) {
      for (const s of [-1, 1]) {
        g.beginPath();
        g.moveTo(s * R * 0.25, -R * 0.8);
        g.quadraticCurveTo(s * R * 0.75, -R * 1.05, s * R * 0.7, -R * 1.4);
        g.quadraticCurveTo(s * R * 0.5, -R * 1.0, s * R * 0.55, -R * 0.7);
        g.closePath();
        g.fillStyle = "#FFF6E0";
        g.fill();
        g.stroke();
      }
    } else if (horns === 3) {
      g.beginPath();
      g.moveTo(-R * 0.45, -R * 0.82);
      for (let i = 0; i <= 4; i++) {
        const x = -R * 0.45 + (i * R * 0.9) / 4;
        g.lineTo(x, i % 2 ? -R * 1.05 : -R * 1.3);
      }
      g.lineTo(R * 0.45, -R * 0.82);
      g.closePath();
      g.fillStyle = cssVar("--amber");
      g.fill();
      g.stroke();
    }
    // Body: a wobbling blob
    const N = 28;
    const pts = [];
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      let r = R * (1 + (calm ? 0 : 0.045 * Math.sin(t * 2.3 + i * 0.9) + 0.025 * Math.sin(t * 3.7 + i * 2.1)));
      // Small soft spikes on the back
      if (Math.sin(a) < -0.2 && i % Math.max(2, Math.round(N / spikes)) === 0) r *= 1.12;
      pts.push([Math.cos(a) * r * 1.08, Math.sin(a) * r * 0.95]);
    }
    g.beginPath();
    for (let i = 0; i < N; i++) {
      const p0 = pts[(i - 1 + N) % N];
      const p1 = pts[i];
      const p2 = pts[(i + 1) % N];
      const p3 = pts[(i + 2) % N];
      if (i === 0) g.moveTo(p1[0], p1[1]);
      g.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
    }
    g.closePath();
    g.fillStyle = color;
    g.fill();
    g.lineWidth = R * 0.06;
    g.strokeStyle = ink;
    g.stroke();
    // Belly and shine
    g.fillStyle = "rgba(255,255,255,0.22)";
    g.beginPath();
    g.ellipse(0, R * 0.38, R * 0.55, R * 0.4, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "rgba(255,255,255,0.35)";
    g.beginPath();
    g.ellipse(-R * 0.48, -R * 0.45, R * 0.16, R * 0.09, -0.6, 0, Math.PI * 2);
    g.fill();
    // Hurt flash
    if (st.hurt > 0.5) {
      g.globalCompositeOperation = "source-atop";
      g.fillStyle = `rgba(255,255,255,${(st.hurt - 0.5) * 1.4})`;
      g.fillRect(-R * 2, -R * 2, R * 4, R * 4);
      g.globalCompositeOperation = "source-over";
    }
    // Eyes
    const blink = (t % 3.4) > 3.25 && st.mood !== "dead";
    const ex = eyes === 1 ? [0] : eyes === 2 ? [-R * 0.33, R * 0.33] : [-R * 0.42, 0, R * 0.42];
    const er = eyes === 1 ? R * 0.3 : eyes === 2 ? R * 0.22 : R * 0.17;
    ex.forEach((x, k) => {
      const y = -R * 0.18 - (eyes === 3 && k === 1 ? R * 0.12 : 0);
      g.fillStyle = "#fff";
      g.strokeStyle = ink;
      g.lineWidth = R * 0.04;
      if (st.mood === "dead") {
        g.beginPath();
        g.moveTo(x - er * 0.6, y - er * 0.6);
        g.lineTo(x + er * 0.6, y + er * 0.6);
        g.moveTo(x + er * 0.6, y - er * 0.6);
        g.lineTo(x - er * 0.6, y + er * 0.6);
        g.stroke();
        return;
      }
      g.beginPath();
      g.ellipse(x, y, er, blink ? er * 0.12 : er, 0, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      if (!blink) {
        const look = st.mood === "hurt" ? 0 : Math.sin(t * 0.8) * er * 0.25;
        g.fillStyle = ink;
        g.beginPath();
        g.arc(x + look, y + er * 0.25, er * 0.48, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = "#fff";
        g.beginPath();
        g.arc(x + look - er * 0.15, y + er * 0.08, er * 0.14, 0, Math.PI * 2);
        g.fill();
      }
      // Eyebrows when attacking: playful, not scary
      if (st.mood === "attack") {
        g.strokeStyle = ink;
        g.lineWidth = R * 0.05;
        g.beginPath();
        g.moveTo(x - er, y - er * 1.3);
        g.lineTo(x + er * 0.8, y - er * 0.95);
        g.stroke();
      }
    });
    // Cheeks
    g.fillStyle = "rgba(255,120,150,0.45)";
    for (const s of [-1, 1]) {
      g.beginPath();
      g.ellipse(s * R * 0.62, R * 0.12, R * 0.12, R * 0.07, 0, 0, Math.PI * 2);
      g.fill();
    }
    // Mouth
    g.strokeStyle = ink;
    g.fillStyle = ink;
    g.lineWidth = R * 0.05;
    const my = R * 0.28;
    if (st.mood === "hurt" || st.mood === "dead") {
      g.beginPath();
      g.ellipse(0, my, R * 0.12, R * 0.15, 0, 0, Math.PI * 2);
      g.fill();
    } else if (st.mood === "attack" || st.mood === "laugh") {
      g.beginPath();
      g.moveTo(-R * 0.35, my - R * 0.05);
      g.quadraticCurveTo(0, my + R * 0.45, R * 0.35, my - R * 0.05);
      g.closePath();
      g.fill();
      g.fillStyle = "#fff";
      g.fillRect(-R * 0.18, my - R * 0.04, R * 0.12, R * 0.1);
      g.fillRect(R * 0.06, my - R * 0.04, R * 0.12, R * 0.1);
    } else {
      g.beginPath();
      g.arc(0, my - R * 0.08, R * 0.22, 0.15 * Math.PI, 0.85 * Math.PI);
      g.stroke();
      // A little tooth for character
      g.fillStyle = "#fff";
      g.beginPath();
      g.moveTo(R * 0.06, my + R * 0.1);
      g.lineTo(R * 0.14, my + R * 0.09);
      g.lineTo(R * 0.1, my + R * 0.19);
      g.closePath();
      g.fill();
    }
    g.restore();
    st.hurt = Math.max(0, st.hurt - 0.035);
    if (st.attack > 0) st.attack = st.attack >= 1 ? 0 : st.attack + 0.045;
    if (st.dead > 0 && st.dead < 1) st.dead = Math.min(1, st.dead + 0.02);
    if (st.hurt === 0 && st.attack === 0 && (st.mood === "hurt" || st.mood === "attack")) st.mood = "idle";
    raf = requestAnimationFrame(draw);
  };
  raf = requestAnimationFrame(draw);
  return {
    hurt() {
      st.hurt = 1;
      st.mood = "hurt";
    },
    attack() {
      st.attack = 0.01;
      st.mood = "attack";
    },
    laugh() {
      st.mood = "laugh";
    },
    die() {
      st.mood = "dead";
      st.dead = 0.01;
    },
    center() {
      const r = canvas.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height * 0.55 };
    },
    stop() {
      cancelAnimationFrame(raf);
      ro.disconnect();
    },
  };
}

export function bossScreen(view, { level }) {
  const L = Number(level);
  const lvl = levelById(L);
  if (!lvl || !levelUnlocked(L)) return go("map");
  const d = diff();
  const style = { "--line": `var(--l${L})`, "--line-ink": `var(--l${L}-ink)` };
  const canvas = h("canvas", { class: "boss-canvas big", "aria-label": `Le boss ${lvl.boss.name}` });
  const taunt = h("p", { class: "boss-taunt" });
  const ready = bossReady(L);
  const start = h("button", { type: "button", class: "btn btn-primary btn-xl" }, "Combattre");
  view.append(
    h(
      "div",
      { class: "boss-intro", style },
      h("div", { class: "topbar" }, h("button", { type: "button", class: "icon-btn", "aria-label": "Retour au réseau", html: icon("back"), onClick: () => go("map") }), h("span", { class: "bullet sm" }, L), h("span", { class: "topbar-title" }, `Terminus de la ligne ${L}`)),
      h("p", { class: "eyebrow" }, "Boss de la ligne"),
      h("h1", { class: "boss-name-xl" }, lvl.boss.name),
      canvas,
      taunt,
      h(
        "ul",
        { class: "test-rules boss-rules" },
        h("li", null, h("span", { html: icon("heart") }), `Tu as ${d.hearts} cœurs. Chaque erreur en coûte un.`),
        h("li", null, h("span", { html: icon("bolt") }), "Chaque bonne réponse frappe le boss."),
        h("li", null, h("span", { html: icon("book") }), `Questions sur toute la ligne ${L}${L > 1 ? ", plus des révisions des lignes d'avant" : ""}.`),
        h("li", null, h("span", { html: icon("refresh") }), "Perdu ? Tu révises tes erreurs et tu reviens. Il n'y a aucune limite d'essais."),
      ),
      !ready ? h("p", { class: "boss-warn" }, "Défi direct : tu n'as pas fini les stations de cette ligne. Si tu gagnes, toute la ligne est validée.") : null,
      start,
    ),
  );
  const monster = createMonster(canvas, L);
  // Typewriter taunt
  let k = 0;
  const text = lvl.boss.taunt;
  const typer = setInterval(() => {
    k++;
    taunt.textContent = text.slice(0, k);
    if (k >= text.length) clearInterval(typer);
  }, reducedMotion() ? 0 : 28);
  let fightCleanup = null;
  start.addEventListener("click", () => {
    clearInterval(typer);
    monster.stop();
    fightCleanup = fight(view, L, lvl);
  });
  start.focus();
  return () => {
    clearInterval(typer);
    monster.stop();
    fightCleanup?.();
  };
}

function fight(view, L, lvl) {
  const d = diff();
  const questions = bossExam(L);
  const maxHearts = d.hearts;
  let hearts = maxHearts;
  const total = questions.length;
  let hp = total;
  const canvas = h("canvas", { class: "boss-canvas" });
  const hpFill = h("div", { class: "hp-fill" });
  const heartsEl = h("div", { class: "hearts", "aria-label": `${hearts} cœurs` });
  const renderHearts = (broken = -1) => {
    heartsEl.innerHTML = Array.from({ length: maxHearts }, (_, i) => `<span class="heart ${i < hearts ? "on" : "lost"} ${i === broken ? "break" : ""}">${icon("heart")}</span>`).join("");
    heartsEl.setAttribute("aria-label", `${hearts} cœurs`);
  };
  renderHearts();
  const arena = h("div", { class: "arena", style: { "--line": `var(--l${L})` } }, h("div", { class: "arena-head" }, h("span", { class: "arena-name" }, lvl.boss.name), h("div", { class: "hp", role: "progressbar", "aria-label": "Vie du boss" }, hpFill)), canvas, heartsEl);
  let monster = null;
  const quiz = runQuiz(view, questions, {
    title: `Boss · ligne ${L}`,
    accent: `var(--l${L})`,
    aside: arena,
    onAnswered: async ({ ok }, q, i, { mount }) => {
      if (ok) {
        // A star flies from the question to the boss.
        const from = mount.getBoundingClientRect();
        const to = monster.center();
        const star = h("div", { class: "projectile", html: icon("star") });
        document.body.append(star);
        const anim = star.animate(
          [
            { transform: `translate(${from.left + from.width / 2}px, ${from.top + 20}px) scale(.6) rotate(0deg)` },
            { transform: `translate(${to.x}px, ${to.y}px) scale(1.3) rotate(540deg)` },
          ],
          { duration: reducedMotion() ? 1 : 420, easing: "cubic-bezier(.3,.7,.4,1)" },
        );
        await anim.finished.catch(() => {});
        star.remove();
        hp = Math.max(0, hp - 1);
        hpFill.style.transform = `scaleX(${hp / total})`;
        monster.hurt();
        sfx.hit();
        burst(to.x, to.y, { color: [cssVar(`--l${L}`), "#FFC23D", "#ffffff"], count: 20, speed: 9 });
        floatText("-1", { x: to.x + 30, y: to.y - 40 }, { color: "var(--stop)", size: 1.6 });
      } else {
        monster.attack();
        await sleep(300);
        hearts--;
        renderHearts(hearts);
        sfx.hurt();
        flash("hurt");
        shake(view.querySelector(".quiz"), true);
        if (hearts <= 0) {
          monster.laugh();
          return { stop: true };
        }
      }
      return {};
    },
    onDone: (results, { quit }) => {
      if (quit) {
        monster?.stop();
        return go("map");
      }
      finish(results);
    },
  });
  monster = createMonster(canvas, L);

  async function finish(results) {
    const won = hearts > 0 && results.length === total;
    const score = scoreOf(results);
    if (won) {
      // Final blow for the remaining HP.
      hpFill.style.transform = "scaleX(0)";
      monster.hurt();
      sfx.hit();
      await sleep(250);
      monster.die();
      const c = monster.center();
      burst(c.x, c.y, { color: [cssVar(`--l${L}`), "#FFC23D", "#ffffff", "#12805C"], count: 60, speed: 14, size: 7 });
      sfx.win();
      await sleep(900);
    } else {
      sfx.lose();
      await sleep(900);
    }
    monster.stop();
    const res = recordBoss(L, { won, score, hearts: Math.max(0, hearts), maxHearts });
    const badges = checkBadges();
    const nextLvl = levelById(L + 1);
    const xp = h("span", null, "0");
    const wrongRefs = results.filter((r) => !r.ok).map((r) => r.q.ref);
    view.replaceChildren(
      h(
        "div",
        { class: `results boss-results ${won ? "won" : "lost"}`, style: { "--line": `var(--l${L})`, "--line-ink": `var(--l${L}-ink)` } },
        h("p", { class: "eyebrow" }, `Terminus de la ligne ${L}`),
        h("h1", { class: "results-title" }, won ? "Victoire !" : "Le boss a gagné… cette fois."),
        h("p", { class: "boss-quote" }, h("strong", null, `${lvl.boss.name} : `), won ? lvl.boss.defeat : "Ha ! Révise tes erreurs et reviens me voir. Je t'attends !"),
        h("p", { class: "results-line" }, `${results.filter((r) => r.ok).length} bonnes réponses sur ${results.length}${won ? "" : ` (le combat s'arrête après ${maxHearts} erreurs)`}.`, won && res.flawless ? " Sans perdre un seul cœur !" : ""),
        h("div", { class: "xp-gain" }, h("span", { html: icon("bolt") }), "+", xp, " XP"),
        badges.length ? h("div", { class: "new-badges" }, badges.map((b) => h("div", { class: "badge-pop" }, h("span", { html: icon("trophy") }), h("strong", null, b.name), h("small", null, b.desc)))) : null,
        h(
          "div",
          { class: "result-actions" },
          won && nextLvl ? h("button", { type: "button", class: "btn btn-primary btn-xl", onClick: () => go("map") }, `Ouvrir la ligne ${L + 1} : ${nextLvl.title}`) : null,
          won && !nextLvl ? h("button", { type: "button", class: "btn btn-primary btn-xl", onClick: () => go("profile") }, "Voir mon parcours") : null,
          !won && wrongRefs.length ? h("button", { type: "button", class: "btn btn-primary btn-xl", onClick: () => go("review", { refs: wrongRefs }) }, "Réviser ces erreurs maintenant") : null,
          h("button", { type: "button", class: "btn btn-ghost", onClick: () => go("boss", { level: L }) }, won ? "Rejouer le combat" : "Réessayer"),
          h("button", { type: "button", class: "btn btn-ghost", onClick: () => go("map") }, "Réseau"),
        ),
        reviewList(results),
      ),
    );
    countUp(xp, res.xp, 800);
    if (won) {
      confetti({ count: 200 });
      await sleep(400);
      if (res.firstWin) await stamp(nextLvl ? `Ligne ${L + 1} ouverte` : "Bilingue !", { sub: nextLvl ? nextLvl.title : "Mission accomplie", color: `var(--l${Math.min(12, L + 1)})`, ms: 1800 });
      if (res.firstWin) sfx.level();
    }
  }

  return () => {
    quiz.stop();
    monster?.stop();
  };
}
