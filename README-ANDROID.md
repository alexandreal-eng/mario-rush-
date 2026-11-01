# Mario Rush sur Android

## Installer sur le telephone

1. Copie `Mario-Rush-Android.apk` sur ton telephone (USB, messagerie ou stockage cloud).
2. Ouvre le fichier APK depuis le gestionnaire de fichiers Android et autorise l'installation depuis cette source si Android le demande.
3. Appuie sur **Installer**. L'icone **Mario Rush** apparait dans le lanceur d'applications.
4. Tourne le telephone en mode paysage pour jouer. Le jeu se lance hors ligne.

L'APK fourni est une **version debug signee**, installable directement sur Android 6.0 (API 23) ou plus recent. Il n'est pas destine a une publication sur Google Play. Les records sont sauvegardes localement sur le telephone.

## Reconstruire l'APK

Prerequis : Node.js 20+, JDK 21 et SDK Android (plateforme 35 et Build-Tools 35). Configure `JAVA_HOME` vers le JDK 21 et `ANDROID_HOME` vers le SDK Android, puis lance :

```bash
npm install
bash scripts/build-android-apk.sh
```

Le script reconstruit le jeu, le synchronise avec Capacitor et cree `Mario-Rush-Android.apk` a la racine. Pour modifier l'icone ou l'ecran de lancement, change les fichiers dans `assets/` puis lance `npx capacitor-assets generate --android` avant de reconstruire.

Pour distribuer une version de production ou publier sur Google Play, il faudra generer et conserver en lieu sur une cle de signature release privee. La signature debug peut varier entre ordinateurs : si Android refuse une mise a jour fabriquee ailleurs, desinstalle d'abord l'ancienne version (ce qui supprime les scores locaux).