import React, { useEffect, useMemo, useState } from "react";

type NoticePageProps = {
  styles: Record<string, React.CSSProperties>;
  initialSection?: SectionKey;
};

export type SectionKey =
  | "sommaire"
  | "introduction"
  | "navigation"
  | "communication"
  | "saisie"
  | "voix"
  | "dictionnaire"
  | "profil"
  | "infos"
  | "aidant"
  | "sauvegarde"
  | "confidentialite";

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

export default function NoticePage({
  styles,
  initialSection = "sommaire",
}: NoticePageProps) {
  const [section, setSection] = useState<SectionKey>(initialSection);

  useEffect(() => {
    setSection(initialSection);
  }, [initialSection]);

  const sections = useMemo<Section[]>(
    () => [
      {
        key: "sommaire",
        label: "Sommaire",
        title: "Ma Voix - Notice complète",
        content: (
          <>
            <NoticeBlock>
              <NoticeParagraph>
                Ma Voix est une application de communication assistée pensée
                pour aider une personne qui parle difficilement ou qui ne peut
                plus parler.
              </NoticeParagraph>
              <NoticeParagraph>
                Elle permet de faire lire des phrases, d'écrire un message, de
                gérer un profil médical et d'organiser les informations utiles
                pour le quotidien ou les urgences.
              </NoticeParagraph>
              <NoticeParagraph>
                Créée par Mickael, papa de Roxane et Cyrielle.
              </NoticeParagraph>
            </NoticeBlock>

            <NoticeBlock title="Rubriques">
              <NoticeList
                items={[
                  "1. Introduction et principe général",
                  "2. Navigation dans l'application",
                  "3. Communication rapide",
                  "4. Saisie libre et envoi de messages",
                  "5. Réglages de voix",
                  "6. Dictionnaire d'abréviations",
                  "7. Profil, santé et contacts",
                  "8. Infos d'urgence",
                  "9. Téléphone aidant et alarme",
                  "10. Sauvegarde, sécurité et données locales",
                  "11. Confidentialité et RGPD",
                ]}
              />
            </NoticeBlock>

            <NoticeBlock title="Mise à jour de la notice">
              <NoticeParagraph>
                Cette notice décrit les fonctions actuelles de Ma Voix sur les
                versions Windows/Web et Android. Certaines options peuvent
                apparaître différemment selon l'appareil, mais le principe
                reste le même.
              </NoticeParagraph>
              <NoticeParagraph>
                Elle tient aussi compte des derniers réglages d'interface :
                boutons et champs contenus dans leurs cartes, actions de profil
                regroupées, boutons Copier et Supprimer pour les liens aidants,
                navigation arrondie et barres de défilement harmonisées avec le
                thème choisi.
              </NoticeParagraph>
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
              <NoticeParagraph>
                Ma Voix a été créée par un patient pour aider d'autres
                personnes à communiquer plus facilement.
              </NoticeParagraph>
              <NoticeParagraph>
                Je m'appelle Mickael, j'ai 39 ans et je suis le papa de deux
                filles : Roxane et Cyrielle. Suite à la maladie de Charcot, j'ai
                progressivement perdu la voix ainsi que la mobilité.
              </NoticeParagraph>
              <NoticeParagraph>
                Communiquer avec mes proches est devenu de plus en plus
                difficile. J'ai donc créé cette application pour pouvoir
                continuer à échanger avec mes filles, ma famille, mes proches et
                le personnel soignant qui m'accompagne au quotidien.
              </NoticeParagraph>
              <NoticeParagraph>
                L'objectif est simple : permettre à une personne ayant des
                difficultés à parler de s'exprimer facilement, rapidement et
                dignement.
              </NoticeParagraph>
            </NoticeBlock>

            <NoticeBlock title="Ce que permet Ma Voix">
              <NoticeList
                items={[
                  "Lire à voix haute des phrases déjà prêtes.",
                  "Écrire un message libre et le faire prononcer.",
                  "Enregistrer des phrases dans des catégories personnalisées.",
                  "Adapter la voix, la vitesse, la hauteur et le volume.",
                  "Utiliser une vraie voix enregistrée pour certaines phrases.",
                  "Conserver des informations de profil, de santé et de contact.",
                  "Échanger des messages avec les aidants connectés.",
                  "Préparer une fiche Infos utilisable en situation d'urgence.",
                  "Envoyer une alerte par la cloche orange à l'aidant choisi dans Configurer.",
                ]}
              />
            </NoticeBlock>

            <NoticeBlock title="Données locales">
              <NoticeParagraph>
                Les profils, phrases, catégories, enregistrements et réglages
                sont conservés localement sur l'appareil utilisé. Les données ne
                sont pas envoyées ailleurs, sauf action volontaire comme l'envoi
                d'un message, l'appel d'un contact, l'ouverture d'un lien ou
                l'export d'une sauvegarde.
              </NoticeParagraph>
            </NoticeBlock>
          </>
        ),
      },
      {
        key: "navigation",
        label: "Navigation",
        title: "Navigation dans l'application",
        content: (
          <>
            <NoticeBlock title="Version Windows/Web">
              <NoticeList
                items={[
                  "Communication : accès aux boutons de phrases rapides.",
                  "Parler : saisie libre, dictée, lecture vocale et envoi de messages.",
                  "Infos : fiche récapitulative d'identité, santé, traitements et contacts d'urgence.",
                  "Menu : accès à Voix, Configurer, Dictionnaire, Notice et Soutenez-moi.",
                  "L'icône enveloppe ouvre directement les messages aidants et affiche le nombre de messages non lus.",
                  "La cloche orange en bas de l'écran envoie l'appel aidant configuré.",
                  "Les boutons, les champs et les barres de défilement suivent le thème choisi quand l'appareil le permet.",
                ]}
              />
            </NoticeBlock>

            <NoticeBlock title="Version Android">
              <NoticeList
                items={[
                  "Le menu Communication regroupe Rapide, Libre et Messages aidants.",
                  "Rapide ouvre les boutons de phrases.",
                  "Libre ouvre la zone de saisie et d'envoi de messages.",
                  "Messages aidants ouvre la conversation avec les téléphones aidants connectés.",
                  "Le menu Profil regroupe Infos et Profil.",
                  "Le menu secondaire donne accès à Voix, Configurer, Dictionnaire, Notice et Soutenez-moi.",
                  "L'icône enveloppe ouvre directement les messages aidants et affiche le nombre de messages non lus.",
                  "La cloche orange en bas de l'écran envoie l'appel aidant configuré.",
                  "Si un code PIN est activé, il peut être demandé avant d'ouvrir Infos ou Profil.",
                ]}
              />
            </NoticeBlock>

            <NoticeBlock title="Changer de rubrique">
              <NoticeParagraph>
                Chaque bouton de navigation ouvre une partie de l'application.
                Les informations saisies sont rattachées au profil actif.
                Lorsque plusieurs profils existent, vérifiez le profil choisi
                avant de modifier les phrases, les contacts ou les données de
                santé.
              </NoticeParagraph>
            </NoticeBlock>
          </>
        ),
      },
      {
        key: "communication",
        label: "Communication",
        title: "Communication rapide",
        content: (
          <>
            <NoticeBlock>
              <NoticeParagraph>
                La page Communication est l'écran principal pour parler vite.
                Chaque bouton correspond à une phrase. Un appui sur le bouton
                lit immédiatement la phrase à voix haute.
              </NoticeParagraph>
            </NoticeBlock>

            <NoticeBlock title="Catégories">
              <NoticeList
                items={[
                  "Les phrases sont classées par catégories pour retrouver rapidement le bon message.",
                  "La catégorie Toutes affiche l'ensemble des phrases du profil.",
                  "La catégorie Favoris regroupe les phrases marquées avec l'étoile.",
                  "Les catégories personnalisées créées dans la saisie libre apparaissent aussi ici.",
                ]}
              />
            </NoticeBlock>

            <NoticeBlock title="Favoris et ordre des phrases">
              <NoticeList
                items={[
                  "L'étoile ajoute ou retire une phrase des favoris.",
                  "Le mode Modifier ou Éditer affiche les actions de gestion.",
                  "Les flèches haut et bas déplacent une phrase dans la liste.",
                  "Le bouton Supprimer retire définitivement la phrase du profil actif.",
                ]}
              />
            </NoticeBlock>

            <NoticeBlock title="Voix utilisée">
              <NoticeParagraph>
                Une phrase peut utiliser la voix du profil, des réglages de voix
                spécifiques ou un enregistrement réel. Si un audio a été
                enregistré pour cette phrase, il est utilisé en priorité.
              </NoticeParagraph>
            </NoticeBlock>
          </>
        ),
      },
      {
        key: "saisie",
        label: "Saisie libre",
        title: "Saisie libre et messages",
        content: (
          <>
            <NoticeBlock>
              <NoticeParagraph>
                La saisie libre sert à écrire un message qui n'est pas encore
                enregistré. Elle permet aussi de créer de nouvelles phrases pour
                la page Communication.
              </NoticeParagraph>
            </NoticeBlock>

            <NoticeBlock title="Écrire et faire parler">
              <NoticeList
                items={[
                  "Écrivez le texte à prononcer dans la zone de saisie.",
                  "Le bouton Écouter lit le texte avec la voix du profil.",
                  "Le bouton Stop voix interrompt une lecture en cours.",
                  "La dictée vocale peut remplir le texte quand le navigateur ou l'appareil la prend en charge.",
                  "Sur Windows/Web, le bouton ⌨ ouvre le clavier virtuel pour écrire sans clavier physique.",
                  "Sur le clavier virtuel Windows/Web, gardez une lettre appuyée, glissez vers une variante, puis relâchez pour l'insérer.",
                  "Sur ce clavier, Mot efface le mot précédent et ↵ ajoute un retour à la ligne.",
                ]}
              />
            </NoticeBlock>

            <NoticeBlock title="Mise en forme automatique">
              <NoticeParagraph>
                Le texte est nettoyé automatiquement pendant la saisie :
                espaces, ponctuation, majuscules et certaines abréviations
                courantes sont corrigés pour obtenir une phrase plus lisible.
              </NoticeParagraph>
            </NoticeBlock>

            <NoticeBlock title="Enregistrer une phrase">
              <NoticeList
                items={[
                  "Saisissez le texte de la phrase.",
                  "Ajoutez un libellé si vous voulez un nom de bouton différent.",
                  "Choisissez la catégorie de rangement.",
                  "Enregistrez la phrase pour la retrouver ensuite dans Communication.",
                ]}
              />
            </NoticeBlock>

            <NoticeBlock title="Envoyer un message">
              <NoticeList
                items={[
                  "Choisissez un contact dans Envoyer à.",
                  "Sélectionnez le mode d'envoi proposé par l'appareil, par exemple SMS ou WhatsApp.",
                  "Le bouton d'envoi prépare le message avec le texte saisi.",
                  "Les contacts disponibles viennent de la rubrique Profil.",
                ]}
              />
            </NoticeBlock>

            <NoticeBlock title="Catégories personnalisées">
              <NoticeParagraph>
                Vous pouvez créer une catégorie avec un nom et une icône. Les
                catégories personnalisées servent à organiser les phrases selon
                les besoins réels : repas, douleur, soins, famille, rendez-vous
                ou toute autre situation utile.
              </NoticeParagraph>
            </NoticeBlock>
          </>
        ),
      },
      {
        key: "voix",
        label: "Voix",
        title: "Réglages de voix",
        content: (
          <>
            <NoticeBlock>
              <NoticeParagraph>
                La page Voix règle la manière dont l'application parle. Les
                réglages sont propres au profil actif.
              </NoticeParagraph>
            </NoticeBlock>

            <NoticeBlock title="Voix du profil">
              <NoticeList
                items={[
                  "Sur Windows/Web, vous pouvez choisir une voix française parmi celles proposées par le navigateur ou le système.",
                  "Sur Android, la voix dépend des voix disponibles sur l'appareil.",
                  "Le bouton de test permet d'écouter le rendu avant de garder le réglage.",
                  "Les voix détectées comme instables peuvent être masquées ou remplacées automatiquement.",
                ]}
              />
            </NoticeBlock>

            <NoticeBlock title="Vitesse, hauteur et volume">
              <NoticeList
                items={[
                  "Vitesse : ajuste la rapidité de lecture.",
                  "Hauteur : rend la voix plus grave ou plus aiguë.",
                  "Volume : règle le niveau sonore de lecture.",
                  "Réinitialiser les réglages revient aux valeurs de base.",
                ]}
              />
            </NoticeBlock>

            <NoticeBlock title="Réglages par phrase">
              <NoticeParagraph>
                Une phrase peut utiliser les réglages du profil ou avoir ses
                propres réglages de vitesse, hauteur et volume. C'est utile pour
                rendre certaines phrases plus calmes, plus fortes ou plus
                rapides.
              </NoticeParagraph>
            </NoticeBlock>

            <NoticeBlock title="Voix réelle enregistrée">
              <NoticeList
                items={[
                  "Sélectionnez une phrase dans Voix personnalisées.",
                  "Utilisez Enregistrer ma voix pour capturer une voix réelle.",
                  "Écouter l'audio actuel permet de vérifier le résultat.",
                  "Supprimer audio retire l'enregistrement de la phrase.",
                  "Quand un enregistrement existe, il remplace la voix synthétique pour cette phrase.",
                ]}
              />
            </NoticeBlock>
          </>
        ),
      },
      {
        key: "dictionnaire",
        label: "Dictionnaire",
        title: "Dictionnaire d'abréviations",
        content: (
          <>
            <NoticeBlock>
              <NoticeParagraph>
                Le dictionnaire permet de transformer des abréviations en mots
                ou expressions complètes pendant l'écriture. Il aide à écrire
                plus vite, surtout avec la saisie libre.
              </NoticeParagraph>
            </NoticeBlock>

            <NoticeBlock title="Entrées du dictionnaire">
              <NoticeList
                items={[
                  "Base : abréviations fournies avec l'application.",
                  "Personnel : abréviations ajoutées par l'utilisateur.",
                  "Modifié : abréviations de base dont le texte a été changé.",
                ]}
              />
            </NoticeBlock>

            <NoticeBlock title="Ajouter ou modifier">
              <NoticeList
                items={[
                  "Renseignez l'abréviation, par exemple smplmt.",
                  "Renseignez le texte complet, par exemple simplement.",
                  "Enregistrez pour ajouter l'entrée au dictionnaire.",
                  "Le bouton Modifier d'une entrée la charge dans le formulaire.",
                ]}
              />
            </NoticeBlock>

            <NoticeBlock title="Recherche et nettoyage">
              <NoticeList
                items={[
                  "La recherche filtre par abréviation, texte ou source.",
                  "Supprimer retire une entrée personnelle ou désactive une entrée de base.",
                  "Réinitialiser restaure une entrée de base modifiée.",
                  "Un message de confirmation apparaît avant une suppression.",
                ]}
              />
            </NoticeBlock>
          </>
        ),
      },
      {
        key: "profil",
        label: "Profil",
        title: "Profil, santé et contacts",
        content: (
          <>
            <NoticeBlock>
              <NoticeParagraph>
                La rubrique Profil centralise les informations de la personne,
                les réglages visuels, les données de santé et les contacts.
                Toutes ces informations sont liées au profil actif.
              </NoticeParagraph>
            </NoticeBlock>

            <NoticeBlock title="Identité et préférences">
              <NoticeList
                items={[
                  "Photo de profil.",
                  "Prénom, nom, date de naissance et adresse.",
                  "Numéro de sécurité sociale si vous choisissez de le renseigner.",
                  "Langue du profil.",
                  "Besoins principaux de la personne.",
                  "Thème d'affichage de l'application.",
                  "Le thème choisi règle aussi l'apparence des cartes, boutons, champs et barres de défilement.",
                ]}
              />
            </NoticeBlock>

            <NoticeBlock title="Santé">
              <NoticeList
                items={[
                  "Groupe sanguin.",
                  "Allergies.",
                  "Conditions médicales ou handicap.",
                  "Antécédents médicaux.",
                  "Traitements avec nom, dosage et fréquence.",
                  "Médecin traitant avec téléphone.",
                ]}
              />
            </NoticeBlock>

            <NoticeBlock title="Contacts">
              <NoticeParagraph>
                Les contacts peuvent servir aux urgences, aux messages ou aux
                deux. Renseignez leur nom, leur téléphone, leur lien ou leur
                rôle. Les contacts marqués urgence apparaissent dans la page
                Infos.
              </NoticeParagraph>
            </NoticeBlock>

            <NoticeBlock title="Profils multiples">
              <NoticeList
                items={[
                  "Choisir un profil permet de basculer vers une autre personne ou un autre jeu de données.",
                  "Ajouter crée un espace séparé.",
                  "Dupliquer reprend la base existante pour gagner du temps.",
                  "Supprimer efface définitivement ses informations locales.",
                  "Les actions Ajouter, Dupliquer et Supprimer restent groupées dans le bloc Profils ; sur petit écran, elles peuvent passer à la ligne.",
                ]}
              />
            </NoticeBlock>
          </>
        ),
      },
      {
        key: "infos",
        label: "Infos",
        title: "Infos d'urgence",
        content: (
          <>
            <NoticeBlock>
              <NoticeParagraph>
                La page Infos présente les informations importantes du profil
                actif dans un format plus lisible, utile pour un proche, un
                aidant ou un professionnel de santé.
              </NoticeParagraph>
            </NoticeBlock>

            <NoticeBlock title="Contenu affiché">
              <NoticeList
                items={[
                  "Aide rapide avec boutons de lecture vocale.",
                  "Identité utile.",
                  "Données administratives sensibles quand elles existent.",
                  "Santé, allergies, conditions et antécédents.",
                  "Traitements en cours.",
                  "Médecin traitant.",
                  "Contacts d'urgence.",
                ]}
              />
            </NoticeBlock>

            <NoticeBlock title="Lecture vocale">
              <NoticeParagraph>
                Les boutons Identité, Traitements, Santé et Contact d'urgence
                lisent à voix haute les informations correspondantes. Cela peut
                aider lorsque la personne ne peut pas expliquer elle-même sa
                situation.
              </NoticeParagraph>
            </NoticeBlock>

            <NoticeBlock title="Appels rapides">
              <NoticeParagraph>
                Lorsqu'un numéro est renseigné, un bouton d'appel peut ouvrir
                directement l'appel vers le médecin ou un contact d'urgence.
                Seuls les contacts déclarés urgence ou les deux sont affichés
                dans cette page.
              </NoticeParagraph>
            </NoticeBlock>
          </>
        ),
      },
      {
        key: "aidant",
        label: "Téléphone aidant",
        title: "Téléphone aidant et alarme",
        content: (
          <>
            <NoticeBlock>
              <NoticeParagraph>
                La fonction Téléphone aidant sert à choisir quel téléphone
                reçoit l'alerte quand la personne appuie sur la cloche orange.
                Chaque aidant peut avoir son propre lien, associé au profil
                actif.
              </NoticeParagraph>
              <NoticeParagraph>
                Quand le lien est ouvert sur le téléphone de l'aidant, ce
                téléphone peut rester connecté pour recevoir l'appel aidant, la
                sonnerie et les messages liés au profil.
              </NoticeParagraph>
            </NoticeBlock>

            <NoticeBlock title="Configurer les liens">
              <NoticeList
                items={[
                  "Ouvrez Configurer, puis repérez la section Téléphone aidant.",
                  "Utilisez Ajouter un aidant si plusieurs téléphones doivent avoir leur propre lien.",
                  "Le nom d'un aidant sert de repère ; il peut être laissé vide ou effacé sans casser son lien d'alarme.",
                  "Cochez Disponible pour Appel aidant pour chaque aidant qui doit apparaître dans la liste de choix.",
                  "Dans Aidant appelé par la cloche, choisissez l'aidant qui doit recevoir l'alarme.",
                  "Utilisez Copier pour envoyer ou coller le lien d'alarme sur le téléphone de l'aidant.",
                  "Sur Android, le bouton App aidant peut ouvrir directement l'application Ma Voix Aidant si elle est installée.",
                  "Utilisez Supprimer pour retirer un lien qui ne doit plus recevoir l'alarme.",
                ]}
              />
            </NoticeBlock>

            <NoticeBlock title="Envoyer une alerte">
              <NoticeParagraph>
                La cloche orange, placée en bas de l'application, envoie
                l'alarme uniquement à l'aidant choisi dans Configurer, section
                Téléphone aidant. Si son téléphone n'est pas connecté,
                l'application l'indique.
              </NoticeParagraph>
            </NoticeBlock>

            <NoticeBlock title="Sonnerie aidant">
              <NoticeParagraph>
                L'application aidant peut garder l'alarme connectée et
                importer son propre son d'alarme sur le téléphone de l'aidant.
              </NoticeParagraph>
            </NoticeBlock>
          </>
        ),
      },
      {
        key: "sauvegarde",
        label: "Sauvegarde",
        title: "Sauvegarde, sécurité et données locales",
        content: (
          <>
            <NoticeBlock title="Exporter et importer">
              <NoticeList
                items={[
                  "Exporter crée une sauvegarde locale des profils et réglages.",
                  "Importer restaure une sauvegarde existante.",
                  "La sauvegarde peut contenir des informations personnelles et médicales en clair.",
                  "Conservez le fichier exporté dans un endroit de confiance.",
                ]}
              />
            </NoticeBlock>

            <NoticeBlock title="Protection locale">
              <NoticeList
                items={[
                  "Sur Android, un code PIN peut protéger l'accès aux pages Infos et Profil.",
                  "Les informations médicales, d'identité et le code PIN sont chiffrés dans le stockage local quand le chiffrement de l'appareil est disponible.",
                  "Un mot de passe local peut renforcer ce coffre chiffré sans être stocké dans l'application.",
                  "Le mot de passe local n'est pas stocké : si vous le perdez, les données protégées ne pourront pas être récupérées.",
                  "La protection concerne l'appareil et le profil utilisés.",
                ]}
              />
            </NoticeBlock>

            <NoticeBlock title="Bonnes pratiques">
              <NoticeList
                items={[
                  "Mettez à jour les contacts et traitements dès qu'ils changent.",
                  "Testez régulièrement les phrases importantes.",
                  "Gardez une sauvegarde récente après une grosse modification.",
                  "Évitez de partager une exportation si elle contient des données sensibles.",
                ]}
              />
            </NoticeBlock>
          </>
        ),
      },
      {
        key: "confidentialite",
        label: "Confidentialité",
        title: "Confidentialité et RGPD",
        content: (
          <>
            <NoticeBlock title="Principe général">
              <NoticeParagraph>
                Ma Voix traite des informations personnelles et parfois des
                informations de santé. Ces données doivent rester limitées à ce
                qui est utile pour communiquer, aider au quotidien et répondre à
                une urgence.
              </NoticeParagraph>
              <NoticeParagraph>
                L'éditeur ou la personne qui déploie le service doit compléter
                les mentions légales avec son identité, son moyen de contact et
                la base légale retenue pour chaque usage.
              </NoticeParagraph>
            </NoticeBlock>

            <NoticeBlock title="Données conservées sur l'appareil">
              <NoticeList
                items={[
                  "Profils, phrases, catégories, préférences de voix et réglages visuels.",
                  "Informations d'identité, contacts d'urgence et informations médicales saisies volontairement.",
                  "Audios enregistrés pour certaines phrases et sons importés localement.",
                  "Ces données restent sur l'appareil sauf export volontaire, sauvegarde ou envoi d'un message.",
                ]}
              />
            </NoticeBlock>

            <NoticeBlock title="Données transitant par le serveur">
              <NoticeList
                items={[
                  "Les alertes aidant utilisent un canal technique généré par l'application.",
                  "Les messages aidant transitent par le serveur pour être remis à l'autre appareil.",
                  "L'historique serveur est temporaire, limité en volume et destiné à la remise récente des messages.",
                  "Aucune clé API personnelle ne doit être placée dans le code source public.",
                ]}
              />
            </NoticeBlock>

            <NoticeBlock title="Droits et sécurité">
              <NoticeList
                items={[
                  "La personne concernée doit pouvoir être informée clairement de l'utilisation de ses données.",
                  "Elle doit pouvoir demander l'accès, la rectification ou la suppression des données qui la concernent.",
                  "Les exports et sauvegardes doivent être conservés dans un endroit de confiance.",
                  "Les appareils utilisés par le patient et les aidants doivent être verrouillés et maintenus à jour.",
                ]}
              />
            </NoticeBlock>
          </>
        ),
      },
    ],
    []
  );

  const currentSection =
    sections.find((item) => item.key === section) ?? sections[0];

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
        <div style={{ fontSize: 16, opacity: 0.8 }}>
          Notice de l'application
        </div>
        <h2 style={{ margin: 0, fontSize: 34, lineHeight: 1.15 }}>
          Ma Voix - Notice complète
        </h2>
        <p style={{ margin: 0, lineHeight: 1.6, fontSize: 18 }}>
          Retrouvez ici les explications de toutes les rubriques actuelles de
          l'application.
        </p>
      </div>

      <div
        style={{
          ...styles.card,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <h3 style={{ margin: 0, fontSize: 24 }}>Rubriques de la notice</h3>

        <div
          style={{
            position: "relative",
            width: "100%",
          }}
        >
          <select
            value={section}
            onChange={(event) => setSection(event.target.value as SectionKey)}
            style={{
              ...styles.input,
              marginTop: 0,
              minHeight: 50,
              padding: "10px 42px 10px 12px",
              borderRadius: 14,
              fontSize: 17,
              fontWeight: 800,
              appearance: "none",
              WebkitAppearance: "none",
            }}
            aria-label="Choisir une rubrique de la notice"
          >
            {sections.map((item) => (
              <option key={item.key} value={item.key}>
                {item.label}
              </option>
            ))}
          </select>
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              right: 14,
              top: "50%",
              transform: "translateY(-50%)",
              pointerEvents: "none",
              fontSize: 16,
              fontWeight: 900,
              opacity: 0.72,
            }}
          >
            ▾
          </span>
        </div>

        <div
          style={{
            ...styles.infoBox,
            padding: "10px 12px",
            borderRadius: 14,
            fontWeight: 800,
            lineHeight: 1.35,
          }}
        >
          {currentSection.title}
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

