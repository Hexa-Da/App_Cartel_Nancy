import { onRequest } from "firebase-functions/v2/https";
import type { Request } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import { getDatabase } from "firebase-admin/database";

const app = initializeApp();
const messaging = getMessaging(app);
const database = getDatabase(app);

const SECRET = process.env.FUNCTION_SECRET;

function assertAuthorized(req: Request) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ") || auth.substring(7) !== SECRET) {
    throw new Error("Unauthorized");
  }
}

export const subscribeToTopic = onRequest(async (req, res) => {
  try {
    assertAuthorized(req);
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    const { token, topic } = req.body ?? {};
    if (!token || !topic) {
      res.status(400).send("token et topic sont requis");
      return;
    }

    await messaging.subscribeToTopic([token], topic);
    res.status(200).send({ success: true });
  } catch (error) {
    res.status(401).send({ error: (error as Error).message });
  }
});

export const sendChatNotification = onRequest(async (req, res) => {
  try {
    assertAuthorized(req);
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    const { message, sender, topic, timestamp } = req.body ?? {};
    if (!message || !topic) {
      res.status(400).send("message et topic sont requis");
      return;
    }

    await messaging.send({
      topic,
      notification: {
        title: sender ? `Nouveau message de ${sender}` : "Nouveau message",
        body: message,
      },
      data: {
        sender: sender ?? "",
        message,
        timestamp: String(timestamp ?? Date.now()),
      },
    });

    res.status(200).send({ success: true });
  } catch (error) {
    res.status(401).send({ error: (error as Error).message });
  }
});

interface DelegationVotes {
  [sportKey: string]: {
    votes: { [delegation: string]: number };
    totalVotes: number;
    winner: string | null;
  };
}

interface Participant {
  delegation?: string;
  bets?: { [sportKey: string]: string | null };
  [key: string]: unknown;
}

export const syncAllDelegationVotes = onRequest(
  {
    region: 'europe-west1', // Région par défaut, peut être modifiée selon vos besoins
  },
  async (req, res) => {
    try {
      assertAuthorized(req);
      if (req.method !== "POST") {
        res.status(405).send("Method Not Allowed");
        return;
      }

      // Récupérer tous les participants
      const participantsRef = database.ref("participants");
      const participantsSnapshot = await participantsRef.once("value");

      if (!participantsSnapshot.exists()) {
        res.status(200).send({ success: true, message: "Aucun participant trouvé" });
        return;
      }

      const allParticipants = participantsSnapshot.val() as Record<string, Participant>;
      const allDelegations = new Set<string>();
      const delegationVotesMap: { [delegation: string]: DelegationVotes } = {};

      // Première passe : identifier toutes les délégations et initialiser
      Object.values(allParticipants).forEach((participant) => {
        if (participant.delegation) {
          allDelegations.add(participant.delegation);
          if (!delegationVotesMap[participant.delegation]) {
            delegationVotesMap[participant.delegation] = {};
          }
        }
      });

      // Deuxième passe : compter les votes pour chaque délégation
      Object.values(allParticipants).forEach((participant) => {
        if (participant.delegation && participant.bets) {
          const delegation = participant.delegation;
          const newDelegationVotes = delegationVotesMap[delegation];

          // Parcourir les paris de ce participant
          Object.entries(participant.bets).forEach(([sportKey, votedDelegation]) => {
            if (votedDelegation) {
              if (!newDelegationVotes[sportKey]) {
                newDelegationVotes[sportKey] = {
                  votes: {},
                  totalVotes: 0,
                  winner: null
                };
              }

              // Incrémenter le vote pour cette délégation
              if (!newDelegationVotes[sportKey].votes[votedDelegation as string]) {
                newDelegationVotes[sportKey].votes[votedDelegation as string] = 0;
              }
              newDelegationVotes[sportKey].votes[votedDelegation as string]++;
              newDelegationVotes[sportKey].totalVotes++;
            }
          });
        }
      });

      // Charger les winners existants depuis Firebase pour les préserver
      const existingWinnersMap: { [delegation: string]: { [sportKey: string]: string | null } } = {};
      const loadWinnersPromises = Array.from(allDelegations).map(async (delegation) => {
        const delegationBetsRef = database.ref(`delegationBets/${delegation}`);
        const snapshot = await delegationBetsRef.once("value");
        if (snapshot.exists()) {
          const votes = snapshot.val();
          existingWinnersMap[delegation] = {};
          Object.keys(votes).forEach(sportKey => {
            existingWinnersMap[delegation][sportKey] = votes[sportKey].winner || null;
          });
        }
      });
      await Promise.all(loadWinnersPromises);

      // Mettre à jour les votes tout en préservant les winners existants
      const updatePromises: Promise<void>[] = [];

      allDelegations.forEach(delegation => {
        const votes = delegationVotesMap[delegation];
        Object.keys(votes).forEach(sportKey => {
          const sportVotes = votes[sportKey];
          // Préserver le winner existant s'il existe, sinon ne pas définir de winner automatiquement
          if (existingWinnersMap[delegation] && existingWinnersMap[delegation][sportKey] !== undefined) {
            sportVotes.winner = existingWinnersMap[delegation][sportKey];
          } else {
            // Si aucun winner n'existe, ne pas en définir automatiquement
            sportVotes.winner = null;
          }
        });

        // Sauvegarder dans Firebase
        const delegationBetsRef = database.ref(`delegationBets/${delegation}`);
        const updatePromise = delegationBetsRef.set(votes).catch(err => {
          console.error(`Erreur sauvegarde votes délégation ${delegation}:`, err);
        });
        updatePromises.push(updatePromise);
      });

      // Attendre que toutes les sauvegardes soient terminées
      await Promise.all(updatePromises);

      res.status(200).send({ 
        success: true, 
        message: `Votes synchronisés pour ${allDelegations.size} délégation(s)` 
      });
    } catch (error) {
      console.error("Erreur synchronisation votes délégation:", error);
      res.status(500).send({ error: (error as Error).message });
    }
  }
);