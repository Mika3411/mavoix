import React, { useMemo, useState } from "react";

type NoticePageProps = {
  styles: Record<string, React.CSSProperties>;
};

type SectionKey =
  | "couverture"
  | "introduction"
  | "communication"
  | "voix"
  | "generer"
  | "profil"
  | "infos"
  | "credits";

type Section = {
  key: SectionKey;
  label: string;
  title: string;
  content: React.ReactNode;
};

function NoticeBlock({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.04)",
        borderRadius: 16,
        padding: 18,
        border: "1px solid rgba(255,255,255,0.06)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      {title ? (
        <h4
          style={{
            margin: 0,
            fontSize: 22,
            fontWeight: 700,
          }}
        >
          {title}
        </h4>
      ) : null}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          lineHeight: 1.65,
          fontSize: 18,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function NoticeParagraph({ children }: { children: React.ReactNode }) {
  return <p style={{ margin: 0 }}>{children}</p>;
}

function NoticeList({ items }: { items: string[] }) {
  return (
    <ul
      style={{
        margin: 0,
        paddingLeft: 24,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      {items.map((item, index) => (
        <li key={`${item}-${index}`}>{item}</li>
      ))}
    </ul>
  );
}

export default function NoticePage({ styles }: NoticePageProps) {
  const [section, setSection] = useState<SectionKey>("couverture");

  const sections = useMemo<Section[]>(
    () => [
      {
        key: "couverture",
        label: "Sommaire",
        title: "Ma Voix",
        content: (
          <>
            <NoticeBlock>
              <NoticeParagraph>Application de communication assistée</NoticeParagraph>
              <NoticeParagraph>
                Une application créée pour redonner une voix à ceux qui ne peuvent plus parler.
              </NoticeParagraph>
              <NoticeParagraph>
                Créée par Mickael – Papa de Roxane et Cyrielle
              </NoticeParagraph>
            </NoticeBlock>

            <NoticeBlock title="Sommaire">
              <NoticeList
                items={[
                  "1. Introduction",
                  "2. Onglet Communication",
                  "3. Onglet Voix",
                  "4. Onglet Générer",
                  "5. Onglet Profil",
                  "6. Onglet Infos",
                  "7. Onglet Crédits",
                ]}
              />
            </NoticeBlock>
          </>
        ),
      },
      {
        key: "introduction",
        label: "Introduction",
        title: "Introduction",
        content: (
          <>
            <NoticeBlock>
              <NoticeParagraph>Ma Voix – Communication assistée</NoticeParagraph>
              <NoticeParagraph>
                Une application créée par un patient, pour aider d’autres personnes à communiquer.
              </NoticeParagraph>
              <NoticeParagraph>
                Je m’appelle Mickael, j’ai 39 ans et je suis le papa de deux filles : Roxane et Cyrielle.
              </NoticeParagraph>
              <NoticeParagraph>
                Suite à la maladie de Charcot, j’ai progressivement perdu la voix ainsi que la mobilité.
              </NoticeParagraph>
              <NoticeParagraph>
                Communiquer avec mes proches est devenu de plus en plus difficile.
              </NoticeParagraph>
              <NoticeParagraph>
                J’ai donc créé cette application pour pouvoir continuer à échanger avec mes filles, ma
                famille, mes proches, mais aussi avec le personnel soignant qui m’accompagne au
                quotidien.
              </NoticeParagraph>
              <NoticeParagraph>
                L’objectif de Ma Voix est simple : permettre à une personne ayant des difficultés à parler
                de s’exprimer facilement, rapidement et dignement.
              </NoticeParagraph>
              <NoticeParagraph>
                Aujourd’hui, j’espère que cette application pourra aider d’autres personnes dans la même
                situation que moi, et leur redonner un moyen de communiquer avec le monde qui les
                entoure.
              </NoticeParagraph>
            </NoticeBlock>

            <NoticeBlock title="Fonctionnement général">
              <NoticeParagraph>
                L’application est organisée en plusieurs onglets simples : Communication, Voix, Générer,
                Profil, Infos et Crédits. Chaque onglet permet d’accéder à une fonctionnalité spécifique
                pour faciliter la communication.
              </NoticeParagraph>
              <NoticeParagraph>
                Les phrases peuvent être lues à voix haute, personnalisées, enregistrées, ou même
                remplacées par la vraie voix de la personne.
              </NoticeParagraph>
              <NoticeParagraph>
                L’ensemble a été conçu pour être simple, rapide et adapté aux besoins réels du quotidien.
              </NoticeParagraph>
            </NoticeBlock>
          </>
        ),
      },
      {
        key: "communication",
        label: "Communication",
        title: "Notice – Onglet Communication (Ma Voix)",
        content: (
          <>
            <NoticeBlock>
              <NoticeParagraph>
                L’onglet Communication est l’écran principal de l’application. Il permet d’exprimer des
                phrases rapidement en appuyant sur des boutons.
              </NoticeParagraph>
            </NoticeBlock>

            <NoticeBlock title="Catégories">
              <NoticeParagraph>
                Les phrases sont organisées en catégories pour faciliter la navigation.
              </NoticeParagraph>
              <NoticeParagraph>
                Exemples : Toutes, Favoris, Général, Besoins, Santé, Émotions, Urgence.
              </NoticeParagraph>
              <NoticeParagraph>
                Appuyez sur une catégorie pour afficher les phrases correspondantes.
              </NoticeParagraph>
            </NoticeBlock>

            <NoticeBlock title="Utiliser une phrase">
              <NoticeParagraph>Chaque bouton correspond à une phrase.</NoticeParagraph>
              <NoticeParagraph>
                Appuyez sur un bouton pour faire prononcer la phrase à voix haute.
              </NoticeParagraph>
            </NoticeBlock>

            <NoticeBlock title="Favoris">
              <NoticeParagraph>
                Appuyez sur l’icône étoile pour ajouter une phrase aux favoris.
              </NoticeParagraph>
              <NoticeParagraph>
                Les favoris permettent un accès rapide aux phrases les plus utilisées.
              </NoticeParagraph>
            </NoticeBlock>

            <NoticeBlock title="Modifier l’ordre des phrases">
              <NoticeParagraph>
                Utilisez les flèches (haut et bas) sous chaque bouton.
              </NoticeParagraph>
              <NoticeParagraph>
                Cela permet de réorganiser les phrases selon leur importance.
              </NoticeParagraph>
            </NoticeBlock>

            <NoticeBlock title="Supprimer une phrase">
              <NoticeParagraph>Appuyez sur le bouton “Supprimer”.</NoticeParagraph>
              <NoticeParagraph>Attention : cette action est définitive.</NoticeParagraph>
            </NoticeBlock>
          </>
        ),
      },
      {
        key: "voix",
        label: "Voix",
        title: "Notice – Onglet Voix (Ma Voix)",
        content: (
          <>
            <NoticeBlock>
              <NoticeParagraph>
                L’onglet Voix permet de configurer la manière dont les phrases sont prononcées et
                d’enregistrer une vraie voix pour personnaliser l’expérience.
              </NoticeParagraph>
            </NoticeBlock>

            <NoticeBlock title="Choix de la voix">
              <NoticeParagraph>
                Sélectionnez une voix (ex : Microsoft Rémy Multilingue).
              </NoticeParagraph>
              <NoticeParagraph>
                Permet de définir la voix utilisée pour la synthèse vocale.
              </NoticeParagraph>
            </NoticeBlock>

            <NoticeBlock title="Réglages de la voix">
              <NoticeList
                items={[
                  "Vitesse : ajuste la rapidité de lecture.",
                  "Hauteur : modifie le ton (grave ou aigu).",
                  "Volume : règle le niveau sonore.",
                ]}
              />
            </NoticeBlock>

            <NoticeBlock title="Tester la voix">
              <NoticeParagraph>
                Utilisez le bouton « Tester cette voix » pour écouter le rendu.
              </NoticeParagraph>
              <NoticeParagraph>Permet de valider les réglages.</NoticeParagraph>
            </NoticeBlock>

            <NoticeBlock title="Voix réelle enregistrée">
              <NoticeParagraph>
                Il est possible d’enregistrer la vraie voix de la personne pour chaque phrase.
              </NoticeParagraph>
              <NoticeParagraph>
                Appuyez sur « Enregistrer ma voix » pour enregistrer un message.
              </NoticeParagraph>
              <NoticeParagraph>
                Utilisez « Écouter l'audio actuel » pour vérifier l’enregistrement.
              </NoticeParagraph>
              <NoticeParagraph>
                Cette voix sera utilisée à la place de la voix synthétique pour la phrase.
              </NoticeParagraph>
            </NoticeBlock>

            <NoticeBlock title="Réglages par phrase">
              <NoticeParagraph>
                Chaque phrase peut utiliser les réglages du profil ou des réglages spécifiques.
              </NoticeParagraph>
            </NoticeBlock>

            <NoticeBlock title="Conseils d’utilisation">
              <NoticeList
                items={[
                  "Privilégier une voix claire et compréhensible.",
                  "Utiliser la voix réelle pour les phrases importantes ou personnelles.",
                  "Tester avec l’utilisateur final.",
                ]}
              />
            </NoticeBlock>
          </>
        ),
      },
      {
        key: "generer",
        label: "Générer",
        title: "Notice – Onglet Générer (Ma Voix)",
        content: (
          <>
            <NoticeBlock>
              <NoticeParagraph>
                L’onglet Générer permet d’écrire, corriger, écouter, enregistrer et envoyer des phrases
                personnalisées. Il sert aussi à créer des catégories pour organiser les boutons de
                communication.
              </NoticeParagraph>
            </NoticeBlock>

            <NoticeBlock title="Zone de génération">
              <NoticeParagraph>
                La zone en haut affiche la correction et la suite proposées par l’IA.
              </NoticeParagraph>
              <NoticeParagraph>
                Le premier bouton « Écouter » permet d’écouter la phrase générée par l’IA.
              </NoticeParagraph>
              <NoticeParagraph>
                Le bouton « Remplacer » remplace le texte en cours par la phrase générée.
              </NoticeParagraph>
            </NoticeBlock>

            <NoticeBlock title="Texte à dire">
              <NoticeParagraph>
                Le champ « Texte à dire » permet d’écrire la phrase à prononcer.
              </NoticeParagraph>
              <NoticeParagraph>
                Vous pouvez saisir le texte manuellement ou utiliser la dictée vocale selon l’interface
                affichée.
              </NoticeParagraph>
            </NoticeBlock>

            <NoticeBlock title="Clavier virtuel">
              <NoticeParagraph>
                Le bouton « Clavier virtuel » affiche un clavier directement dans l’application.
              </NoticeParagraph>
              <NoticeParagraph>
                Il permet de taper une phrase sans clavier physique.
              </NoticeParagraph>
              <NoticeParagraph>
                Un appui long sur une touche permet d’afficher des variantes de caractères.
              </NoticeParagraph>
              <NoticeParagraph>
                Exemple : la touche « a » peut proposer « à », « â », « @ », « ä », etc.
              </NoticeParagraph>
            </NoticeBlock>

            <NoticeBlock title="Écoute et lecture">
              <NoticeParagraph>
                Le bouton « Écouter » situé sous la zone de texte permet de lire la phrase actuellement
                saisie.
              </NoticeParagraph>
              <NoticeParagraph>
                Le bouton « Stop voix » interrompt la lecture en cours.
              </NoticeParagraph>
            </NoticeBlock>

            <NoticeBlock title="Génération par IA">
              <NoticeParagraph>
                Le bouton « Générer par IA » propose une reformulation ou une suite de phrase.
              </NoticeParagraph>
              <NoticeParagraph>
                Vous pouvez adapter le ton et le contexte grâce aux options comme « Ton » et « À qui je
                parle ».
              </NoticeParagraph>
            </NoticeBlock>

            <NoticeBlock title="Enregistrer une phrase">
              <NoticeParagraph>Saisissez un libellé de bouton.</NoticeParagraph>
              <NoticeParagraph>Choisissez une catégorie.</NoticeParagraph>
              <NoticeParagraph>
                Cliquez sur « Enregistrer la phrase » pour ajouter la phrase dans l’onglet Communication.
              </NoticeParagraph>
            </NoticeBlock>

            <NoticeBlock title="Envoi de messages">
              <NoticeParagraph>
                Vous pouvez choisir un destinataire dans « Envoyer à ».
              </NoticeParagraph>
              <NoticeParagraph>
                Le mode d’envoi permet de sélectionner le canal utilisé, par exemple SMS.
              </NoticeParagraph>
              <NoticeParagraph>
                Le bouton d’envoi transmet la phrase au contact sélectionné.
              </NoticeParagraph>
            </NoticeBlock>

            <NoticeBlock title="Gestion des catégories">
              <NoticeParagraph>
                Il est possible d’ajouter une nouvelle catégorie personnalisée.
              </NoticeParagraph>
              <NoticeParagraph>
                Chaque catégorie peut avoir un nom et une icône.
              </NoticeParagraph>
              <NoticeParagraph>
                Les catégories servent à mieux organiser les phrases enregistrées.
              </NoticeParagraph>
              <NoticeParagraph>
                Une catégorie existante peut aussi être supprimée.
              </NoticeParagraph>
            </NoticeBlock>

            <NoticeBlock title="Conseils d’utilisation">
              <NoticeList
                items={[
                  "Testez la phrase avant de l’enregistrer ou de l’envoyer.",
                  "Créez des catégories simples et utiles au quotidien.",
                  "Utilisez le clavier virtuel et les variantes de lettres pour faciliter l’écriture.",
                ]}
              />
            </NoticeBlock>
          </>
        ),
      },
      {
        key: "profil",
        label: "Profil",
        title: "Notice – Onglet Profil (Ma Voix)",
        content: (
          <>
            <NoticeBlock>
              <NoticeParagraph>
                L’onglet Profil permet de gérer les informations personnelles, médicales et les contacts
                importants de l’utilisateur.
              </NoticeParagraph>
            </NoticeBlock>

            <NoticeBlock title="Profil utilisateur">
              <NoticeList
                items={[
                  "Ajouter ou modifier une photo de profil.",
                  "Renseigner les informations personnelles : prénom, nom, date de naissance.",
                  "Indiquer l’adresse et le numéro de sécurité sociale.",
                ]}
              />
            </NoticeBlock>

            <NoticeBlock title="Informations générales">
              <NoticeList
                items={[
                  "Choisir la langue du profil.",
                  "Indiquer les besoins principaux de la personne.",
                ]}
              />
            </NoticeBlock>

            <NoticeBlock title="Thème visuel">
              <NoticeParagraph>
                Choisir l’apparence de l’application : sombre, clair, coloré ou personnalisé.
              </NoticeParagraph>
            </NoticeBlock>

            <NoticeBlock title="Santé">
              <NoticeList
                items={[
                  "Renseigner le groupe sanguin et les allergies.",
                  "Ajouter des antécédents médicaux importants.",
                  "Préciser un handicap ou une condition particulière.",
                ]}
              />
            </NoticeBlock>

            <NoticeBlock title="Traitements en cours">
              <NoticeList
                items={[
                  "Ajouter un traitement avec son nom, dosage et fréquence.",
                  "Possibilité de supprimer un traitement.",
                ]}
              />
            </NoticeBlock>

            <NoticeBlock title="Médecin traitant">
              <NoticeParagraph>
                Renseigner le nom et le téléphone du médecin principal.
              </NoticeParagraph>
            </NoticeBlock>

            <NoticeBlock title="Contacts">
              <NoticeList
                items={[
                  "Ajouter des contacts importants (famille, aidants…).",
                  "Indiquer leur numéro de téléphone et leur rôle.",
                  "Possibilité de supprimer un contact.",
                ]}
              />
            </NoticeBlock>

            <NoticeBlock title="Sauvegarde">
              <NoticeList
                items={[
                  "Exporter : permet de sauvegarder toutes les données du profil.",
                  "Importer : permet de restaurer un profil sauvegardé.",
                  "Utile pour changer d’appareil ou conserver une copie de sécurité.",
                ]}
              />
            </NoticeBlock>

            <NoticeBlock title="Conseils d’utilisation">
              <NoticeList
                items={[
                  "Maintenir les informations à jour.",
                  "Renseigner les données essentielles pour les situations d’urgence.",
                  "Sauvegarder régulièrement le profil.",
                ]}
              />
            </NoticeBlock>
          </>
        ),
      },
      {
        key: "infos",
        label: "Infos",
        title: "Notice – Onglet Infos (Ma Voix)",
        content: (
          <>
            <NoticeBlock>
              <NoticeParagraph>
                L’onglet Infos regroupe toutes les informations renseignées dans l’onglet Profil. Il permet
                un accès rapide et simplifié aux données importantes, notamment en situation d’urgence.
              </NoticeParagraph>
            </NoticeBlock>

            <NoticeBlock title="Affichage des informations">
              <NoticeParagraph>
                Toutes les informations proviennent de l’onglet Profil.
              </NoticeParagraph>
              <NoticeParagraph>
                Elles sont affichées sous forme de cartes : identité, santé, traitements et contacts
                d’urgence.
              </NoticeParagraph>
            </NoticeBlock>

            <NoticeBlock title="Lecture vocale">
              <NoticeParagraph>
                Quatre boutons permettent de lire les informations à voix haute :
              </NoticeParagraph>
              <NoticeList
                items={[
                  "Identité : lit les informations personnelles.",
                  "Traitements : lit les traitements en cours.",
                  "Santé : lit les informations médicales.",
                  "Contact d’urgence : lit les contacts importants.",
                ]}
              />
            </NoticeBlock>

            <NoticeBlock title="Contacts affichés">
              <NoticeParagraph>
                Seuls les contacts définis comme « urgent » ou « les deux » dans l’onglet Profil
                apparaissent ici.
              </NoticeParagraph>
              <NoticeParagraph>
                Permet un accès rapide aux personnes à contacter en cas de besoin.
              </NoticeParagraph>
            </NoticeBlock>

            <NoticeBlock title="Appel rapide">
              <NoticeParagraph>
                Un bouton « Appeler » permet de contacter directement un contact d’urgence.
              </NoticeParagraph>
            </NoticeBlock>

            <NoticeBlock title="Conseils d’utilisation">
              <NoticeList
                items={[
                  "Vérifier régulièrement que les informations sont à jour dans l’onglet Profil.",
                  "Utiliser la lecture vocale pour faciliter la communication avec les professionnels ou aidants.",
                  "S’assurer que les contacts d’urgence sont correctement définis.",
                ]}
              />
            </NoticeBlock>
          </>
        ),
      },
      {
        key: "credits",
        label: "Crédits",
        title: "Notice – Onglet Crédits (Ma Voix)",
        content: (
          <>
            <NoticeBlock>
              <NoticeParagraph>
                L’onglet Crédits explique le fonctionnement du système de crédits et permet de soutenir le
                projet.
              </NoticeParagraph>
            </NoticeBlock>

            <NoticeBlock title="Principe des crédits">
              <NoticeParagraph>
                L’application utilise une réserve commune de crédits.
              </NoticeParagraph>
              <NoticeParagraph>
                Ces crédits permettent d’utiliser certaines fonctionnalités comme la génération par IA.
              </NoticeParagraph>
              <NoticeParagraph>1 génération IA = 1 crédit utilisé.</NoticeParagraph>
            </NoticeBlock>

            <NoticeBlock title="Conversion">
              <NoticeParagraph>1€ = 1000 crédits.</NoticeParagraph>
              <NoticeParagraph>
                Les crédits sont partagés pour que tous les utilisateurs puissent en bénéficier.
              </NoticeParagraph>
            </NoticeBlock>

            <NoticeBlock title="Utilisation">
              <NoticeParagraph>
                Chaque appui sur « Générer par IA » consomme 1 crédit.
              </NoticeParagraph>
              <NoticeParagraph>
                La consommation est déduite de la réserve commune.
              </NoticeParagraph>
            </NoticeBlock>

            <NoticeBlock title="Crédits disponibles">
              <NoticeParagraph>
                Le nombre de crédits restants est affiché en temps réel.
              </NoticeParagraph>
              <NoticeParagraph>
                Permet de savoir si la fonctionnalité IA est encore disponible.
              </NoticeParagraph>
            </NoticeBlock>

            <NoticeBlock title="Dons et soutien">
              <NoticeParagraph>
                Les utilisateurs peuvent faire un don pour soutenir le projet.
              </NoticeParagraph>
              <NoticeParagraph>
                Les dons augmentent le nombre de crédits disponibles pour tous.
              </NoticeParagraph>
              <NoticeParagraph>
                Chaque contribution aide à maintenir l’application accessible.
              </NoticeParagraph>
            </NoticeBlock>

            <NoticeBlock title="Remerciements">
              <NoticeParagraph>
                Une section affiche les dons reçus (si disponibles).
              </NoticeParagraph>
              <NoticeParagraph>Permet de remercier les contributeurs.</NoticeParagraph>
            </NoticeBlock>

            <NoticeBlock title="Objectif">
              <NoticeParagraph>Maintenir une application accessible à tous.</NoticeParagraph>
              <NoticeParagraph>
                Permettre aux personnes ayant perdu la voix de continuer à communiquer.
              </NoticeParagraph>
            </NoticeBlock>
          </>
        ),
      },
    ],
    []
  );

  const currentSection = sections.find((item) => item.key === section) ?? sections[0];

  const getButtonStyle = (key: SectionKey): React.CSSProperties => ({
    ...(section === key ? styles.primaryButton : styles.secondaryButton),
    padding: "10px 16px",
    borderRadius: 14,
    fontSize: 16,
    fontWeight: 700,
    whiteSpace: "nowrap",
  });

  return (
    <div
      style={{
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 20,
        minHeight: 0,
      }}
    >
      <div
        style={{
          ...styles.card,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <div style={{ fontSize: 16, opacity: 0.8 }}>Notice de l’application</div>
        <h2 style={{ margin: 0, fontSize: 34, lineHeight: 1.15 }}>
          Ma Voix – Notice complète
        </h2>
        <p style={{ margin: 0, lineHeight: 1.6, fontSize: 18 }}>
          Cette page reprend le contenu de la notice de l’application, onglet par onglet.
        </p>
      </div>

      <div
        style={{
          ...styles.card,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <h3 style={{ margin: 0, fontSize: 24 }}>Rubriques de la notice</h3>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          {sections.map((item) => (
            <button
              key={item.key}
              onClick={() => setSection(item.key)}
              style={getButtonStyle(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div
        style={{
          ...styles.card,
          display: "flex",
          flexDirection: "column",
          gap: 18,
          minHeight: 0,
        }}
      >
        <h3 style={{ margin: 0, fontSize: 28 }}>{currentSection.title}</h3>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {currentSection.content}
        </div>
      </div>
    </div>
  );
}