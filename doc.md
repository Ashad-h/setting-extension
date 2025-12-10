# Guide d'utilisation de l'extension

Ce document détaille le processus d'utilisation de l'extension pour récupérer, qualifier et exporter des leads depuis LinkedIn.

## 1. Initialisation et chargement
1. **Naviguez vers un post LinkedIn** : Ouvrez la page détaillée d'un post spécifique (celui qui contient les interactions qui vous intéressent).
2. **Ouvrez l'extension** : Cliquez sur l'icône de l'extension dans votre navigateur.
3. **Chargement automatique** : L'extension détecte et charge automatiquement les profils ayant interagi (likes, commentaires, reposts). Une barre de progression vous indique l'avancement de la récupération.

## 2. Qualification des profils
Une fois la liste chargée, vous devez trier les profils pertinents :
- Sélectionnez les profils qui vous intéressent.
- Attribuez-leur un **Type** via le menu déroulant :
  - **Lead** : Pour les prospects potentiels.
  - **Consultant** : Pour les profils candidats/partenaires.
*Cette action permet de diriger le profil vers la bonne liste Extrovert et de définir correctement le champ "Type" dans Notion.*

## 3. Envoi vers Notion
Pour les profils qualifiés ci-dessus :
- Cliquez sur le bouton **Send to Notion**.
- Les profils sont ajoutés dans la database Notion de Setting.
- **Action requise** : Il faudra ensuite rédiger manuellement les messages de la séquence pour ces nouveaux leads dans Notion.
- *Note : Une fois envoyés, ces profils n'apparaîtront plus si vous rouvrez l'extension sur ce même post.*

## 4. Gestion des "Lead Magnets" (Export CSV)
Si vous traitez un post de type Lead Magnet:
1. Faites d'abord votre sélection de profils qualitatifs et envoyez-les vers Notion (étape 3).
2. Pour le reste des profils, utilisez la fonction **Export CSV**.
3. Cela génère un fichier contenant les noms et URLs LinkedIn.
4. **Marquage automatique** : Les profils exportés sont considérés comme "traités" pour ce post.

**Avantage du flux incrémental :**
Vous pouvez revenir sur le post quelques jours plus tard et rouvrir l'extension. Seuls les **nouveaux** profils (ceux ayant interagi depuis votre dernier passage) apparaîtront. Vous pourrez alors les trier à nouveau ou exporter un nouveau CSV propre.

## 5. Gestion intelligente des doublons
Le système vous aide à ne pas contacter deux fois la même personne :
- **Sur le même post** : Un profil traité (envoyé sur Notion ou exporté) disparaît de la vue pour ce post.
- **Sur un autre post** : Si un profil que vous avez déjà traité interagit sur un *nouveau* post, il apparaîtra dans la liste mais avec un label **"Déjà dans une séquence"**. Vous pouvez ainsi l'ignorer facilement.