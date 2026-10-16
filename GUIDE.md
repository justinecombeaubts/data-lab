# Guide d'exploitation · Veille DataLab

Ce guide s'adresse à l'équipe DataLab. Il explique comment faire vivre l'outil **sans écrire de code** : tout se fait depuis GitHub, dans le navigateur.

- **Le site du jour** : https://justinecombeaubts.github.io/data-lab/
- **Le dépôt** : https://github.com/justinecombeaubts/data-lab

## Comment fonctionne l'outil, en bref

Du lundi au vendredi à **7 h**, l'outil se lance tout seul. Il lit les sources listées dans `profile.md`, fait noter chaque nouvel article par une IA selon votre profil, puis met à jour le site. Un article noté **7/10 ou plus** apparaît dans le digest ; le meilleur des autres devient « l'article surprise » ; tous les autres restent visibles dans « Articles écartés ».

**Un seul fichier pilote tout : `profile.md`.** Le modifier suffit pour changer les sources et la façon dont les articles sont notés.

---

## 1. Ajouter une source

1. Dans le dépôt, ouvrez **`profile.md`** puis cliquez sur le **crayon** (*Edit this file*) en haut à droite.
2. Sous la ligne `sources:`, ajoutez une ligne qui commence par deux espaces, un tiret et l'adresse du flux :
   ```yaml
   sources:
     # releases des dépendances
     - https://github.com/pandas-dev/pandas/releases.atom
     - https://github.com/pola-rs/polars/releases.atom      ← nouvelle source
   ```
   Une ligne `# …` sert juste à ranger les sources par groupe.
3. Cliquez sur **Commit changes** (en bas ou en haut à droite), puis confirmez.

**Quelle adresse mettre ?** L'outil lit les flux **RSS ou Atom**, pas les pages web classiques.

| Pour suivre… | Adresse à utiliser |
|---|---|
| Les nouvelles versions d'une bibliothèque sur GitHub | `https://github.com/ORGANISATION/PROJET/releases.atom` (ex. `https://github.com/pola-rs/polars/releases.atom`) |
| Un site d'actualités ou un blog | Son flux RSS : cherchez l'icône RSS ou une adresse finissant par `/feed/`, `/rss`, `rss.xml` |

**Vérifier :** ouvrez l'adresse dans votre navigateur. Si vous voyez du texte structuré (XML) avec des titres d'articles, c'est bon. Si vous voyez une page web normale ou une erreur, ce n'est pas un flux.

**Retirer une source :** supprimez sa ligne de la même façon.

---

## 2. Modifier le profil

Toujours dans **`profile.md`** (crayon → modifier → *Commit changes*). Chaque ligne a un rôle :

| Ligne | À quoi elle sert | Exemple de modification |
|---|---|---|
| `stack:` | Vos outils principaux. Une faille sur ces outils est notée haut. | Ajouter `Airflow` si vous l'adoptez |
| `environnement:` | Où tournent vos serveurs. Évite que l'IA devine. | `serveurs Linux Ubuntu et Red Hat` |
| `dépendances:` | Les bibliothèques à surveiller de près (versions, dépréciations). | Ajouter `polars` (et sa source, voir § 1) |
| `priorités:` | Ce qui compte le plus pour vous, par ordre d'importance. | Ajouter `conformité AI Act` |
| `exclure:` | Ce que vous ne voulez plus voir. Ces articles sont notés 0. | Ajouter `webinaires` |
| `contraintes:` | Les règles de tri. Une règle par ligne, commençant par `  - `. | `  - une faille Ubuntu passe avant une faille PostgreSQL` |

**Règles à respecter pour ne rien casser :**
- Gardez les mots suivis de `:` en début de ligne (`stack:`, `sources:`…) : l'outil s'en sert comme repères.
- Gardez la section `sources:` **en dernier** dans le fichier.
- Écrivez des phrases simples et concrètes : l'IA les lit telles quelles.

**Le changement s'applique au prochain passage** (le lendemain à 7 h), ou tout de suite si vous relancez l'outil (§ 3).

---

## 3. Relancer l'outil

1. Dans le dépôt, onglet **Actions**.
2. À gauche, cliquez sur **Veille DataLab**.
3. À droite, **Run workflow** → laissez la branche `main` → **Run workflow**.
4. Attendez 1 à 3 minutes : le passage apparaît en jaune (en cours), puis **vert** (réussi).
5. Rechargez le site (**Ctrl + Maj + R**). Le site peut mettre 1 à 2 minutes de plus à se mettre à jour.

**Après une modification du profil**, cochez **« Recette : renoter aussi les articles déjà vus »** avant de lancer. Sinon, l'outil ne note que les articles nouveaux et vous ne verrez pas l'effet de votre réglage sur ceux du jour.

---

## 4. Réglages avancés (sans toucher au code)

Dans **Settings → Secrets and variables → Actions → onglet Variables → New repository variable** :

| Variable | Valeur par défaut | Effet |
|---|---|---|
| `MIN_SCORE` | `7` | Note minimale pour entrer dans le digest |
| `MAX_DIGEST` | `8` | Nombre maximum d'articles dans le digest |
| `MAX_ARTICLES` | `40` | Nombre maximum d'articles envoyés à l'IA par passage (quota) |
| `LLM_MODEL` | `gpt-oss:120b` | Modèle d'IA utilisé chez Ollama |

Supprimer une variable remet la valeur par défaut.

**La clé de l'IA** (`OLLAMA_API_KEY`) se trouve dans l'onglet **Secrets** du même écran. Pour la remplacer : crayon → nouvelle valeur → *Update secret*. **Si une clé a été exposée** (copiée dans un message, un fichier, une capture), révoquez-la tout de suite sur le compte Ollama et remplacez-la ici.

---

## 5. En cas de problème

| Ce que vous voyez | Cause probable | Que faire |
|---|---|---|
| Le site affiche encore le digest d'hier | Le passage n'a pas tourné ou a échoué | Onglet **Actions** : regardez le dernier passage. S'il est rouge, voir ci-dessous. Sinon, relancez (§ 3). |
| Un passage en **rouge** dans Actions | Clé invalide, IA indisponible, ou erreur dans `profile.md` | Cliquez sur le passage puis sur l'étape en rouge pour lire le message. Clé : § 4. Profil : annulez votre dernière modification. GitHub vous prévient aussi par e-mail. |
| Dans le détail d'un passage : `⚠️ Flux KO : …` | Une source ne répond plus ou a changé d'adresse | Les autres sources continuent normalement. Vérifiez l'adresse (§ 1) et corrigez-la ou retirez-la. |
| `🗑️ Écarté (réponse invalide)` | L'IA a mal répondu pour un article | Rien à faire : l'article est écarté et tracé dans `data/rejets.json`. S'il y en a beaucoup, signalez-le. |
| Un article important est mal noté | Le profil n'est pas assez précis | Lisez sa **raison** dans « Articles écartés », précisez le profil (§ 2), relancez avec « renoter » (§ 3). |
| « Aucune actualité pertinente aujourd'hui » | Rien n'a atteint 7/10 | C'est normal certains jours. Les articles notés restent visibles dans « Articles écartés ». |

## Où trouver l'historique

Dans le dossier **`data/`** du dépôt : un fichier par jour (`veille-AAAA-MM-JJ.json` avec toutes les notes, et `.md` lisible directement sur GitHub). Les réglages déjà faits et leurs résultats sont dans **`recette/journal.md`**.
