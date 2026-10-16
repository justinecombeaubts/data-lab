# Journal de recette · Veille DataLab

Chaque réglage du profil ou du prompt est consigné ici : le constat, la cause, la correction et la mesure avant / après. Ce journal alimente le Livrable 4 (la recette) et la partie « recette » de la soutenance.

---

## Réglage n° 1 · Préciser l'environnement serveur (16 octobre 2026)

### Constat

Premier vrai passage de l'outil (16/10, 40 articles notés). Plusieurs avis du CERT-FR sont notés de façon incohérente :

| Article (CERT-FR) | Note | Ce qui pose problème |
|---|---|---|
| Vulnérabilités dans le noyau Linux d'**Ubuntu** | **10/10** | L'IA suppose que DataLab utilise Ubuntu… |
| Vulnérabilités dans le noyau Linux de **Red Hat** | **2/10** | …mais une faille équivalente sur une autre distribution est notée 2 |
| Vulnérabilités dans le noyau Linux de **SUSE** | **2/10** | idem |
| Vulnérabilités dans **Traefik** | **9/10** | « reverse-proxy souvent déployé » : Traefik n'est pas dans la stack déclarée |
| Vulnérabilités dans **Mattermost** | **8/10** | « messagerie interne potentiellement utilisée » : pure supposition |
| Vulnérabilité dans **PostgreSQL** psqlODBC | 9/10 | Correct : PostgreSQL est dans la stack |

### Cause

`profile.md` ne disait pas sur quel système tournent les serveurs de DataLab. L'IA a donc deviné, et elle a aussi supposé l'usage d'outils absents du profil (Traefik, Mattermost). Résultat : 2 articles sur 5 du digest ne concernent pas vraiment le client.

### Correction (dans `profile.md`, sans toucher au code)

```diff
  stack: Python, pandas, scikit-learn, PostgreSQL
+ environnement: serveurs Linux Ubuntu (production et calcul)
  ...
  contraintes:
    ...
+   - ne note haut un produit que s'il figure dans la stack, les dépendances ou l'environnement ci-dessus : ne jamais supposer qu'un outil est utilisé
```

### Attendu après correction

- Noyau Linux **Ubuntu** : reste haut (8 à 10), c'est désormais justifié par le profil.
- Noyau **Red Hat / SUSE** : restent bas (hors environnement).
- **Traefik** et **Mattermost** : passent sous le seuil de 7 et sortent du digest.
- **PostgreSQL** : reste haut.

### Mesure

Relancer avec renotation : *Actions → Veille DataLab → Run workflow* en cochant **« Recette : renoter aussi les articles déjà vus »**, puis compléter :

| Article | Avant | Après |
|---|---|---|
| Noyau Linux Ubuntu | 10 | |
| Noyau Linux Red Hat | 2 | |
| Noyau Linux SUSE | 2 | |
| Traefik | 9 | |
| Mattermost | 8 | |
| PostgreSQL psqlODBC | 9 | |
| **Articles dans le digest** | **5** | |

Le score du blind test (accord outil / équipe sur 10 articles) est à mesurer avant et après ce réglage par la responsable qualité.
