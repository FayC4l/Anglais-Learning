// Skills dashboard: radar of the 7 skills, estimated CEFR level, history, printable certificates.
import { h, icon, esc } from "../ui.js";
import { state } from "../store.js";
import { go } from "../router.js";
import { avatarEl } from "./who.js";
import { mentorFaceHtml } from "../humor.js";

export const SKILLS = [
  ["vocabulaire", "Vocabulaire"],
  ["grammaire", "Grammaire"],
  ["conjugaison", "Conjugaison"],
  ["ecoute", "Écoute"],
  ["lecture", "Lecture"],
  ["ecriture", "Écriture"],
  ["oral", "Oral"],
];
const BANDS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const LEVEL_BAND = (L) => (L <= 2 ? "A1" : L <= 4 ? "A2" : L <= 6 ? "B1" : L <= 9 ? "B2" : L <= 11 ? "C1" : "C2");

/** Score 0-100 of a skill (smoothed so 2 answers do not give 100 %), and the number of answers. */
export function skillScore(id) {
  if (id === "ecriture") {
    const w = state.writing.slice(-6);
    return w.length ? { score: Math.round((w.reduce((s, x) => s + x.score, 0) / w.length) * 5), n: w.length } : { score: 0, n: 0 };
  }
  const s = state.skills[id];
  if (!s?.n) return { score: 0, n: 0 };
  return { score: Math.round(((s.ok + 1) / (s.n + 2)) * 100), n: s.n };
}

/** Best CEFR band reached: levels beaten, placement test, C2 mock exam. */
export function cefrEstimate() {
  let best = -1;
  for (const [L, b] of Object.entries(state.bosses)) if (b.defeated) best = Math.max(best, BANDS.indexOf(LEVEL_BAND(Number(L))));
  if (state.placement) best = Math.max(best, BANDS.indexOf(state.placement.band) - 1);
  if (state.c2?.mock?.scale >= 200) best = 5;
  return best >= 0 ? BANDS[best] : "—";
}

function radar(values) {
  const n = values.length;
  const R = 110;
  const c = 150;
  const pt = (i, r) => {
    const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
    return [c + Math.cos(a) * r, c + Math.sin(a) * r];
  };
  const ring = (k) => values.map((_, i) => pt(i, (R * k) / 4).join(",")).join(" ");
  const shape = values.map((v, i) => pt(i, (R * Math.max(4, v.score)) / 100).join(",")).join(" ");
  const labels = values
    .map((v, i) => {
      const [x, y] = pt(i, R + 24);
      return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" class="rd-label">${esc(v.label)}</text><text x="${x}" y="${y + 14}" text-anchor="middle" class="rd-val">${v.n ? `${v.score} %` : "—"}</text>`;
    })
    .join("");
  return `<svg viewBox="0 0 300 300" class="radar" role="img" aria-label="Profil de compétences">${[1, 2, 3, 4].map((k) => `<polygon points="${ring(k)}" class="rd-ring"/>`).join("")}${values.map((_, i) => `<line x1="${c}" y1="${c}" x2="${pt(i, R)[0]}" y2="${pt(i, R)[1]}" class="rd-axis"/>`).join("")}<polygon points="${shape}" class="rd-shape"/>${labels}</svg>`;
}

export function dashboardScreen(view) {
  const values = SKILLS.map(([id, label]) => ({ id, label, ...skillScore(id) }));
  const band = cefrEstimate();
  const weakest = values.filter((v) => v.n >= 5).sort((a, b) => a.score - b.score)[0];
  const tests = Object.entries(state.units).filter(([, u]) => u.attempts).sort((a, b) => (b[1].best || 0) - (a[1].best || 0));
  const writing = state.writing.slice(-8).reverse();
  const reached = BANDS.slice(0, BANDS.indexOf(band) + 1);
  view.append(
    h(
      "div",
      { class: "dashboard" },
      h("div", { class: "topbar" }, h("button", { type: "button", class: "icon-btn", "aria-label": "Retour", html: icon("back"), onClick: () => go("profile") }), h("span", { class: "topbar-title" }, "Mes compétences")),
      h("header", { class: "profile-head" }, avatarEl(state.player.avatar, "xl"), h("div", null, h("h1", { class: "page-title" }, state.player.name), h("p", { class: "rank" }, `Niveau estimé : ${band}`))),
      h("div", { class: "radar-wrap", html: radar(values) }),
      weakest ? h("p", { class: "set-help" }, `Ton point faible du moment : `, h("strong", null, weakest.label), ` (${weakest.score} %). L'entraînement du jour et le carnet d'erreurs vont t'aider.`) : h("p", { class: "set-help" }, "Joue un peu : le graphique se remplit au fil de tes réponses."),
      h("h2", { class: "section-title" }, "Certificats"),
      reached.length
        ? h("div", { class: "certs" }, reached.map((b) => h("button", { type: "button", class: "cert-btn", onClick: () => printCertificate(b) }, h("span", { class: "band-badge sm", "data-band": b }, b), "Imprimer")))
        : h("p", { class: "set-help" }, "Bats ton premier boss (ou passe le test de placement) pour obtenir ton premier certificat."),
      h("h2", { class: "section-title" }, "Rédactions récentes"),
      writing.length
        ? h("ul", { class: "history" }, writing.map((w) => h("li", null, h("strong", null, `${w.score}/20`), ` · ${w.title || w.prompt || "Rédaction"} · `, h("small", null, new Date(w.at).toLocaleDateString("fr-CA")))))
        : h("p", { class: "set-help" }, "Pas encore de rédaction corrigée."),
      h("h2", { class: "section-title" }, "Meilleurs tests"),
      tests.length ? h("ul", { class: "history" }, tests.slice(0, 8).map(([uid, u]) => h("li", null, h("strong", null, `${Math.round((u.best || 0) * 100)} %`), ` · station ${uid} · ${u.attempts} essai${u.attempts > 1 ? "s" : ""}`))) : h("p", { class: "set-help" }, "Pas encore de test passé."),
    ),
  );
}

/** Opens a printable certificate in a new window (falls back to printing the page). */
export function printCertificate(band) {
  const names = { A1: "Découverte", A2: "Survie", B1: "Seuil", B2: "Avancé", C1: "Autonome", C2: "Maîtrise" };
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Certificat ${band}</title><style>
  body{font-family:Georgia,serif;margin:0;display:grid;place-items:center;min-height:100vh;background:#f4efe3;color:#1b1b1b}
  .c{width:min(90vw,820px);padding:48px;border:10px double #8a6b3e;background:#fffdf7;text-align:center}
  h1{font-size:2.4rem;margin:.2em 0;letter-spacing:.04em}.b{font-size:4rem;font-weight:700;color:#8a2b2b;margin:.1em 0}
  .n{font-size:2rem;margin:.4em 0;font-style:italic}.m{width:110px;height:110px;margin:0 auto}.m img,.m svg{width:100%;height:100%;object-fit:contain}
  .s{margin-top:28px;display:flex;justify-content:space-between;font-size:.95rem}@media print{body{background:#fff}}</style></head>
  <body><div class="c"><div class="m">${mentorFaceHtml("love")}</div><p>Mission Bilingue certifie que</p><p class="n">${esc(state.player.name)}</p>
  <p>a atteint en anglais le niveau</p><p class="b">${band}</p><h1>${names[band]}</h1>
  <p>du Cadre européen commun de référence pour les langues (CECR), selon ses résultats dans l'application.</p>
  <div class="s"><span>Le ${new Date().toLocaleDateString("fr-CA")}</span><span>Chikh Faycal, professeur et examinateur en chef</span></div>
  <p style="font-size:.75rem;color:#777;margin-top:24px">Certificat d'encouragement, sans valeur officielle. Pour un diplôme reconnu : Cambridge C2 Proficiency.</p></div>
  <script>setTimeout(()=>print(),400)<\/script></body></html>`;
  const w = window.open("", "_blank");
  if (w) {
    w.document.write(html);
    w.document.close();
  } else window.print();
}
