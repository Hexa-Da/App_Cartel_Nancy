import React from 'react';
import './Terms.css';

const Terms: React.FC = () => {
  return (
    <div className="terms-page-container">
      <div className="terms-header">
        <h1>Conditions d'Utilisation - Cartel Nancy 2026</h1>
        <p>Règles d'utilisation de l'application</p>
      </div>

      <div className="terms-content">
        <section>
          <h2>1. Acceptation des Conditions</h2>
          <p>
            En utilisant l'application "Cartel Nancy", vous acceptez d'être lié par ces conditions d'utilisation. 
            Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser l'application.
          </p>
        </section>

        <section>
          <h2>2. Description du Service</h2>
          <p>
            "Cartel Nancy" est une application mobile et web qui permet aux utilisateurs de :
          </p>
          <ul>
            <li>Consulter les informations sur les événements sportifs et culturels qui se déroulent à Nancy lors du Cartel 2026</li>
            <li>Localiser les lieux d'hébergement, restaurants et points d'intérêt selon les préférences de l'utilisateur</li>
            <li>Accéder aux informations pratiques et de transport mise a disposition par l'oganisation</li>
            <li>Partager et consulter des informations en temps réel</li>
          </ul>
        </section>

        <section>
          <h2>3. Compte Utilisateur</h2>
          <p>
            Pour editer certaines informations de l'application, les administrateurs doivent se connecter avec leur compte Google :
          </p>
          <ul>
            <li>Les administrateurs sont responsables de maintenir la confidentialité de leur compte</li>
            <li>Les administrateurs sont responsables de toutes les activités effectuées avec leur compte</li>
            <li>Les administrateurs doivent nous informer immédiatement de toute utilisation non autorisée</li>
            <li>Nous nous réservons le droit de suspendre ou supprimer le compte d'un administrateur</li>
          </ul>
        </section>

        <section>
          <h2>4. Utilisation Acceptable</h2>
          <p>
            Vous vous engagez à utiliser l'application de manière appropriée et à ne pas :
          </p>
          <ul>
            <li>Publier du contenu diffamatoire, offensant ou inapproprié (pour les administrateurs)</li>
            <li>Tenter d'accéder de manière non autorisée aux systèmes de l'application</li>
            <li>Utiliser l'application à des fins commerciales non autorisées</li>
            <li>Interférer avec le bon fonctionnement de l'application</li>
            <li>Violer les droits de propriété intellectuelle</li>
          </ul>
        </section>

        <section>
          <h2>5. Contact</h2>
          <p>
            Pour toute question concernant ces conditions d'utilisation, contactez-nous à : 
            <strong>contact@cartelnancy.fr</strong>
          </p>
        </section>
      </div>
    </div>
  );
};

export default Terms;
