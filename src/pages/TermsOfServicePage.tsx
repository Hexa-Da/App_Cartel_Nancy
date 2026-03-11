import React from 'react';
import './LegalDocumentPage.css';

const TermsOfServicePage: React.FC = () => {
  return (
    <div className="page-content scrollable legal-doc-page">
      <div className="legal-doc-container">
          <h1>Conditions Générales d&apos;Utilisation</h1>

          <div className="legal-doc-highlight">
            <strong>Application Cartel Nancy</strong>
            <br />
            Les présentes Conditions Générales d&apos;Utilisation régissent l&apos;utilisation de l&apos;application
            mobile Cartel Nancy et définissent les droits et obligations de tous les utilisateurs.
          </div>

          <h2>Article 1 - Définitions</h2>
          <ul className="legal-doc-list">
          <li>
            <strong>Application</strong> : désigne l&apos;application mobile Cartel Nancy
          </li>
          <li>
            <strong>Éditeur</strong> : désigne Cartel Nancy, responsable de l&apos;application
          </li>
          <li>
            <strong>Utilisateur</strong> : désigne toute personne utilisant l&apos;application
          </li>
          <li>
            <strong>Participant</strong> : désigne un utilisateur ayant un numéro de bracelet valide
          </li>
          <li>
            <strong>Services</strong> : désigne l&apos;ensemble des fonctionnalités proposées par l&apos;application
          </li>
          <li>
            <strong>Contenu</strong> : désigne toute information, donnée ou élément accessible via l&apos;application
          </li>
          <li>
            <strong>Bracelet</strong> : désigne le bracelet physique attribué aux participants avec un numéro unique
          </li>
        </ul>

        <h2>Article 2 - Acceptation des Conditions</h2>
        <p>
          L&apos;utilisation de l&apos;application Cartel Nancy implique l&apos;acceptation pleine et entière des
          présentes conditions générales d&apos;utilisation. Ces conditions s&apos;appliquent à tous les utilisateurs de
          l&apos;application.
        </p>

        <div className="legal-doc-warning">
          <strong>Important :</strong> Si vous n&apos;acceptez pas ces conditions, vous ne devez pas utiliser
          l&apos;application.
        </div>

        <h2>Article 3 - Description des Services</h2>
        <p>L&apos;application Cartel Nancy propose les services suivants :</p>
        <ul className="legal-doc-list">
          <li>Consultation d&apos;événements publics et privés</li>
          <li>Affichage de cartes interactives avec géolocalisation</li>
          <li>Accès à un calendrier d&apos;événements</li>
          <li>Fonctionnalités d&apos;administration (pour les utilisateurs autorisés)</li>
          <li>Formulaire de signalement VSS</li>
          <li>Informations sur les transports en commun</li>
          <li>Système de paris sur les matchs (pour les participants)</li>
          <li>Chat en temps réel</li>
        </ul>

        <h2>Article 4 - Charte HSE</h2>
        <h3>4.1 - Obligation de lecture</h3>
        <p>Au premier lancement de l&apos;application, tout utilisateur doit :</p>
        <ul className="legal-doc-list">
          <li>Lire intégralement la Charte HSE (Hygiène, Sécurité, Environnement)</li>
          <li>Cocher la case d&apos;acceptation des engagements</li>
        </ul>

        <h3>4.2 - Engagement</h3>
        <p>
          En acceptant la charte HSE, l&apos;utilisateur s&apos;engage à respecter les règles d&apos;hygiène, de
          sécurité et d&apos;environnement définies pour l&apos;événement.
        </p>

        <h2>Article 5 - Activation du Bracelet</h2>
        <h3>5.1 - Section &quot;Faites vos paris&quot;</h3>
        <p>
          Pour accéder aux paris sur les matchs, l&apos;utilisateur doit activer son numéro de bracelet dans la section
          dédiée &quot;Faites vos paris&quot;.
        </p>

        <h3>5.2 - Activation unique par appareil</h3>
        <div className="legal-doc-important">
          <strong>Important :</strong> Chaque numéro de bracelet ne peut être activé que sur un seul appareil. Une fois
          activé, le bracelet ne peut pas être transféré sur un autre téléphone. Cette action est irréversible.
        </div>

        <h3>5.3 - Validation du bracelet</h3>
        <p>
          Le numéro de bracelet est validé contre la base de données des participants. Un bracelet invalide ou déjà
          utilisé sur un autre appareil sera refusé.
        </p>

        <h2>Article 6 - Conditions d&apos;Accès</h2>
        <h3>6.1 - Accès de base</h3>
        <p>L&apos;accès aux fonctionnalités de base (carte, calendrier, informations) nécessite :</p>
        <ul className="legal-doc-list">
          <li>L&apos;acceptation de la charte HSE</li>
          <li>Une connexion internet</li>
          <li>L&apos;autorisation de géolocalisation (optionnelle)</li>
        </ul>

        <h3>6.2 - Accès aux paris</h3>
        <p>L&apos;accès au système de paris nécessite en plus :</p>
        <ul className="legal-doc-list">
          <li>Un numéro de bracelet participant valide</li>
          <li>L&apos;activation du bracelet sur l&apos;appareil</li>
        </ul>

        <h3>6.3 - Accès Administrateur</h3>
        <p>
          Certaines fonctionnalités sont réservées aux administrateurs autorisés. L&apos;accès à ces fonctionnalités est
          soumis à :
        </p>
        <ul className="legal-doc-list">
          <li>Une authentification sécurisée</li>
          <li>Une autorisation préalable de l&apos;éditeur</li>
          <li>Le respect des procédures de sécurité</li>
        </ul>

        <h2>Article 7 - Utilisation de l&apos;Application</h2>
        <h3>7.1 - Utilisation Conforme</h3>
        <p>
          L&apos;utilisateur s&apos;engage à utiliser l&apos;application de manière conforme à sa destination et aux
          présentes conditions. Il est notamment interdit de :
        </p>
        <ul className="legal-doc-list">
          <li>Utiliser l&apos;application à des fins illégales ou non autorisées</li>
          <li>Tenter de contourner les mesures de sécurité</li>
          <li>Porter atteinte au fonctionnement de l&apos;application</li>
          <li>Utiliser l&apos;application pour diffuser du contenu illicite ou nuisible</li>
          <li>Violer les droits de propriété intellectuelle</li>
          <li>Tenter d&apos;utiliser un numéro de bracelet qui ne vous appartient pas</li>
          <li>Tenter de contourner le système d&apos;activation unique par appareil</li>
        </ul>

        <h3>7.2 - Géolocalisation</h3>
        <p>
          L&apos;utilisation de la géolocalisation est optionnelle et nécessite le consentement explicite de
          l&apos;utilisateur. Cette donnée est :
        </p>
        <ul className="legal-doc-list">
          <li>Stockée localement sur l&apos;appareil</li>
          <li>Non transmise à des tiers</li>
          <li>Utilisée uniquement pour l&apos;affichage de la position sur la carte</li>
        </ul>

        <h2>Article 8 - Signalements VSS</h2>
        <h3>8.1 - Utilisation du Formulaire</h3>
        <p>
          Le formulaire de signalement VSS permet aux utilisateurs de transmettre des signalements aux autorités
          compétentes. L&apos;utilisation de ce service implique :
        </p>
        <ul className="legal-doc-list">
          <li>
            La validation de votre identité (nom, prénom, téléphone) contre vos données participant
          </li>
          <li>L&apos;acceptation de la transmission des données aux destinataires désignés</li>
          <li>La certification de l&apos;exactitude des informations fournies</li>
        </ul>

        <h3>8.2 - Système Anti-Abus</h3>
        <p>
          Pour protéger l&apos;intégrité du système de signalement, des mesures anti-abus sont en place :
        </p>
        <ul className="legal-doc-list">
          <li>Limitation du nombre de signalements par heure</li>
          <li>Détection automatique des contenus suspects</li>
          <li>Blocage temporaire en cas de violations répétées</li>
          <li>Alertes aux administrateurs en cas de tentative d&apos;abus</li>
        </ul>

        <div className="legal-doc-important">
          <strong>Avertissement :</strong> Tout signalement abusif, faux ou malveillant pourra entraîner un blocage
          temporaire ou permanent de l&apos;accès au formulaire, et potentiellement des poursuites judiciaires.
        </div>

        <h3>8.3 - Responsabilité</h3>
        <p>
          L&apos;éditeur ne peut être tenu responsable de l&apos;utilisation ou du traitement des signalements VSS
          transmis via l&apos;application. Ces signalements sont directement transmis aux autorités compétentes.
        </p>

        <h2>Article 9 - Propriété Intellectuelle</h2>
        <h3>9.1 - Contenu de l&apos;Application</h3>
        <p>
          L&apos;ensemble du contenu de l&apos;application (textes, images, logos, design, structure) est protégé par
          le droit d&apos;auteur et appartient à Cartel Nancy ou à ses partenaires.
        </p>

        <h3>9.2 - Utilisation Autorisée</h3>
        <p>
          L&apos;utilisateur peut consulter et utiliser le contenu uniquement dans le cadre de l&apos;utilisation
          normale de l&apos;application. Toute reproduction, distribution ou modification est interdite sans
          autorisation préalable.
        </p>

        <h2>Article 10 - Données Personnelles</h2>
        <p>
          Le traitement des données personnelles est régi par notre{' '}
          <a href="/privacy-policy.html" className="legal-doc-link">
            Politique de Confidentialité
          </a>
          . L&apos;utilisateur dispose des droits suivants :
        </p>
        <ul className="legal-doc-list">
          <li>Droit d&apos;accès à ses données</li>
          <li>Droit de rectification</li>
          <li>Droit d&apos;effacement</li>
          <li>Droit à la portabilité</li>
          <li>Droit d&apos;opposition</li>
        </ul>

        <h2>Article 11 - Responsabilité</h2>
        <h3>11.1 - Limitation de Responsabilité</h3>
        <p>L&apos;éditeur s&apos;efforce de fournir des informations exactes et à jour, mais ne peut garantir :</p>
        <ul className="legal-doc-list">
          <li>L&apos;exactitude complète des informations affichées</li>
          <li>La disponibilité continue de l&apos;application</li>
          <li>L&apos;absence d&apos;erreurs ou d&apos;interruptions</li>
        </ul>

        <h3>11.2 - Exclusion de Garanties</h3>
        <p>
          L&apos;application est fournie &quot;en l&apos;état&quot; sans garantie d&apos;aucune sorte. L&apos;éditeur
          décline toute responsabilité concernant :
        </p>
        <ul className="legal-doc-list">
          <li>Les dommages directs ou indirects résultant de l&apos;utilisation</li>
          <li>La perte de données ou de profits</li>
          <li>L&apos;interruption d&apos;activité</li>
        </ul>

        <h2>Article 12 - Disponibilité du Service</h2>
        <p>
          L&apos;éditeur s&apos;efforce de maintenir l&apos;application accessible 24h/24, 7j/7, mais se réserve le
          droit de :
        </p>
        <ul className="legal-doc-list">
          <li>Interrompre temporairement le service pour maintenance</li>
          <li>Modifier ou supprimer des fonctionnalités</li>
          <li>Suspendre l&apos;accès en cas de non-respect des conditions</li>
        </ul>

        <h2>Article 13 - Sanctions</h2>
        <p>En cas de non-respect des présentes conditions, l&apos;éditeur se réserve le droit de :</p>
        <ul className="legal-doc-list">
          <li>Bloquer temporairement l&apos;accès à certaines fonctionnalités</li>
          <li>Suspendre définitivement l&apos;accès à l&apos;application</li>
          <li>Signaler les comportements illégaux aux autorités compétentes</li>
        </ul>

        <h2>Article 14 - Modifications des Conditions</h2>
        <p>
          L&apos;éditeur se réserve le droit de modifier les présentes conditions à tout moment. Les modifications
          entrent en vigueur dès leur publication dans l&apos;application. L&apos;utilisation continue de
          l&apos;application après modification vaut acceptation des nouvelles conditions.
        </p>

        <h2>Article 15 - Durée et Résiliation</h2>
        <h3>15.1 - Durée</h3>
        <p>
          Les présentes conditions s&apos;appliquent pendant toute la durée d&apos;utilisation de l&apos;application et
          de l&apos;événement Cartel Nancy 2026.
        </p>

        <h3>15.2 - Résiliation</h3>
        <p>
          L&apos;utilisateur peut cesser d&apos;utiliser l&apos;application à tout moment. L&apos;éditeur peut suspendre
          ou résilier l&apos;accès en cas de violation des conditions.
        </p>

        <h2>Article 16 - Droit Applicable et Juridiction</h2>
        <p>
          Les présentes conditions sont régies par le droit français. En cas de litige, les tribunaux français seront
          seuls compétents.
        </p>

          <h2>Article 17 - Dispositions Générales</h2>
        <h3>17.1 - Nullité Partielle</h3>
        <p>
          Si une disposition des présentes conditions est déclarée nulle ou inapplicable, les autres dispositions restent
          en vigueur.
        </p>

        <h3>17.2 - Non-Renonciation</h3>
        <p>
          Le fait pour l&apos;éditeur de ne pas se prévaloir d&apos;une violation des conditions ne constitue pas une
          renonciation à ses droits.
        </p>

        <h3>17.3 - Force Majeure</h3>
        <p>
          L&apos;éditeur ne peut être tenu responsable en cas de force majeure ou d&apos;événements indépendants de sa
          volonté.
        </p>

          <div className="legal-doc-highlight">
            <strong>Acceptation des Conditions</strong>
            <br />
            En utilisant l&apos;application Cartel Nancy et en validant la Charte HSE, vous reconnaissez avoir lu,
            compris et accepté les présentes Conditions Générales d&apos;Utilisation.
          </div>
      </div>
    </div>
  );
};

export default TermsOfServicePage;

