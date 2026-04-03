import React from 'react';

interface IHSECharterPopupContentProps {
  hasAcceptedEngagement: boolean;
  onToggleEngagement: (next: boolean) => void;
  onOpenBraceletModal: () => void;
  braceletNumber: string;
}

const HSECharterPopupContent: React.FC<IHSECharterPopupContentProps> = ({
  hasAcceptedEngagement,
  onToggleEngagement,
  onOpenBraceletModal,
  braceletNumber
}) => {
  return (
    <>
      <section className="hse-section">
        <h3>Tes engagements</h3>
        <p>
          En t'inscrivant au Cartel Nancy, tu rejoins une communauté respectueuse et tu t'engages sur les points :
        </p>
      </section>

      <section className="hse-section">
        <h3>1. Respect et consentement</h3>
        <ul>
          <li>
            <strong>Zéro discrimination :</strong> je m'interdis tout propos ou comportement sexiste, raciste, LGBTphobe, handiphobe ou
            discriminatoire. L'humour n'est jamais une excuse.
          </li>
          <li>
            <strong>Consentement :</strong> je respecte le consentement d'autrui : libre, éclairé, enthousiaste et recevable à tout
            moment. Un “non” est un “non”.
          </li>
          <li>
            <strong>Fair-play :</strong> je m'engage à respecter l'éthique sportive et l'équité, sur le terrain comme en tribune.
          </li>
          <li>
            <strong>Sobriété et sécurité :</strong> je reconnais que l'usage de drogues est répréhensible par la loi. Je m'engage
            à respecter les consignes de sécurité liées à l'alcool et aux comportements à risque.
          </li>
          <li>
            <strong>Respect du matériel :</strong> J'utilise le matériel de prévention (ou autre) de manière responsable
          </li>
        </ul>
      </section>

      <section className="hse-section">
        <h3>2. Thème et acteur·rice</h3>
        <ul>
          <li>
            <strong>Solidarité :</strong> si je suis témoin d'une situation de violence, de harcèlement ou d'un malaise, j'alerte un
            membre du staff ou je me rends vers un espace d'aide identifié.
          </li>
          <li>
            <strong>Dispositifs :</strong> je m'engage à respecter l'organisation et les dispositifs de prévention/signalement mis
            en place.
          </li>
        </ul>
      </section>

      <section className="hse-section">
        <h3>Barème des sanctions internes</h3>
        <table className="hse-sanctions-table" aria-label="Barème des sanctions internes">
          <thead>
            <tr>
              <th>Infraction</th>
              <th>Sanction individuelle (S.I.)</th>
              <th>Sanction collective (Délégation)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Outrage sexisteur/sexuel</td>
              <td>Exclusion immédiate de l'activité en cours</td>
              <td>Perte de points au classement</td>
            </tr>
            <tr>
              <td>Injure sexiste et/ou discriminatoire</td>
              <td>Exclusion de l'activité (Récidive = Exclusion
                définitive)</td>
              <td>Perte de points au classement</td>
            </tr>
            <tr>
              <td>Discrimination</td>
              <td>Exclusion pendant 24h sports/soirées</td>
              <td>Perte de points au classement</td>
            </tr>
            <tr>
              <td>Harcèlement sexuel / Exhibition sexuelle / Bizutage</td>
              <td>Exclusion définitive du Cartel</td>
              <td>Disqualification de la délégation</td>
            </tr>
            <tr>
              <td>Agression sexuelle / Administration de substances</td>
              <td>Exclusion définitive immédiate</td>
              <td>Disqualification de la délégation</td>
            </tr>
            <tr>
              <td>Viol</td>
              <td>Exclusion définitive immédiate</td>
              <td>Disqualification de la délégation</td>
            </tr>
          </tbody>
        </table>
        <p className="hse-sanctions-note">
          La liste ci-dessus n'est pas exhaustive : l'association se réserve le droit de sanctionner tout manquement aux règles et
          consignes, pouvant aller jusqu'à l'exclusion de l'auteur·ice.
        </p>
        <p className="hse-sanctions-note">
        Nous rappelons que l’ensemble de ces actes cités ci-dessus sont pénalement répréhensibles. Si la victime en formule la volonté, 
        une plainte pourra être déposée avec le soutien et l’accompagnement de l’association.
        </p>
      </section>

      <section className="hse-section hse-final">
        <h3>J'AI LU ET JE M'ENGAGE</h3>
        <p>
          Je souhaite participer au Cartel Nancy 2026 et je m'engage à en respecter les principes de la charte. Je reconnais que
          le non-respect de ces règles peut conduire à mon exclusion et pénaliser ma délégation.
        </p>
        <div className="hse-checkbox-container acceptance-section">
          <input
            type="checkbox"
            id="hse-engagement-checkbox"
            className="hse-checkbox"
            checked={hasAcceptedEngagement}
            onChange={(e) => onToggleEngagement(e.target.checked)}
            aria-describedby="engagement-desc"
          />
          <label htmlFor="hse-engagement-checkbox" className="hse-checkbox-label" id="engagement-desc">
            J'accepte et je m'engage à respecter la charte complète de l'association.
          </label>
        </div>
      </section>

      <section className="hse-section bracelet-section">
        <h3>Numéro de bracelet</h3>
        <p className="bracelet-info">Veuillez saisir votre numéro de bracelet pour valider la charte.</p>
        <button type="button" className="bracelet-open-button" onClick={onOpenBraceletModal}>
          {braceletNumber ? braceletNumber : 'Saisir le numéro de bracelet'}
        </button>
      </section>
    </>
  );
};

export default HSECharterPopupContent;

