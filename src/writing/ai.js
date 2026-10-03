// Optional correction by Claude (key entered in the management zone; it stays on this device).
import Anthropic from "@anthropic-ai/sdk";

const CRITERION = { type: "number", description: "Note sur 5 (demi-points possibles)" };

/** JSON schema of the correction (structured outputs). */
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["scores", "total", "cefr", "errors", "corrected_text", "strengths_fr", "improvements_fr", "comment_fr"],
  properties: {
    scores: {
      type: "object",
      additionalProperties: false,
      required: ["content", "communicative", "organisation", "language"],
      properties: { content: CRITERION, communicative: CRITERION, organisation: CRITERION, language: CRITERION },
    },
    total: { type: "number", description: "Note sur 20 = somme des 4 critères" },
    cefr: { type: "string", enum: ["A1", "A2", "B1", "B2", "C1", "C2"] },
    errors: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["quote", "correction", "explanation_fr", "category"],
        properties: {
          quote: { type: "string", description: "Extrait EXACT du texte de l'élève contenant l'erreur (copié caractère pour caractère)" },
          correction: { type: "string" },
          explanation_fr: { type: "string" },
          category: { type: "string", enum: ["grammar", "vocab", "spelling", "mechanics", "style"] },
        },
      },
    },
    corrected_text: { type: "string" },
    strengths_fr: { type: "array", items: { type: "string" } },
    improvements_fr: { type: "array", items: { type: "string" } },
    comment_fr: { type: "string", description: "Un commentaire bienveillant et un brin humoristique de Chikh Fayçal, le prof d'anglais de l'application" },
  },
};

const SYSTEM = `Tu es un examinateur d'anglais expérimenté (Cambridge English, CECR) qui corrige les rédactions d'apprenants francophones de tous âges.
Tu notes chaque texte sur 20 avec quatre critères notés sur 5 : contenu et respect de la consigne (content), efficacité du message et registre (communicative), organisation et cohésion (organisation), langue : grammaire, vocabulaire, orthographe (language).
Tu notes par rapport au niveau visé indiqué : un texte simple mais juste à un niveau A2 peut avoir une excellente note.
Tu relèves chaque erreur avec un extrait exact du texte, sa correction et une explication courte en français. Le texte corrigé garde les idées et le style de l'élève, en ne corrigeant que ce qui est faux ou maladroit.
Tes explications et tes commentaires sont en français, clairs, encourageants, adaptés à l'âge de l'élève. L'anglais suit l'usage canadien (colour, centre, -ize), mais les orthographes britannique et américaine sont acceptées.`;

/** Turns SDK errors into a French message for the learner. */
function frenchError(e) {
  if (e instanceof Anthropic.AuthenticationError) return "La clé API est refusée : vérifie-la dans la zone gestion.";
  if (e instanceof Anthropic.PermissionDeniedError) return "Cette clé API n'a pas accès à ce modèle.";
  if (e instanceof Anthropic.RateLimitError) return "Trop de demandes pour le moment : réessaie dans une minute.";
  if (e instanceof Anthropic.BadRequestError) return `Demande refusée par l'API : ${e.message}`;
  if (e instanceof Anthropic.APIConnectionError) return "Impossible de joindre l'IA : vérifie ta connexion internet.";
  if (e instanceof Anthropic.APIError) return `Erreur du service IA (${e.status ?? "?"}). Réessaie plus tard.`;
  return e?.message || "La correction IA a échoué.";
}

/**
 * aiCorrect({ apiKey, model, text, prompt, age }) → { scores, total, cefr, errors, corrected_text, strengths_fr,
 *   improvements_fr, comment_fr, model }
 * Throws an Error with a French message on failure.
 */
export async function aiCorrect({ apiKey, model = "claude-opus-5-5", text, prompt = {}, age = "ado" }) {
  if (!apiKey) throw new Error("Aucune clé API : ajoute-la dans la zone gestion.");
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true, timeout: 120_000 });
  const level = prompt.cefr || prompt.band || "B1";
  const user = [
    `Niveau visé : ${level} (ligne ${prompt.level ?? "?"} sur 12 de l'application).`,
    `Âge de l'élève : ${{ enfant: "enfant (moins de 13 ans)", ado: "adolescent", adulte: "adulte" }[age] || "adolescent"}.`,
    `Type de texte : ${prompt.type || "texte libre"}. Longueur demandée : ${prompt.words ? `${prompt.words[0]} à ${prompt.words[1]} mots` : "libre"}.`,
    `Consigne : ${prompt.prompt || "Sujet libre."}`,
    prompt.texts?.length ? `Textes à résumer et à évaluer :\n${prompt.texts.map((t, i) => `Texte ${i + 1} : ${t}`).join("\n")}` : "",
    "",
    "Texte de l'élève :",
    "<<<",
    text,
    ">>>",
  ].filter(Boolean).join("\n");

  // Server-side fallback on a safety decline (Opus 5.5 / Sonnet 5.5); effort is set explicitly.
  const smart = /^claude-(opus|sonnet)-5-5$/.test(model);
  const params = {
    model,
    max_tokens: 16000,
    system: SYSTEM,
    messages: [{ role: "user", content: user }],
    output_config: { format: { type: "json_schema", schema: SCHEMA }, ...(smart ? { effort: "medium" } : {}) },
    ...(smart ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" } : {}),
  };
  let response;
  try {
    response = smart ? await client.beta.messages.create(params) : await client.messages.create(params);
  } catch (e) {
    throw new Error(frenchError(e));
  }
  if (response.stop_reason === "refusal") throw new Error("L'IA a refusé de corriger ce texte. Le correcteur intégré reste disponible.");
  if (response.stop_reason === "max_tokens") throw new Error("La correction IA a été coupée (texte trop long). Essaie avec un texte plus court.");
  const block = response.content.find((b) => b.type === "text");
  let data;
  try {
    data = JSON.parse(block?.text || "");
  } catch {
    throw new Error("Réponse de l'IA illisible. Réessaie.");
  }
  const crit = data.scores || {};
  const sum = ["content", "communicative", "organisation", "language"].reduce((s, k) => s + (Number(crit[k]) || 0), 0);
  return { ...data, total: Math.round(Math.min(20, Math.max(0, Number(data.total) || sum)) * 2) / 2, model: response.model };
}
