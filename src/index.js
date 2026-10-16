import "dotenv/config";
import fs from "node:fs/promises";
import { loadProfile } from "./profile.js";
import { fetchArticles } from "./feeds.js";
import { buildSystemPrompt, buildUserMessage } from "./prompt.js";
import { callLLM } from "./llm.js";
import { dedupe, parseResponse, buildDigest, toMarkdown, toWebDigest, MIN_SCORE } from "./tri.js";

// ---- Config ----
const MAX_AGE_HOURS = Number(process.env.MAX_AGE_HOURS || 72); // 72 h : le digest du lundi couvre le week-end
const MAX_ARTICLES = Number(process.env.MAX_ARTICLES || 40); // plafond par passage (quota)
const BATCH_SIZE = Number(process.env.BATCH_SIZE || 10); // petits lots : une réponse ratée ne fait pas perdre tout le passage
const DATA_DIR = new URL("../data/", import.meta.url);
const SITE_DIGEST = new URL("../docs/digest.json", import.meta.url); // lu par le site
const file = (name) => new URL(name, DATA_DIR);
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date()); // AAAA-MM-JJ

async function readJson(url, fallback) {
  try {
    return JSON.parse(await fs.readFile(url, "utf8"));
  } catch {
    return fallback;
  }
}
const writeJson = (url, value) => fs.writeFile(url, `${JSON.stringify(value, null, 2)}\n`);

// ---- Main ----
async function main() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const profile = await loadProfile();
  if (!profile.sources.length) throw new Error("Aucune source dans profile.md (section « sources: »)");
  const system = buildSystemPrompt(profile.text);

  const seen = new Set(await readJson(file("seen.json"), []));
  const { articles, report } = await fetchArticles(profile.sources, MAX_AGE_HOURS);
  const fresh = dedupe(articles.filter((a) => !seen.has(a.link)).sort((a, b) => b.date.localeCompare(a.date))).slice(0, MAX_ARTICLES);

  console.log(`\n${articles.length} articles récents, ${fresh.length} nouveaux.`);

  const notes = [];
  const rejets = [];
  let erreurs = 0;
  for (let i = 0; i < fresh.length; i += BATCH_SIZE) {
    const batch = fresh.slice(i, i + BATCH_SIZE);
    try {
      const text = await callLLM(system, buildUserMessage(batch));
      const result = parseResponse(text, batch);
      notes.push(...result.notes);
      rejets.push(...result.rejets.map((r) => ({ ...r, date: new Date().toISOString() })));
      batch.forEach((a) => seen.add(a.link)); // noté ou écarté : on ne le renvoie pas à l'IA
    } catch (err) {
      // Erreur réseau ou quota : le lot n'est pas marqué comme vu, il sera retenté au prochain passage
      erreurs++;
      console.error(`⚠️  Lot ${i / BATCH_SIZE + 1} non traité : ${err.message}`);
    }
  }

  for (const a of notes) console.log(`${a.note >= MIN_SCORE && a.categorie !== "hors-sujet" ? "✅" : "· "} ${a.note}/10 [${a.categorie}] ${a.titre}`);
  for (const r of rejets) console.warn(`🗑️  Écarté (réponse invalide) : ${r.titre} — ${r.erreur}`);

  // Le fichier du jour garde TOUS les articles notés : utile pour le blind test de la recette
  const previous = await readJson(file(`veille-${today}.json`), null);
  const allNotes = [...(previous?.articles ?? []), ...notes];
  const digest = buildDigest(allNotes);
  const output = {
    date: today,
    genere_le: new Date().toISOString(),
    digest,
    articles: allNotes,
    rapport: { sources: report, analyses: notes.length, rejets: rejets.length, lots_en_erreur: erreurs },
  };

  await writeJson(file(`veille-${today}.json`), output);
  await writeJson(file("latest.json"), output);
  await fs.writeFile(file(`veille-${today}.md`), toMarkdown(digest, today));
  await writeJson(SITE_DIGEST, toWebDigest(digest, today, allNotes));
  if (rejets.length) await writeJson(file("rejets.json"), [...(await readJson(file("rejets.json"), [])), ...rejets].slice(-200));
  await writeJson(file("seen.json"), [...seen].slice(-2000));

  console.log(`\n${toMarkdown(digest, today)}`);
  console.log(`📄 Sauvegardé dans data/veille-${today}.json, .md et docs/digest.json (${digest.total_retenus} retenu(s), ${rejets.length} écarté(s))`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
