# Client : DataLab (pôle data d'un grand groupe bancaire)

stack: Python, pandas, scikit-learn, PostgreSQL
dépendances: pandas, numpy, scikit-learn
priorités: failles de sécurité (CVE), conformité RGPD, stabilité des versions (breaking changes, dépréciations, fin de support)
exclure: crypto, spéculation, marketing éditeur, tutos débutant, actualité IA grand public, clickbait

contraintes:
  - une faille ou une alerte RGPD passe toujours avant une nouveauté
  - une version majeure ou une rupture de compatibilité est à signaler, mais pas à recommander à l'adoption immédiate
  - zéro bruit : mieux vaut 3 articles solides que 15 moyens

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
