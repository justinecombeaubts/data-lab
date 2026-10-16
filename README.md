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
| L3 · Un outil fiable | ⏳ À faire | |
| L4 · La recette | ⏳ À faire | |

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
| `src/index.js` | Enchaîne le tout et écrit `data/veille-AAAA-MM-JJ.json` et `.md` |

### Lancer en local

```bash
npm install
echo "OLLAMA_API_KEY=ta_cle" > .env   # le fichier .env n'est jamais commité
npm start                            # écrit le digest dans data/
npm test                             # 7 tests : format, rejets, doublons, digest, sources
```

Réglages possibles (variables d'environnement) : `MIN_SCORE` (7), `MAX_DIGEST` (8), `SURPRISE_MIN` (4), `MAX_AGE_HOURS` (72), `MAX_ARTICLES` (40), `BATCH_SIZE` (10), `LLM_MODEL` (`gpt-oss:120b`).
