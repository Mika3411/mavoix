# Build iOS Ma Voix

Ce dossier contient la cible iOS Capacitor de l'application principale Ma Voix.
La generation d'une IPA signee doit etre faite sur macOS avec Xcode.

## Depuis un Mac

```bash
npm install
npm run build
npx cap sync ios
npx cap open ios
```

Dans Xcode :

1. Ouvrir le projet `ios/App/App.xcodeproj`.
2. Selectionner la cible `App`.
3. Regler `Signing & Capabilities` avec le compte Apple Developer.
4. Verifier le bundle id `com.mavoix.app`.
5. Lancer `Product > Archive`.
6. Dans Organizer, choisir `Distribute App` pour exporter l'IPA ou envoyer vers TestFlight.

## Plugins iOS locaux

Les plugins maison suivants sont portes en Swift :

- `DocumentSaver` : export JSON des profils via le selecteur de fichiers iOS.
- `MessageNotifier` : notifications locales de messages aidants.

Les plugins `@capacitor-community/speech-recognition` et `capacitor-voice-recorder`
ne fournissent pas encore de `Package.swift`. Le projet Xcode reference donc leurs
sources iOS directement depuis `node_modules`. Il faut lancer `npm install` avant
d'ouvrir le projet dans Xcode.

## Limites

Cette cible iOS concerne l'application principale Ma Voix. L'application aidant
native Android reste une cible separee ; une vraie app aidant iOS demanderait un
port natif distinct.
