# Intégration du composant IA premium dans ton app

## 1) Ajoute le fichier
Copie `AIPhraseAssistant.jsx` dans `src/`.

## 2) Importe le composant dans `src/ProfileSettingsPage.jsx`

```jsx
import AIPhraseAssistant from "./AIPhraseAssistant";
```

## 3) Ajoute ces props à `ProfileSettingsPage`
Dans la signature du composant, ajoute :

```jsx
savePhraseFromText,
```

## 4) Insère le composant juste sous le textarea `Texte à dire`

```jsx
<AIPhraseAssistant
  value={text}
  styles={styles}
  onPick={(nextText) => setText(nextText)}
  onPreview={(nextText) => speakText(nextText)}
  onSave={(nextText) => savePhraseFromText(nextText)}
/>
```

## 5) Dans `src/App.jsx`, crée une fonction utilitaire
Place-la juste sous `savePhrase()` :

```jsx
function savePhraseFromText(nextText) {
  if (!nextText?.trim()) return;

  const cleanText = nextText.trim();

  const newPhrase = {
    id: generateId(),
    label: cleanText.slice(0, 30),
    text: cleanText,
    category,
    assignedVoice: defaultVoice,
    favorite: false,
  };

  updateCurrentProfile((profile) => ({
    ...profile,
    phrases: [newPhrase, ...profile.phrases],
  }));

  setText(cleanText);
  setLabel(cleanText.slice(0, 30));
  setToastMessage("Phrase IA enregistrée");

  setTimeout(() => {
    setToastMessage("");
  }, 3000);
}
```

## 6) Passe la prop à `ProfileSettingsPage`
Dans le rendu de `App.jsx` :

```jsx
savePhraseFromText={savePhraseFromText}
```

---

# Version API réelle plus tard
Quand tu voudras brancher une vraie IA, garde le composant tel quel et ajoute juste une route backend.

Le composant accepte déjà un `endpoint`, par exemple :

```jsx
<AIPhraseAssistant
  value={text}
  styles={styles}
  endpoint="/api/ai/generate"
  onPick={(nextText) => setText(nextText)}
  onPreview={(nextText) => speakText(nextText)}
  onSave={(nextText) => savePhraseFromText(nextText)}
/>
```

## Format attendu côté backend

```json
{
  "suggestions": [
    "J'ai très mal au dos.",
    "J'ai besoin d'aide, j'ai mal au dos.",
    "Mon dos me fait très mal."
  ]
}
```

---

# Pourquoi ce composant colle bien à ton app
- il ne casse pas ton fonctionnement actuel
- il marche déjà sans backend grâce au mode local
- il garde le contrôle à l'utilisateur avec 3 choix
- il permet l'écoute immédiate et l'enregistrement direct
