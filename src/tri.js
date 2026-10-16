import { z } from "zod";

export const CATEGORIES = ["sécurité", "conformité", "versions"]; // ordre = priorité du client
export const MIN_SCORE = Number(process.env.MIN_SCORE || 7);
export const MAX_DIGEST = Number(process.env.MAX_DIGEST || 8);
export const SURPRISE_MIN = Number(process.env.SURPRISE_MIN || 4);

/** Ce que l'IA doit renvoyer pour chaque article du lot. */
export const NoteSchema = z.object({
  id: z.number().int().positive(),
  note: z.number().int().min(0).max(10),
  categorie: z.enum([...CATEGORIES, "hors-sujet"]),
  raison: z.string().trim().min(5).max(400),
});

/** Le contrat du Livrable 2 : le format final d'un article noté. */
export const ArticleSchema = z.object({
  titre: z.string().min(1),
  note: z.number().int().min(0).max(10),
  categorie: z.enum([...CATEGORIES, "hors-sujet"]),
  raison: z.string().min(5),
  lien: z.string().url(),
  source: z.string(),
  date: z.string(),
});

/** Titre normalisé (minuscules, sans accents ni ponctuation) pour repérer les doublons. */
export const titleKey = (t) => String(t).toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, " ").trim();

/** Retire les doublons : même lien ou même titre publié par deux sources. Garde la première occurrence. */
export function dedupe(articles) {
  const links = new Set();
  const titles = new Set();
  return articles.filter((a) => {
    const key = titleKey(a.title);
    if (links.has(a.link) || titles.has(key)) return false;
    links.add(a.link);
    titles.add(key);
    return true;
  });
}

/**
 * Lit la réponse de l'IA pour un lot d'articles et valide chaque élément.
 * Un élément invalide est écarté sans faire perdre les autres ; un article sans note valide est rejeté.
 * Renvoie { notes: articles au format du contrat, rejets: [{ titre, lien, erreur }] }.
 */
export function parseResponse(text, batch) {
  const rejectAll = (erreur) => ({ notes: [], rejets: batch.map((a) => ({ titre: a.title, lien: a.link, erreur })) });

  const match = String(text).match(/\[[\s\S]*\]/);
  if (!match) return rejectAll("pas de tableau JSON dans la réponse");
  let raw;
  try {
    raw = JSON.parse(match[0]);
  } catch (err) {
    return rejectAll(`JSON illisible : ${err.message}`);
  }

  const byId = new Map();
  const erreurs = new Map();
  for (const item of raw) {
    const res = NoteSchema.safeParse(item);
    const id = Number(item?.id);
    if (!res.success) {
      if (id >= 1 && id <= batch.length) erreurs.set(id, res.error.issues.map((i) => `${i.path.join(".")} : ${i.message}`).join(" ; "));
      continue;
    }
    if (res.data.id > batch.length || byId.has(res.data.id)) continue; // id inconnu ou en double
    byId.set(res.data.id, res.data);
  }

  const notes = [];
  const rejets = [];
  batch.forEach((article, i) => {
    const n = byId.get(i + 1);
    if (!n) {
      rejets.push({ titre: article.title, lien: article.link, erreur: erreurs.get(i + 1) || "article non noté par l'IA" });
      return;
    }
    const final = ArticleSchema.safeParse({
      titre: article.title,
      note: n.categorie === "hors-sujet" ? 0 : n.note,
      categorie: n.categorie,
      raison: n.raison,
      lien: article.link, // toujours le lien du flux, jamais celui de l'IA
      source: article.source,
      date: article.date,
    });
    if (final.success) notes.push(final.data);
    else rejets.push({ titre: article.title, lien: article.link, erreur: final.error.issues[0].message });
  });
  return { notes, rejets };
}

const rank = (c) => CATEGORIES.indexOf(c);

/**
 * Construit le digest à partir des articles notés :
 * - retenus : note ≥ MIN_SCORE, au plus MAX_DIGEST (zéro bruit) ;
 * - groupés par catégorie, dans l'ordre sécurité > conformité > versions ;
 * - surprise : le meilleur article non retenu (note ≥ SURPRISE_MIN), seule exception au « zéro bruit ».
 */
export function buildDigest(notes) {
  const pertinents = notes.filter((a) => a.categorie !== "hors-sujet");
  const retenus = pertinents
    .filter((a) => a.note >= MIN_SCORE)
    .sort((a, b) => rank(a.categorie) - rank(b.categorie) || b.note - a.note)
    .slice(0, MAX_DIGEST);
  const liens = new Set(retenus.map((a) => a.lien));
  const surprise =
    pertinents.filter((a) => !liens.has(a.lien) && a.note >= SURPRISE_MIN).sort((a, b) => b.note - a.note)[0] ?? null;
  return {
    categories: CATEGORIES.map((categorie) => ({ categorie, articles: retenus.filter((a) => a.categorie === categorie) })),
    surprise,
    total_retenus: retenus.length,
  };
}

const EMOJI = { sécurité: "🛡️", conformité: "⚖️", versions: "📦" };
const line = (a) => `- **${a.titre}** · ${a.note}/10 · ${a.source}\n  ${a.raison}\n  ${a.lien}`;

/** Digest lisible en Markdown (en attendant le site). */
export function toMarkdown(digest, date) {
  const parts = [`# Veille DataLab · ${date}`, ""];
  if (!digest.total_retenus) parts.push("Rien de notable aujourd'hui.", "");
  for (const { categorie, articles } of digest.categories) {
    if (!articles.length) continue;
    parts.push(`## ${EMOJI[categorie]} ${categorie[0].toUpperCase()}${categorie.slice(1)}`, "", ...articles.map(line), "");
  }
  if (digest.surprise) parts.push("## 🎲 Article surprise", "", line(digest.surprise), "");
  return parts.join("\n");
}

/** Format lu par le site (docs/digest.json) : { date, categories: { sécurité: [...], ... }, surprise }. */
export function toWebDigest(digest, date) {
  const pick = ({ titre, note, categorie, raison, lien, source }) => ({ titre, note, categorie, raison, lien, source });
  return {
    date,
    categories: Object.fromEntries(digest.categories.map((c) => [c.categorie, c.articles.map(pick)])),
    surprise: digest.surprise ? pick(digest.surprise) : null,
  };
}
