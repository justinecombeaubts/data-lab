# DataLab · Veille automatisée

Mission client B3 Dev & Automatisation (Digital Campus) : automatiser la veille technique de **DataLab**, le pôle data d'un grand groupe bancaire.

> Chaque matin, DataLab veut savoir si une faille, une alerte RGPD ou une rupture de compatibilité touche pandas, numpy ou scikit-learn, sans bruit, avant que ça n'impacte ses modèles en production ou les données de ses clients.

## L'équipe

| Rôle | Membre | Livrable |
|---|---|---|
| Cheffe de projet + Automaticienne | Ketsukı | L3 · Un outil fiable |
| Product owner | Christian B. | L1 · Le cadrage |
| Développeur | Hans K. | L2 · Le moteur de tri |
| Responsable qualité | Aristide P. | L4 · La recette |

## Avancement

| Livrable | Statut | Fichiers |
|---|---|---|
| L1 · Le cadrage | ✅ Terminé | [`profile.md`](profile.md), [`livrables/Livrable1_Cadrage_DataLab.pdf`](livrables/Livrable1_Cadrage_DataLab.pdf) |
| L2 · Le moteur de tri | ✅ Terminé | [`src/`](src/), [`test/tri.test.js`](test/tri.test.js) |
| Interface web | ✅ Terminé | [`docs/`](docs/) (publiée par GitHub Pages) |
| L3 · Un outil fiable | ✅ Terminé | [`.github/workflows/veille.yml`](.github/workflows/veille.yml) |
| L4 · La recette | 🟡 Score après réglage à mesurer | [`recette/journal.md`](recette/journal.md) (blind test 7/10 avant réglage), [`GUIDE.md`](GUIDE.md) (documentation client) |

> **Équipe DataLab :** pour ajouter une source, modifier le profil ou relancer l'outil, suivez le [**guide d'exploitation**](GUIDE.md).

## Choix technique

**Option A · Code** : script Node.js planifié par GitHub Actions. Aucun serveur à maintenir, clés dans les secrets GitHub, seuls des articles publics sont envoyés à l'IA. DataLab règle le tri seul via `profile.md`, sans toucher au code.

## `profile.md`

Le profil client pilote tout l'outil : le moteur de tri l'utilise comme consigne pour l'IA et y lit la liste des sources. Pour ajouter une source, ajoutez une ligne `- https://…` sous `sources:`.

## Le moteur de tri (Livrable 2)

```
profile.md ─► flux RSS (72 h) ─► doublons retirés ─► IA par lots de 10 ─► validation Zod ─► digest
                                                                         └─ invalide : écarté et tracé (data/rejets.json)
```

- **Chaque article reçoit une note et une catégorie**, au format validé par Zod : `{ titre, note, categorie, raison, lien }`. Le titre et le lien viennent du flux, jamais de l'IA.
- **Les doublons sont retirés** : même lien ou même titre, et les articles déjà vus (`data/seen.json`) ne sont pas renotés.
- **Le digest est groupé par catégorie** (sécurité > conformité > versions) : articles notés 7 ou plus, 8 au maximum, plus **un article surprise** (le meilleur non retenu, noté 4 ou plus).
- **L'IA note tous les articles**, même hors sujet : le fichier du jour garde toutes les notes pour le blind test de la recette.

| Fichier | Rôle |
|---|---|
| `src/profile.js` | Lit `profile.md` : le profil (consigne de l'IA) et les sources |
| `src/feeds.js` | Récupère les flux ; une source en panne n'arrête pas les autres |
| `src/prompt.js` | Le prompt de l'équipe, avec le profil injecté et la grille de notation |
| `src/llm.js` | Appel à l'IA (Ollama, `gpt-oss:120b`), avec nouvelles tentatives si saturée |
| `src/tri.js` | Validation Zod, doublons, digest et article surprise |
| `src/index.js` | Enchaîne le tout et écrit `data/veille-AAAA-MM-JJ.json`, `.md` et `docs/digest.json` |

### Lancer en local

```bash
npm install
echo "OLLAMA_API_KEY=ta_cle" > .env   # le fichier .env n'est jamais commité
npm start                            # écrit le digest dans data/
npm test                             # 9 tests : format, rejets, doublons, digest, sources
```

Réglages possibles (variables d'environnement) : `MIN_SCORE` (7), `MAX_DIGEST` (8), `SURPRISE_MIN` (4), `MAX_AGE_HOURS` (72), `MAX_ARTICLES` (40), `BATCH_SIZE` (10), `LLM_MODEL` (`gpt-oss:120b`).

## L'interface web (`docs/`)

Page statique en HTML, CSS et JS pur (aucune dépendance, aucune clé) : `index.html`, `style.css`, `app.js`. Elle lit `docs/digest.json`, écrit par le moteur à chaque passage.

- Synthèse du jour, une section par catégorie (sécurité, conformité, versions), article surprise à part.
- Section repliable **« Articles écartés »** : tous les autres articles notés du jour (sous le seuil ou hors sujet), avec leur note et la raison de l'IA.
- Badge de note selon l'urgence : 8+ priorité haute, 6-7 à planifier, moins de 6 pour information.
- Filtres au clavier, mode clair/sombre, responsive, contenu injecté uniquement avec `textContent`.

**Publier :** Settings → Pages → *Deploy from a branch* → `main` / `/docs`.
**Voir en local :** `npx serve docs` (ou `python3 -m http.server -d docs`).

## La mise à jour chaque matin (Livrable 3)

GitHub Actions lance l'outil **du lundi au vendredi à 7 h (heure de Paris)** : tests, moteur de tri, commit du digest, republication du site. Personne n'a rien à faire.

- **Heure d'été / d'hiver** : GitHub planifie en UTC, donc le workflow se déclenche à 5 h et 6 h UTC ; un garde-fou ne laisse passer que le premier passage après 7 h à Paris.
- **Lancer à la main** (démo, test) : onglet *Actions* → *Veille DataLab* → *Run workflow*.
- **Après un réglage de `profile.md`** : cocher *« Recette : renoter aussi les articles déjà vus »* pour mesurer l'effet sur les articles du jour (voir [`recette/journal.md`](recette/journal.md)).
- **Clé** : `OLLAMA_API_KEY` dans *Settings → Secrets and variables → Actions*, jamais dans le code.
- **En cas d'échec** : le passage apparaît en rouge dans l'onglet *Actions* et GitHub prévient par e-mail ; le site garde le digest précédent.

| Risque (slide 9) | Protection |
|---|---|
| Une source tombe | Les autres continuent (`Promise.allSettled`), la panne est notée dans le rapport du jour |
| Le quota sature | 40 articles maximum, lots de 10, nouvelles tentatives après 2 s, 6 s, 15 s |
| L'IA répond mal | Validation Zod : la réponse invalide est écartée et tracée dans `data/rejets.json` |
| Chaque matin | Planification du lundi au vendredi à 7 h, clé dans les secrets GitHub |
