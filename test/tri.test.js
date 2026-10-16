import { test } from "node:test";
import assert from "node:assert/strict";
import { parseResponse, dedupe, buildDigest } from "../src/tri.js";
import { parseSources } from "../src/profile.js";

const batch = [
  { title: "Faille dans numpy", link: "https://ex.com/1", source: "CERT-FR", date: "2026-10-16T08:00:00Z" },
  { title: "pandas 3.0", link: "https://ex.com/2", source: "pandas · releases", date: "2026-10-16T07:00:00Z" },
  { title: "Bitcoin s'envole", link: "https://ex.com/3", source: "blog", date: "2026-10-16T06:00:00Z" },
];

test("une réponse valide donne le format du contrat, avec le lien du flux", () => {
  const text = JSON.stringify([
    { id: 1, note: 9, categorie: "sécurité", raison: "Touche une dépendance clé." },
    { id: 2, note: 8, categorie: "versions", raison: "Breaking change à planifier.", lien: "https://lien-invente.com" },
    { id: 3, note: 6, categorie: "hors-sujet", raison: "Crypto, exclu du profil." },
  ]);
  const { notes, rejets } = parseResponse(text, batch);
  assert.equal(rejets.length, 0);
  assert.deepEqual(Object.keys(notes[0]).sort(), ["categorie", "date", "lien", "note", "raison", "source", "titre"]);
  assert.equal(notes[1].lien, "https://ex.com/2"); // le lien inventé par l'IA est ignoré
  assert.equal(notes[2].note, 0); // hors sujet = note 0
});

test("un élément invalide est écarté et tracé, sans faire perdre les autres", () => {
  const text = `Voici : ${JSON.stringify([
    { id: 1, note: 15, categorie: "sécurité", raison: "Note hors limites." },
    { id: 2, note: 8, categorie: "versions", raison: "Breaking change à planifier." },
  ])}`;
  const { notes, rejets } = parseResponse(text, batch);
  assert.equal(notes.length, 1);
  assert.equal(rejets.length, 2); // l'article 1 (note 15) et l'article 3 (jamais noté)
  assert.match(rejets[0].erreur, /note/);
  assert.match(rejets[1].erreur, /non noté/);
});

test("une catégorie inconnue est rejetée", () => {
  const { rejets } = parseResponse(JSON.stringify([{ id: 1, note: 7, categorie: "tendances", raison: "Catégorie hors contrat." }]), batch.slice(0, 1));
  assert.equal(rejets.length, 1);
});

test("une réponse qui n'est pas du JSON rejette tout le lot", () => {
  const { notes, rejets } = parseResponse("Désolé, je ne peux pas.", batch);
  assert.equal(notes.length, 0);
  assert.equal(rejets.length, 3);
});

test("les doublons (même lien ou même titre) sont retirés", () => {
  const list = [
    { title: "Faille dans NumPy !", link: "https://a.com/1" },
    { title: "faille dans numpy", link: "https://b.com/9" },
    { title: "Autre article", link: "https://a.com/1" },
    { title: "Article unique", link: "https://c.com/2" },
  ];
  assert.deepEqual(dedupe(list).map((a) => a.link), ["https://a.com/1", "https://c.com/2"]);
});

test("le digest respecte la priorité, le seuil et choisit un article surprise", () => {
  const a = (titre, note, categorie) => ({ titre, note, categorie, raison: "raison", lien: `https://ex.com/${titre}`, source: "s", date: "d" });
  const digest = buildDigest([
    a("v1", 9, "versions"),
    a("s1", 7, "sécurité"),
    a("c1", 8, "conformité"),
    a("s2", 10, "sécurité"),
    a("moyen", 5, "versions"),
    a("faible", 2, "versions"),
    a("crypto", 0, "hors-sujet"),
  ]);
  assert.deepEqual(digest.categories.map((c) => c.categorie), ["sécurité", "conformité", "versions"]);
  assert.deepEqual(digest.categories[0].articles.map((x) => x.titre), ["s2", "s1"]);
  assert.equal(digest.total_retenus, 4);
  assert.equal(digest.surprise.titre, "moyen");
});

test("les sources sont lues depuis profile.md", () => {
  const md = "stack: Python\nsources:\n  # releases\n  - github.com/pandas-dev/pandas/releases.atom\n  # autorités\n  - https://www.cnil.fr/fr/rss.xml\n";
  const sources = parseSources(md);
  assert.equal(sources.length, 2);
  assert.equal(sources[0].url, "https://github.com/pandas-dev/pandas/releases.atom");
  assert.equal(sources[0].name, "pandas · releases");
  assert.equal(sources[1].group, "autorités");
});
