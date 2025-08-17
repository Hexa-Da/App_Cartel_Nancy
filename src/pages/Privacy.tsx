import React from 'react';
import './Privacy.css';

const Privacy: React.FC = () => {
  return (
    <div className="privacy-page-container">
      <div className="privacy-header">
        <h1>Politique de Confidentialité - Cartel Nancy 2026</h1>
        <p>Protection de vos données personnelles</p>
      </div>

      <div className="privacy-content">
        <section>
          <h2>1. Collecte des Informations</h2>
          <p>
            L'application "Cartel Nancy" collecte uniquement les informations nécessaires au bon fonctionnement du service :
          </p>
          <ul>
            <li>Informations de compte Google (email, nom) pour l'authentification des administrateurs</li>
            <li>Position géographique (avec votre consentement) pour vous situer sur la carte</li>
            <li>Données de navigation et d'utilisation sur l'application pour améliorer l'expérience utilisateur (exemple : vos paramètre de préférences)</li>
          </ul>
        </section>

        <section>
          <h2>2. Utilisation des Informations</h2>
          <p>
            Vos informations sont utilisées exclusivement pour :
          </p>
          <ul>
            <li>Permettre au administrateur de se connecter et de modifier les données de l'application</li>
            <li>Afficher les événements et lieux d'intérêt pour chaque utilisateur</li>
            <li>Améliorer les fonctionnalités de l'application</li>
          </ul>
        </section>

        <section>
          <h2>3. Partage des Informations</h2>
          <p>
            Nous ne vendons, n'échangeons ni ne louons vos informations personnelles à des tiers. 
            Les données peuvent être partagées uniquement dans le cas suivant :
          </p>
          <ul>
            <li>Avec votre consentement explicite (exmple : Formulaire VSS)</li>
          </ul>
        </section>

        <section>
          <h2>4. Sécurité des Données</h2>
          <p>
            Nous mettons en place des mesures de sécurité appropriées pour protéger vos informations :
          </p>
          <ul>
            <li>Accès restreint aux données personnelles</li>
          </ul>
        </section>

        <section>
          <h2>5. Vos Droits</h2>
          <p>
            Conformément au RGPD, vous disposez des droits suivants :
          </p>
          <ul>
            <li>Droit d'accès à vos données personnelles</li>
            <li>Droit de rectification des données inexactes</li>
            <li>Droit de suppression de vos données</li>
            <li>Droit de limitation du traitement</li>
            <li>Droit à la portabilité de vos données</li>
          </ul>
        </section>

        <section>
          <h2>6. Contact</h2>
          <p>
            Pour toute question concernant cette politique de confidentialité, contactez-nous à : 
            <strong>contact@cartelnancy.fr</strong>
          </p>
        </section>

        <section>
          <h2>7. Modifications</h2>
          <p>
            Cette politique de confidentialité peut être mise à jour. Nous vous informerons de tout changement important.
          </p>
        </section>
      </div>
    </div>
  );
};

export default Privacy;
