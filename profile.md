# Client : DataLab (pôle data d'un grand groupe bancaire)

stack: Python, pandas, scikit-learn, PostgreSQL
environnement: serveurs Linux Ubuntu (production et calcul)
dépendances: pandas, numpy, scikit-learn
priorités: failles de sécurité (CVE), conformité RGPD, stabilité des versions (breaking changes, dépréciations, fin de support)
exclure: crypto, spéculation, marketing éditeur, tutos débutant, actualité IA grand public, clickbait

contraintes:
  - une faille ou une alerte RGPD passe toujours avant une nouveauté
  - une version majeure ou une rupture de compatibilité est à signaler, mais pas à recommander à l'adoption immédiate
  - zéro bruit : mieux vaut 3 articles solides que 15 moyens
  - ne note haut un produit que s'il figure dans la stack, les dépendances ou l'environnement ci-dessus : ne jamais supposer qu'un outil est utilisé

catégories: sécurité · conformité · versions

sources:
  # releases des dépendances
  - https://github.com/pandas-dev/pandas/releases.atom
  - https://github.com/numpy/numpy/releases.atom
  - https://github.com/scikit-learn/scikit-learn/releases.atom
  # sécurité et conformité
  - https://cert.cyber.gouv.fr/avis/feed/
  - https://www.cnil.fr/fr/rss.xml
  # veille sécurité dev (optionnel, à filtrer fort)
  - https://github.blog/security/feed/
