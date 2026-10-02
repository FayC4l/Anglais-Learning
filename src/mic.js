// Optional speech recognition ("say it aloud" checks). Only shown where the browser offers it
// and the microphone is allowed (it is refused inside some embedded viewers).
import { clean } from "./answer.js";

const SR = typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null;
let blocked = !SR;

export async function micAvailable() {
  if (blocked) return false;
  try {
    const st = await navigator.permissions?.query({ name: "microphone" });
    if (st?.state === "denied") blocked = true;
  } catch {
    /* permissions API missing: try on first use */
  }
  return !blocked;
}

/** Listens once; resolves with the list of transcripts (best first). Rejects with a French message. */
export function listenOnce({ lang = "en-US", timeout = 7000 } = {}) {
  return new Promise((resolve, reject) => {
    if (blocked) return reject(new Error("Le micro n'est pas disponible ici."));
    const rec = new SR();
    rec.lang = lang;
    rec.interimResults = false;
    rec.maxAlternatives = 5;
    let done = false;
    const end = (fn) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      try {
        rec.stop();
      } catch {
        /* ignore */
      }
      fn();
    };
    const timer = setTimeout(() => end(() => reject(new Error("Je n'ai rien entendu. Rapproche-toi du micro et réessaie."))), timeout);
    rec.onresult = (e) => {
      const alts = [...(e.results?.[0] || [])].map((a) => a.transcript);
      end(() => resolve(alts));
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed" || e.error === "audio-capture") blocked = true;
      const msg = e.error === "no-speech" ? "Je n'ai rien entendu. Réessaie en parlant plus fort." : blocked ? "Le micro n'est pas disponible ici." : "La reconnaissance vocale a échoué. Réessaie.";
      end(() => reject(new Error(msg)));
    };
    rec.onend = () => end(() => reject(new Error("Je n'ai rien entendu. Réessaie.")));
    try {
      rec.start();
    } catch {
      end(() => reject(new Error("Le micro n'est pas disponible ici.")));
    }
  });
}

/** True when one of the transcripts matches the expected words. */
export function heardRight(alts, expected) {
  const want = clean(expected);
  return alts.some((a) => {
    const got = clean(a);
    return got === want || ` ${got} `.includes(` ${want} `);
  });
}

export const micBlocked = () => blocked;
