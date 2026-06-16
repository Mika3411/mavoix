# Ma Voix - release, secrets et confidentialité

## Nettoyage des secrets

- Ne pas placer de clé API, token, mot de passe ou keystore dans le code source.
- Utiliser `.env` localement et les variables d'environnement de l'hébergeur en production.
- Les fichiers `.env`, `*.jks`, `*.keystore` et `android/keystore.properties` sont ignorés par Git.
- `ma-voix-android/.env.example` et `ma-voix-windows/.env.example` documentent les variables attendues.

Variables utiles :

```env
REACT_APP_API_BASE_URL=https://mavoix.onrender.com
VITE_API_BASE_URL=https://mavoix.onrender.com
ALLOWED_ORIGINS=https://mavoix.onrender.com,capacitor://localhost,ionic://localhost
MESSAGE_RETENTION_MS=86400000
```

## Signature release Android

La signature release est lue depuis `ma-voix-android/android/keystore.properties` ou depuis les variables d'environnement `MA_VOIX_RELEASE_*`.
Sans ce fichier ou ces variables, Gradle peut produire un APK release non signé pour test local, mais il ne faut pas le diffuser.

Exemple de génération d'une clé d'upload :

```powershell
cd E:\ma-voix-sms-gratuit-patch\ma-voix-android\android
New-Item -ItemType Directory -Force -Path release
keytool -genkeypair -v -keystore release\ma-voix-release.jks -alias ma-voix -keyalg RSA -keysize 2048 -validity 10000
Copy-Item keystore.properties.example keystore.properties
```

Ensuite, compléter `keystore.properties` avec les vrais mots de passe choisis au moment du `keytool`.

Builds release :

```powershell
.\gradlew.bat :app:assembleRelease :aidant:assembleRelease
.\gradlew.bat :app:bundleRelease
```

À conserver hors dépôt :

- `android/release/ma-voix-release.jks`
- `android/keystore.properties`
- les mots de passe de la keystore

## Confidentialité / RGPD

Cette application peut contenir des données personnelles et des données de santé saisies volontairement. Les mesures techniques ajoutées dans le serveur sont :

- CORS restreint par défaut aux origines connues et configurables par `ALLOWED_ORIGINS`.
- En-têtes `Cache-Control: no-store` sur les API et la page aidant.
- En-têtes `X-Content-Type-Options: nosniff` et `Referrer-Policy: no-referrer`.
- Corps JSON limité à `32kb`.
- Historique des messages aidants gardé uniquement en mémoire, limité à 80 messages et à 24h par défaut (`MESSAGE_RETENTION_MS`).

À compléter avant diffusion publique :

- identité et contact du responsable de traitement ;
- finalités exactes du traitement ;
- base légale retenue ;
- durée de conservation effective ;
- procédure d'accès, rectification et suppression ;
- contrats éventuels avec les sous-traitants d'hébergement.

Sources de référence :

- Android - signature d'application : https://developer.android.com/studio/publish/app-signing
- Android - configuration Gradle des signatures : https://developer.android.com/build/build-variants
- CNIL - information et transparence : https://www.cnil.fr/fr/conformite-rgpd-information-des-personnes-et-transparence
- CNIL - applications mobiles en santé : https://www.cnil.fr/fr/applications-mobiles-en-sante-et-protection-des-donnees-personnelles-les-questions-se-poser

