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
| L2 · Le moteur de tri | ⏳ À faire | |
| L3 · Un outil fiable | ⏳ À faire | |
| L4 · La recette | ⏳ À faire | |

## Choix technique

**Option A · Code** : script Node.js planifié par GitHub Actions. Aucun serveur à maintenir, clés dans les secrets GitHub, seuls des articles publics sont envoyés à l'IA. DataLab règle le tri seul via `profile.md`, sans toucher au code.

## `profile.md`

Le profil client pilote tout l'outil : le moteur de tri l'utilise comme consigne pour l'IA et y lit la liste des sources. Pour ajouter une source, ajoutez une ligne `- https://…` sous `sources:`.
