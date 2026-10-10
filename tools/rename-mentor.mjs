// One-off: turns Maurice the moose into Chikh Faycal, a human English teacher, in content/humor.json.
import { readFileSync, writeFileSync } from "node:fs";

const file = "content/humor.json";
const data = JSON.parse(readFileSync(file, "utf8"));
const NEW = {
  welcome: {
    0: "[[Hello]] ! J'ai ciré ma moustache pour l'occasion. Tu peux l'admirer, c'est gratuit aujourd'hui.",
    2: "Bienvenue ! Prends un siège, un thé à la menthe et un peu d'anglais. Dans cet ordre, si tu veux.",
    4: "Salut ! Chikh Faycal : prof d'anglais, élégant, modeste. Bon, deux sur trois, c'est déjà pas mal.",
    5: "[[Ready]] ? Moi, oui. Je suis né prêt. Avec un stylo rouge à la main, d'après ma mère.",
    6: "Bienvenue au cours le plus prestigieux du quartier. Le seul cours du quartier, mais prestigieux quand même.",
    8: "Te revoilà ! Mon cousin de Londres te dit [[hello]]. Avec un accent que même moi, je ne comprends pas.",
    9: "On commence ? J'ai révisé toute la nuit. Bon, j'ai surtout bu du café, mais devant un dictionnaire.",
    13: "[[Good morning]]… ou [[good evening]]. J'ai oublié ma montre, mais jamais mes verbes irréguliers.",
    14: "Un élève sauvage apparaît ! Chikh Faycal utilise… [[Welcome]] ! C'est super efficace.",
    16: "[[Nice to see you]] ! Ton cerveau est prêt ? Le mien est échauffé. Ma moustache aussi, par solidarité.",
    20: "Bonjour ! Les verbes irréguliers sont en place, le tableau est propre. Il ne manquait plus que toi.",
    23: "Nouvelle séance chargée ! Pas de pub, pas de microtransactions, juste un prof très classe.",
  },
  correct: {
    0: "[[Correct]] ! Ma moustache frémit. C'est très rare. Note la date.",
    1: "Bonne réponse ! Je ne suis pas ému. C'est la vapeur du thé à la menthe qui me pique les yeux.",
    4: "[[Spot on]] ! En plein dans le mille. Même mon cousin de Londres applaudit, et il n'applaudit jamais.",
    7: "Bonne réponse. Je garde mon air sérieux de prof. Mon stylo rouge, lui, danse en cachette.",
    9: "Correct ! Si l'anglais était un couscous, tu viens de trouver le pois chiche parfait.",
    12: "[[Correct]] ! Ton cerveau mérite une petite pause thé à la menthe.",
    14: "Bonne réponse ! Ne prends pas la grosse tête, par contre : ici, c'est moi qui ai la plus belle moustache.",
    17: "Exactement ! L'anglais t'a tendu un piège, et tu l'as enjambé comme un champion de saut de haies.",
    18: "Bonne réponse ! Je fais semblant d'être calme. À l'intérieur, je fais la danse de la craie.",
    19: "[[Correct]] ! Tu viens de gagner le respect de Chikh Faycal. Ça ne s'achète pas, et ça brille longtemps.",
    22: "Bonne réponse ! [[GG]], comme disent les jeunes. Je suis jeune. Dans ma tête. Et dans ma moustache.",
  },
  wrong: {
    0: "Faux, mais avec une confiance admirable. Chikh Faycal respecte ça.",
    7: "Faux ! Pas grave : chaque erreur muscle le cerveau. C'est scientifique. Presque.",
    9: "[[Not quite]]. L'anglais, c'est comme un thé trop chaud : parfois, ça brûle un peu. On souffle et on continue.",
    11: "Raté ! Mon cousin de Londres aurait fait pire : il aurait répondu avec l'accent cockney.",
    19: "Raté. Je soupire, mais c'est un soupir affectueux. Le soupir d'un prof qui croit en toi.",
    21: "[[Close]], mais pas assez. Comme moi quand je cours après le bus avec mon cartable plein de copies.",
  },
  streak: {
    0: "Série en cours ! Ça chauffe comme un thé à la menthe qui vient de bouillir.",
    1: "[[On fire]] ! Attention, ma moustache est peut-être inflammable. Ne vérifions pas.",
    4: "Quel combo ! Je n'avais rien vu de tel depuis que mon cousin de Londres a gagné un concours d'orthographe.",
    10: "Quelle série ! Je commence à soupçonner que tu es un prof d'anglais déguisé.",
    15: "Bravo ! Tu enchaînes les bonnes réponses comme moi les verres de thé : sans pause et avec classe.",
    17: "Encore une ! À ce rythme, tu finiras avant que j'aie fini de me vanter de ma moustache.",
    20: "Encore juste ! Je t'aurais bien offert un trophée, mais mon bureau est déjà couvert de copies.",
    21: "[[Combo]] ! Dans un jeu vidéo, tu aurais débloqué le costume de prof doré.",
  },
  timeout: {
    3: "Le sablier gagne cette manche. Mais il n'a pas de moustache, lui. Il ne gagnera pas la guerre.",
    6: "Oups, l'horloge a sonné. J'ai essayé de la retenir avec ma règle. Elle m'a filé entre les doigts.",
    7: "[[Out of time]] ! Astuce de Chikh Faycal : lis bien la question, puis fais confiance à ton premier réflexe.",
    9: "Fini ! Moi aussi, je suis lent le matin. Surtout avant mon café.",
    17: "Fini ! Même mon cousin de Londres répond plus vite. Bon, il répond n'importe quoi, mais vite.",
  },
  perfect: {
    2: "Cent pour cent ! Ma moustache vient de friser rien qu'en voyant ça.",
    5: "[[Top marks]] ! Note maximale. Je déclare jour de fête : makrout pour tout le monde. Sauf pour le chrono.",
    7: "Aucune erreur ! Je ne pleure pas. C'est de la craie dans l'œil. Ça m'arrive souvent.",
    8: "[[Outstanding]] ! Remarquable. J'écrirais ton nom en lettres d'or au tableau, si j'avais une craie dorée.",
    12: "Parfait ! Mon cousin de Londres va chanter en ton honneur. Désolé d'avance pour tes oreilles.",
    14: "Sans faute ! Je dois inventer un nouveau niveau de compliment : le niveau « Chikh royal ».",
    19: "Un sans-faute ! Je hoche la tête lentement, d'un air digne. Avec mes lunettes au bout du nez, c'est risqué.",
    22: "Tout juste ! Tu mérites une étoile dorée. Je n'en ai pas, alors je te donne mon plus beau sourire de prof.",
  },
  fail: {
    0: "Test raté. Moi aussi, j'ai raté des examens. Et regarde-moi : prof, avec une moustache magnifique.",
    7: "Raté. Je garde mon meilleur thé à la menthe pour fêter ta revanche. Il attendra, il est patient.",
    10: "Test raté, mais je ne suis pas inquiet. Un vieux prof sait reconnaître le talent, même en rodage.",
    12: "[[Don't give up]] ! Mon cousin de Londres a raté son permis onze fois. Les voisins s'en souviennent.",
    22: "Échec cette fois. Rien de grave : ni patron, ni client, juste un prof qui t'attend pour la revanche.",
  },
  comeback: {
    5: "De retour ! J'ai laissé la lumière allumée. Et le thé sur le feu. Il est un peu moins chaud.",
    9: "Quelques jours sans toi ! J'en ai profité pour tailler ma moustache. Elle brille. Toi aussi, tu vas briller.",
    11: "[[Look who's back]] ! Mon cousin de Londres a demandé de tes nouvelles. Je n'ai rien compris, mais c'était gentil.",
    14: "[[Back in action]] ! Pendant ton absence, j'ai corrigé quatre cents copies. Par stress. On rattrape tout ça.",
    17: "Ah ! Je savais que tu reviendrais. Je l'avais écrit sur un papillon adhésif. Collé sur mes lunettes.",
  },
  writing_good: {
    2: "Quel texte ! Je vais l'afficher sur mon frigo, entre le calendrier et la recette du makrout.",
    3: "Superbe ! Tes phrases coulent comme du miel sur un msemen chaud. Un délice.",
    5: "Excellent texte ! Tes mots de liaison sont à leur place, comme ma moustache : bien taillés et élégants.",
    9: "Magnifique ! J'en envoie une copie à mon cousin de Londres. Il va l'encadrer dans son château. Il n'a pas de château.",
    17: "Super texte ! Si c'était un plat, ce serait un couscous du vendredi : riche, généreux et totalement réussi.",
  },
  writing_bad: {
    3: "Bon début ! Ton texte est comme ma moustache à vingt ans : il va pousser et devenir magnifique.",
    7: "Courage ! Mon correcteur automatique fait pire : hier, il a changé « [[teacher]] » en « tea chair ». On a tous nos défis.",
    8: "Pas encore au point. Astuce de Chikh Faycal : des phrases courtes, un verbe par phrase, et on vérifie le temps.",
    14: "Ton texte a besoin d'un petit coup de peigne, comme ma moustache au réveil. Regarde les corrections et on recoiffe.",
  },
};
let n = 0;
for (const [sit, lines] of Object.entries(NEW)) {
  for (const [i, text] of Object.entries(lines)) {
    const q = data.quips[sit][Number(i)];
    if (!q) throw new Error(`missing ${sit}[${i}]`);
    q.text = text;
    n++;
  }
}
data.jokes = data.jokes.map((j) => ({ ...j, fr: j.fr.replace("Maurice approuve totalement.", "Chikh Faycal approuve totalement.").replace(" Typique de Maurice.", " Un orignal courageux !") }));
const left = JSON.stringify(data).match(/Maurice|orignal(?!s? courageux)|mes bois|andouiller/gi) || [];
writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
console.log(`${n} lines rewritten; leftovers: ${left.join(", ") || "none"}`);
