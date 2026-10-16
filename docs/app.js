// Veille DataLab · affichage du digest du jour (aucune dépendance, aucune clé)
"use strict";

const CATEGORIES = [
  { id: "sécurité", label: "Sécurité", icon: "🛡️", css: "cat-securite" },
  { id: "conformité", label: "Conformité", icon: "⚖️", css: "cat-conformite" },
  { id: "versions", label: "Versions", icon: "📦", css: "cat-versions" },
];
const byId = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));

const $ = (sel) => document.querySelector(sel);
const etat = $("#etat");
const resultats = $("#resultats");
const annonce = $("#annonce");

let digest = null;
let filtre = "tout";

/** Crée un élément, avec texte (toujours via textContent) et attributs. */
function el(tag, { text, cls, attrs } = {}, children = []) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  if (attrs) for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  for (const child of children) if (child) node.append(child);
  return node;
}

const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? "s" : ""}`;
const lienSur = (url) => typeof url === "string" && /^https?:\/\//i.test(url);
const niveau = (note) => (note >= 8 ? "fort" : note >= 6 ? "moyen" : "faible");
const libelleNiveau = { fort: "priorité haute", moyen: "à planifier", faible: "pour information" };

function dateFr(iso) {
  const [y, m, d] = String(iso).split("-").map(Number);
  if (!y || !m || !d) return "Date inconnue";
  const texte = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(y, m - 1, d));
  return texte.charAt(0).toUpperCase() + texte.slice(1); // « Vendredi 16 octobre 2026 »
}

/** Normalise les données reçues : tableaux garantis, notes entières, tri par note décroissante. */
function normaliser(data) {
  const propre = (a) => ({
    titre: String(a?.titre ?? "Sans titre"),
    note: Math.max(0, Math.min(10, Math.round(Number(a?.note) || 0))),
    categorie: byId[a?.categorie] ? a.categorie : null,
    raison: String(a?.raison ?? ""),
    lien: lienSur(a?.lien) ? a.lien : null,
    source: a?.source ? String(a.source) : null,
  });
  const categories = {};
  for (const c of CATEGORIES) {
    const liste = Array.isArray(data?.categories?.[c.id]) ? data.categories[c.id] : [];
    categories[c.id] = liste.map(propre).map((a) => ({ ...a, categorie: c.id })).sort((a, b) => b.note - a.note);
  }
  return {
    date: data?.date ?? null,
    exemple: data?.exemple === true,
    categories,
    surprise: data?.surprise ? propre(data.surprise) : null,
    ecartes: (Array.isArray(data?.ecartes) ? data.ecartes : [])
      .map((a) => ({ ...propre(a), horsSujet: a?.categorie === "hors-sujet" }))
      .sort((a, b) => b.note - a.note),
  };
}

function carte(article) {
  const cat = byId[article.categorie];
  const niv = niveau(article.note);
  const titre = article.lien
    ? el("a", { text: article.titre, attrs: { href: article.lien, target: "_blank", rel: "noopener noreferrer" } })
    : el("span", { text: article.titre });
  const meta = el("p", { cls: "card-meta" }, [
    cat ? el("span", { cls: "tag-cat", text: `${cat.icon} ${cat.label}` }) : null,
    article.source ? el("span", { text: article.source }) : null,
  ]);
  return el("li", {}, [
    el("article", { cls: `card ${cat ? cat.css : ""}` }, [
      el("div", { cls: "card-top" }, [
        el("h3", {}, [titre]),
        el("span", {
          cls: `note note-${niv}`,
          text: `${article.note}/10`,
          attrs: { title: `Note ${article.note} sur 10, ${libelleNiveau[niv]}`, "aria-label": `Note ${article.note} sur 10, ${libelleNiveau[niv]}` },
        }),
      ]),
      article.raison ? el("p", { cls: "raison", text: article.raison }) : null,
      meta,
    ]),
  ]);
}

function section(cat, articles) {
  const titreId = `titre-${cat.css}`;
  return el("section", { cls: `section ${cat.css}`, attrs: { "aria-labelledby": titreId, "data-categorie": cat.id } }, [
    el("div", { cls: "section-head" }, [
      el("span", { cls: "icon", text: cat.icon, attrs: { "aria-hidden": "true" } }),
      el("h2", { text: cat.label, attrs: { id: titreId } }),
      el("span", { cls: "count", text: pluriel(articles.length, "article") }),
    ]),
    articles.length ? el("ul", { cls: "cards" }, articles.map(carte)) : el("p", { cls: "empty", text: "Rien à signaler" }),
  ]);
}

function sectionSurprise(article) {
  return el("section", { cls: "section surprise cat-surprise", attrs: { "aria-labelledby": "titre-surprise", "data-categorie": "surprise" } }, [
    el("div", { cls: "section-head" }, [
      el("span", { cls: "icon", text: "🎲", attrs: { "aria-hidden": "true" } }),
      el("h2", { text: "Article surprise", attrs: { id: "titre-surprise" } }),
    ]),
    el("p", { cls: "intro", text: "Hors des priorités du jour, mais jugé intéressant pour l'équipe." }),
    el("ul", { cls: "cards" }, [carte(article)]),
  ]);
}

function ligneEcartee(article) {
  const cat = byId[article.categorie];
  const titre = article.lien
    ? el("a", { text: article.titre, attrs: { href: article.lien, target: "_blank", rel: "noopener noreferrer" } })
    : el("span", { text: article.titre });
  return el("li", { cls: "ecarte" }, [
    el("span", { cls: "ecarte-note", text: `${article.note}/10`, attrs: { "aria-label": `Note ${article.note} sur 10` } }),
    el("div", { cls: "ecarte-corps" }, [
      el("p", { cls: "ecarte-titre" }, [titre]),
      el("p", { cls: "ecarte-meta" }, [
        el("span", { cls: cat ? `tag-cat ${cat.css}` : "tag-hs", text: cat ? `${cat.icon} ${cat.label}` : "Hors sujet" }),
        article.source ? el("span", { text: article.source }) : null,
      ]),
      article.raison ? el("p", { cls: "ecarte-raison", text: article.raison }) : null,
    ]),
  ]);
}

function sectionEcartes(liste) {
  const details = el("details", { cls: "ecartes" }, [
    el("summary", {}, [
      el("span", { cls: "ecartes-titre", text: `Articles écartés (${liste.length})` }),
      el("span", { cls: "ecartes-aide", text: "Notés sous le seuil ou hors sujet : affichés pour transparence" }),
    ]),
    el("ul", { cls: "ecartes-liste" }, liste.map(ligneEcartee)),
  ]);
  return el("section", { cls: "section", attrs: { "aria-label": "Articles écartés par le tri" } }, [details]);
}

function synthese(d) {
  const counts = CATEGORIES.map((c) => [c.id, d.categories[c.id].length]);
  const total = counts.reduce((s, [, n]) => s + n, 0);
  if (!total) return "Aucun article prioritaire";
  return `${pluriel(total, "article")} : ${counts.map(([id, n]) => `${n} ${id}`).join(", ")}`;
}

function afficher() {
  resultats.replaceChildren();
  const total = CATEGORIES.reduce((s, c) => s + digest.categories[c.id].length, 0);

  if (!total && !digest.surprise) {
    resultats.append(el("div", { cls: "state" }, [el("p", { text: "Aucune actualité pertinente aujourd'hui." })]));
    if (digest.ecartes.length) resultats.append(sectionEcartes(digest.ecartes));
    annonce.textContent = "Aucune actualité pertinente aujourd'hui.";
    return;
  }

  const visibles = CATEGORIES.filter((c) => filtre === "tout" || filtre === c.id);
  for (const c of visibles) resultats.append(section(c, digest.categories[c.id]));
  const montrerSurprise = digest.surprise && (filtre === "tout" || digest.surprise.categorie === filtre);
  if (montrerSurprise) resultats.append(sectionSurprise(digest.surprise));
  const ecartes = digest.ecartes.filter((a) => filtre === "tout" || a.categorie === filtre);
  if (ecartes.length) resultats.append(sectionEcartes(ecartes));

  const n = visibles.reduce((s, c) => s + digest.categories[c.id].length, 0);
  const libelle = filtre === "tout" ? "toutes catégories" : byId[filtre].label.toLowerCase();
  annonce.textContent = `${pluriel(n, "article")} affiché${n > 1 ? "s" : ""} (${libelle})${montrerSurprise ? ", plus l'article surprise" : ""}.`;
}

function choisirFiltre(valeur) {
  filtre = valeur;
  for (const b of document.querySelectorAll(".filter")) b.setAttribute("aria-pressed", String(b.dataset.filter === valeur));
  if (digest) afficher();
}

function erreur(message) {
  etat.className = "state error";
  etat.setAttribute("role", "alert");
  const bouton = el("button", { text: "Réessayer", attrs: { type: "button" } });
  bouton.addEventListener("click", charger);
  etat.replaceChildren(
    el("p", {}, [el("strong", { text: "Impossible de charger la veille du jour." })]),
    el("p", { text: message }),
    bouton,
  );
  etat.hidden = false;
  resultats.hidden = true;
  $("#synthese").textContent = "Données indisponibles";
}

async function charger() {
  etat.className = "state";
  etat.setAttribute("role", "status");
  etat.replaceChildren(el("p", { text: "Chargement de la veille du jour…" }));
  etat.hidden = false;
  resultats.hidden = true;
  resultats.setAttribute("aria-busy", "true");
  try {
    const res = await fetch("digest.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`Le fichier digest.json a répondu ${res.status}.`);
    digest = normaliser(await res.json());
  } catch (err) {
    erreur(err instanceof SyntaxError ? "Le fichier digest.json est mal formé." : err.message || "Erreur réseau.");
    return;
  } finally {
    resultats.removeAttribute("aria-busy");
  }
  const time = $("#date");
  time.textContent = dateFr(digest.date);
  if (digest.date) time.setAttribute("datetime", digest.date);
  $("#synthese").textContent = synthese(digest) + (digest.exemple ? " · données d'exemple" : "");
  etat.hidden = true;
  resultats.hidden = false;
  afficher();
}

for (const b of document.querySelectorAll(".filter")) {
  b.addEventListener("click", () => choisirFiltre(b.dataset.filter));
}
charger();
