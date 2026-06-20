function getPrivacyPolicyHtml() {
  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Politique de confidentialité - Ma Voix</title>
    <style>
      :root {
        color-scheme: light;
        --text: #1f2937;
        --muted: #4b5563;
        --border: #d1d5db;
        --background: #ffffff;
        --surface: #f8fafc;
        --accent: #0369a1;
      }
      body {
        margin: 0;
        background: var(--background);
        color: var(--text);
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        line-height: 1.6;
      }
      main {
        max-width: 860px;
        margin: 0 auto;
        padding: 40px 20px 56px;
      }
      header {
        border-bottom: 1px solid var(--border);
        margin-bottom: 28px;
        padding-bottom: 20px;
      }
      h1 {
        margin: 0 0 8px;
        font-size: clamp(2rem, 4vw, 3rem);
        line-height: 1.1;
      }
      h2 {
        margin-top: 32px;
        font-size: 1.3rem;
      }
      p,
      li {
        font-size: 1rem;
      }
      ul {
        padding-left: 1.25rem;
      }
      .muted {
        color: var(--muted);
      }
      .notice {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 8px;
        padding: 16px;
      }
      a {
        color: var(--accent);
      }
    </style>
  </head>
  <body>
    <main>
      <header>
        <h1>Politique de confidentialité</h1>
        <p class="muted">Application Ma Voix - Dernière mise à jour : 20 juin 2026</p>
      </header>

      <p>
        Ma Voix est une application de communication assistée. Elle permet de préparer des phrases,
        de les faire lire à voix haute, d'utiliser la dictée vocale, de gérer des informations utiles
        et de contacter un aidant.
      </p>

      <section>
        <h2>Données saisies dans l'application</h2>
        <p>
          L'utilisateur peut saisir volontairement des informations de profil, des phrases,
          des contacts d'urgence, des informations médicales utiles, des messages destinés aux aidants
          et des réglages de communication.
        </p>
        <p>
          Les informations de profil sont stockées localement sur l'appareil. L'application ne crée pas
          de compte utilisateur et ne demande pas d'identifiant de connexion.
        </p>
      </section>

      <section>
        <h2>Dictée vocale et synthèse vocale</h2>
        <p>
          La dictée vocale et la synthèse vocale utilisent les capacités du système ou du navigateur
          de l'appareil. Selon l'appareil, le traitement vocal peut dépendre des services fournis par
          le système d'exploitation. Ma Voix n'utilise pas ces fonctions pour suivre l'utilisateur.
        </p>
      </section>

      <section>
        <h2>SMS, WhatsApp et contacts</h2>
        <p>
          Lorsque l'utilisateur choisit d'envoyer un SMS ou un message WhatsApp, Ma Voix prépare le texte
          et ouvre l'application native correspondante. L'envoi final reste contrôlé par l'utilisateur.
        </p>
      </section>

      <section>
        <h2>Alertes et messages aidant</h2>
        <p>
          Les alertes et messages aidant peuvent transiter par le serveur Ma Voix afin de remettre les
          messages entre l'appareil de l'utilisateur et celui de l'aidant. Ces échanges utilisent un lien
          technique généré par l'application. Les messages aidant sont conservés pour une durée limitée
          afin de permettre leur remise, puis supprimés automatiquement selon la configuration du service.
        </p>
      </section>

      <section>
        <h2>Suivi, publicité et revente</h2>
        <p>
          Ma Voix n'affiche pas de publicité, ne revend pas de données personnelles et n'utilise pas les
          données de l'application pour du suivi publicitaire.
        </p>
      </section>

      <section>
        <h2>Suppression des données</h2>
        <p>
          Les données locales peuvent être modifiées ou supprimées depuis l'application, ou supprimées en
          désinstallant l'application de l'appareil. Pour toute demande concernant les données qui auraient
          transité par le serveur aidant, l'utilisateur peut contacter l'éditeur.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p class="notice">
          Pour toute question relative à la confidentialité, contactez l'éditeur de l'application Ma Voix
          à l'adresse utilisée dans App Store Connect pour le support de l'application.
        </p>
      </section>
    </main>
  </body>
</html>`;
}

module.exports = {
  getPrivacyPolicyHtml,
};
