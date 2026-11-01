# Obtenir l'APK de Mario Rush (sans rien installer)

Ton jeu est déjà prêt pour Android. Il reste juste à le « fabriquer » en APK.
GitHub le fait gratuitement pour toi, en ligne.

## Étapes (sur ordinateur, avec un navigateur)

1. Crée un compte gratuit sur https://github.com (si tu n'en as pas).
2. Clique sur **+** (en haut à droite) > **New repository**.
   Nom : `mario-rush`. Laisse **Public** ou **Private**, puis **Create repository**.
3. Dans la page du dépôt, clique sur **uploading an existing file**.
4. Décompresse ce zip sur ton ordinateur, ouvre le dossier, sélectionne TOUT son contenu
   (y compris le dossier `.github`) et glisse-le dans la page. Clique sur **Commit changes**.
   - Si le dossier `.github` n'a pas été envoyé : clique **Add file > Create new file**,
     écris comme nom `.github/workflows/build-apk.yml`, colle le contenu du fichier du même nom,
     puis **Commit changes**.
5. Clique sur l'onglet **Actions**. La construction démarre toute seule
   (sinon : **Construire l'APK Mario Rush** > **Run workflow**). Compte 4 à 8 minutes.
6. Quand c'est vert, clique sur la construction, puis en bas, dans **Artifacts**,
   télécharge **Mario-Rush-Android**. Décompresse : tu obtiens `app-debug.apk`.

## Installer sur le téléphone

1. Envoie `app-debug.apk` sur ton téléphone (câble USB, WhatsApp, Drive...).
2. Ouvre-le. Si Android demande, autorise l'installation depuis cette source.
3. Appuie sur **Installer**, puis ouvre **Mario Rush**. Tourne le téléphone en mode paysage.

Le jeu fonctionne hors ligne et garde les records sur le téléphone.
