import fs from "node:fs/promises";

export const PROFILE_FILE = new URL("../profile.md", import.meta.url);

/** Nom lisible d'une source à partir de son URL. */
export function sourceName(url) {
  const { hostname, pathname } = new URL(url);
  const host = hostname.replace(/^www\./, "");
  const release = pathname.match(/^\/[^/]+\/([^/]+)\/releases\.atom$/);
  if (host === "github.com" && release) return `${release[1]} · releases`;
  if (host.startsWith("cert.")) return "CERT-FR";
  if (host === "cnil.fr") return "CNIL";
  if (host === "github.blog") return "GitHub Blog · sécurité";
  return host;
}

/**
 * Lit la section « sources: » de profile.md : une ligne « - https://… » par source.
 * Une ligne « # commentaire » donne le groupe des sources qui suivent.
 */
export function parseSources(markdown) {
  const lines = markdown.split(/\r?\n/);
  const start = lines.findIndex((l) => /^sources\s*:/i.test(l.trim()));
  if (start === -1) return [];
  const sources = [];
  let group = "autres";
  for (const line of lines.slice(start + 1)) {
    const t = line.trim();
    if (!t) continue;
    if (/^[^#-].*:\s*$/.test(t)) break; // section suivante du profil
    const comment = t.match(/^#\s*(.+)$/);
    if (comment) {
      group = comment[1].trim();
      continue;
    }
    const item = t.match(/^-\s*(\S+)/);
    if (!item) continue;
    const url = /^https?:\/\//i.test(item[1]) ? item[1] : `https://${item[1]}`;
    try {
      sources.push({ url, name: sourceName(url), group });
    } catch {
      console.warn(`⚠️  Source ignorée (URL invalide) : ${item[1]}`);
    }
  }
  return sources;
}

/** Le profil complet (injecté dans le prompt) et ses sources. */
export async function loadProfile() {
  const text = await fs.readFile(PROFILE_FILE, "utf8");
  return { text, sources: parseSources(text) };
}
