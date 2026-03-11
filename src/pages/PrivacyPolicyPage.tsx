import React from 'react';
import './LegalDocumentPage.css';

const PrivacyPolicyPage: React.FC = () => {
  return (
    <div className="page-content scrollable legal-doc-page">
      <div className="legal-doc-container">
          <h1>Politique de Confidentialité</h1>

          <div className="legal-doc-highlight">
            <strong>Application Cartel Nancy</strong>
            <br />
            Cette politique de confidentialité décrit comment nous collectons, utilisons et protégeons vos informations
            lorsque vous utilisez l&apos;application mobile Cartel Nancy.
          </div>

          <h2>Interprétation et Définitions</h2>

          <h3>Définitions</h3>
        <ul className="legal-doc-list">
          <li>
            <strong>Application</strong> désigne Cartel Nancy, le programme logiciel fourni par la Société.
          </li>
          <li>
            <strong>Société</strong> (désignée par &quot;la Société&quot;, &quot;Nous&quot;, &quot;Notre&quot; dans ce document)
            fait référence à Cartel Nancy.
          </li>
          <li>
            <strong>Pays</strong> fait référence à la France.
          </li>
          <li>
            <strong>Données Personnelles</strong> désignent toute information se rapportant à une personne physique
            identifiée ou identifiable.
          </li>
          <li>
            <strong>Service</strong> fait référence à l&apos;Application Cartel Nancy.
          </li>
          <li>
            <strong>Vous</strong> désigne la personne physique accédant ou utilisant le Service.
          </li>
        </ul>

        <h2>Collecte et Utilisation de Vos Données Personnelles</h2>

        <h3>Types de Données Collectées</h3>

        <h4>Données de Géolocalisation</h4>
        <div className="legal-doc-data-type">
          <strong>Collecte :</strong> Oui (avec votre permission)
          <br />
          <strong>Usage :</strong> Affichage de votre position sur la carte
          <br />
          <strong>Stockage :</strong> Local sur votre appareil
          <br />
          <strong>Partage :</strong> Non
        </div>

        <h4>Préférences Utilisateur</h4>
        <div className="legal-doc-data-type">
          <strong>Collecte :</strong> Oui
          <br />
          <strong>Usage :</strong> Personnalisation de l&apos;expérience
          <br />
          <strong>Stockage :</strong> Local sur votre appareil
          <br />
          <strong>Partage :</strong> Non
        </div>

        <h4>Données d&apos;Utilisation</h4>
        <div className="legal-doc-data-type">
          <strong>Collecte :</strong> Oui (anonymisées)
          <br />
          <strong>Usage :</strong> Amélioration de l&apos;application
          <br />
          <strong>Stockage :</strong> Anonymisé via Google Analytics
          <br />
          <strong>Partage :</strong> Oui (avec Google Analytics)
        </div>

        <h4>Authentification Admin</h4>
        <div className="legal-doc-data-type">
          <strong>Collecte :</strong> Oui (pour les administrateurs)
          <br />
          <strong>Usage :</strong> Accès aux fonctionnalités d&apos;administration
          <br />
          <strong>Stockage :</strong> Local chiffré
          <br />
          <strong>Partage :</strong> Non
        </div>

        <h4>Identifiant d&apos;Appareil (deviceId)</h4>
        <div className="legal-doc-data-type">
          <strong>Collecte :</strong> Oui (lors de l&apos;activation du bracelet)
          <br />
          <strong>Usage :</strong> Garantir l&apos;unicité de l&apos;activation du bracelet (un bracelet = un appareil)
          <br />
          <strong>Stockage :</strong> Local sur votre appareil + Firebase (associé à votre numéro de bracelet)
          <br />
          <strong>Partage :</strong> Non (utilisé uniquement pour la validation interne)
        </div>

        <h4>Numéro de Bracelet Participant</h4>
        <div className="legal-doc-data-type">
          <strong>Collecte :</strong> Oui (dans la section &quot;Faites vos paris&quot;)
          <br />
          <strong>Usage :</strong> Identification du participant, accès aux fonctionnalités de l&apos;événement, paris
          sur les matchs
          <br />
          <strong>Stockage :</strong> Local sur votre appareil + Firebase
          <br />
          <strong>Partage :</strong> Non
        </div>

        <h4>Données d&apos;Activation</h4>
        <div className="legal-doc-data-type">
          <strong>Collecte :</strong> Oui (horodatage de l&apos;activation)
          <br />
          <strong>Usage :</strong> Traçabilité de l&apos;activation du bracelet
          <br />
          <strong>Stockage :</strong> Firebase (champ activatedAt)
          <br />
          <strong>Partage :</strong> Non
        </div>

        <h4>Signalements VSS</h4>
        <div className="legal-doc-data-type">
          <strong>Collecte :</strong> Oui (si vous utilisez le formulaire)
          <br />
          <strong>Usage :</strong> Transmission des signalements aux autorités compétentes
          <br />
          <strong>Stockage :</strong> Envoyé via Telegram Bot
          <br />
          <strong>Partage :</strong> Oui (avec les destinataires désignés)
          <br />
          <strong>Validation :</strong> Vérification de l&apos;identité avec les données participant Firebase
        </div>

        <h3>Utilisation de Vos Données Personnelles</h3>
        <p>La Société peut utiliser les Données Personnelles aux fins suivantes :</p>
        <ul className="legal-doc-list">
          <li>
            <strong>Valider votre identité</strong> en tant que participant à l&apos;événement Cartel Nancy
          </li>
          <li>
            <strong>Garantir l&apos;unicité</strong> de l&apos;utilisation de votre bracelet (un bracelet par appareil)
          </li>
          <li>
            <strong>Vous contacter</strong> concernant les signalements VSS ou les fonctionnalités d&apos;administration
          </li>
          <li>
            <strong>Gérer vos demandes</strong> et signalements
          </li>
          <li>
            <strong>Améliorer notre Service</strong> grâce à l&apos;analyse des données d&apos;utilisation
            anonymisées
          </li>
          <li>
            <strong>Prévenir les abus</strong> via le système anti-spam des signalements VSS
          </li>
        </ul>

        <h3>Partage de Vos Informations</h3>
        <p>Nous pouvons partager vos informations personnelles dans les situations suivantes :</p>
        <ul className="legal-doc-list">
          <li>
            <strong>Avec les Fournisseurs de Services :</strong> Google Analytics (données anonymisées), Telegram
            (signalements VSS)
          </li>
          <li>
            <strong>Pour les signalements VSS :</strong> Transmission aux autorités compétentes selon votre demande
          </li>
        </ul>

        <h2>Services Tiers Utilisés</h2>
        <div className="legal-doc-service-list">
          <h4>Firebase</h4>
          <p>
            <strong>Usage :</strong> Base de données pour les événements publics et validation des participants
            <br />
            <strong>Données :</strong> Données publiques des événements, numéros de bracelet, deviceId d&apos;activation
            <br />
            <strong>Politique :</strong>{' '}
            <a
              href="https://firebase.google.com/support/privacy"
              target="_blank"
              rel="noreferrer"
              className="legal-doc-link"
            >
              Politique Firebase
            </a>
          </p>

          <h4>Google Analytics</h4>
          <p>
            <strong>Usage :</strong> Analyse d&apos;utilisation anonymisée
            <br />
            <strong>Données :</strong> Données d&apos;utilisation anonymisées
            <br />
            <strong>Politique :</strong>{' '}
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noreferrer"
              className="legal-doc-link"
            >
              Politique Google
            </a>
          </p>

          <h4>Google Maps</h4>
          <p>
            <strong>Usage :</strong> Intégration cartographique
            <br />
            <strong>Données :</strong> Redirection externe (aucune donnée collectée)
            <br />
            <strong>Politique :</strong>{' '}
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noreferrer"
              className="legal-doc-link"
            >
              Politique Google
            </a>
          </p>

          <h4>Nominatim OpenStreetMap</h4>
          <p>
            <strong>Usage :</strong> Géocodage des adresses
            <br />
            <strong>Données :</strong> Adresses pour conversion en coordonnées GPS
            <br />
            <strong>Politique :</strong>{' '}
            <a
              href="https://operations.osmfoundation.org/policies/nominatim/"
              target="_blank"
              rel="noreferrer"
              className="legal-doc-link"
            >
              Politique OpenStreetMap
            </a>
          </p>

          <h4>Telegram Bot</h4>
          <p>
            <strong>Usage :</strong> Notification des signalements VSS et alertes anti-spam
            <br />
            <strong>Données :</strong> Contenu des signalements VSS, alertes de tentatives d&apos;abus
            <br />
            <strong>Politique :</strong>{' '}
            <a
              href="https://telegram.org/privacy"
              target="_blank"
              rel="noreferrer"
              className="legal-doc-link"
            >
              Politique Telegram
            </a>
          </p>
        </div>

        <h2>Conservation de Vos Données Personnelles</h2>
        <ul className="legal-doc-list">
          <li>
            <strong>Données locales :</strong> Supprimées lors de la désinstallation de l&apos;application
          </li>
          <li>
            <strong>Données d&apos;analyse :</strong> Anonymisées et conservées selon les politiques Google Analytics
          </li>
          <li>
            <strong>Données serveur :</strong> deviceId et données d&apos;activation conservées pendant la durée de
            l&apos;événement
          </li>
          <li>
            <strong>Signalements VSS :</strong> Transmis via Telegram aux autorités compétentes
          </li>
          <li>
            <strong>Données participant :</strong> Conservées pendant la durée de l&apos;événement Cartel Nancy 2026
          </li>
        </ul>

        <h2>Sécurité de Vos Données Personnelles</h2>
        <p>
          La sécurité de vos Données Personnelles est importante pour nous. Nous utilisons des moyens commercialement
          raisonnables pour protéger vos Données Personnelles, notamment :
        </p>
        <ul className="legal-doc-list">
          <li>Stockage local chiffré pour les données sensibles</li>
          <li>Anonymisation des données d&apos;analyse</li>
          <li>Transmission sécurisée via HTTPS</li>
          <li>Validation de l&apos;identité avant envoi de signalement VSS</li>
          <li>Système anti-spam pour prévenir les abus</li>
          <li>Activation unique par appareil pour éviter les usurpations</li>
        </ul>

        <h2>Confidentialité des Enfants</h2>
        <p>
          Notre Service ne s&apos;adresse pas aux personnes de moins de 13 ans. Nous ne collectons pas sciemment
          d&apos;informations personnelles identifiables auprès de personnes de moins de 13 ans.
        </p>

        <h2>Liens vers d&apos;Autres Sites Web</h2>
        <p>
          Notre Service peut contenir des liens vers d&apos;autres sites web. Nous n&apos;avons aucun contrôle sur et
          n&apos;assumons aucune responsabilité quant au contenu, aux politiques de confidentialité ou aux pratiques de
          tout site tiers.
        </p>

        <h2>Modifications de cette Politique de Confidentialité</h2>
        <p>
          Nous pouvons mettre à jour notre Politique de Confidentialité de temps à autre. Nous vous informerons de tout
          changement en publiant la nouvelle Politique de Confidentialité sur cette page et en mettant à jour la date de
          &quot;Dernière mise à jour&quot;.
        </p>

        <h2>Conformité Réglementaire</h2>
        <p>Cette politique de confidentialité est conforme au :</p>
        <ul className="legal-doc-list">
          <li>RGPD (Règlement Général sur la Protection des Données)</li>
          <li>Loi française sur la protection des données</li>
          <li>Principes de minimisation des données</li>
          <li>Droits des utilisateurs (accès, rectification, effacement, portabilité, objection)</li>
        </ul>

          <div className="legal-doc-highlight">
            <strong>Engagement de Confidentialité</strong>
            <br />
            Cartel Nancy s&apos;engage à protéger votre vie privée et à respecter vos droits en matière de protection
            des données. Cette politique est transparente et vous donne un contrôle total sur vos informations
            personnelles.
          </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;

