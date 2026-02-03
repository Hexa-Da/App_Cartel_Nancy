import { onRequest } from "firebase-functions/v2/https";
import { beforeUserCreated } from "firebase-functions/v2/identity"; // Ajouté
import { HttpsError } from "firebase-functions/v2/https"; // Ajouté
import { defineSecret } from "firebase-functions/params";
import type { Request } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import { getDatabase } from "firebase-admin/database";

const app = initializeApp();
const messaging = getMessaging(app);
const database = getDatabase(app);

// --- FONCTION DE BLOCAGE (AUTHENTIFICATION) ---

/**
 * Cette fonction empêche la création d'un compte si l'email n'est pas autorisé.
 * Elle s'exécute AVANT que l'utilisateur ne soit ajouté à Firebase Auth.
 */
export const beforecreate = beforeUserCreated((event) => {
  const user = event.data;
  const email = user?.email;

  // Liste des emails autorisés
  const ALLOWED_EMAILS = [
    "pap71530@outlook.com",
    // Ajoute d'autres emails ici
  ];

  if (!email || !ALLOWED_EMAILS.includes(email)) {
    console.log(`[Auth Blocked] Tentative d'inscription refusée pour : ${email}`);
    throw new HttpsError(
      "permission-denied",
      "Accès non autorisé : votre email n'est pas sur la liste blanche."
    );
  }

  console.log(`[Auth Allowed] Nouvel utilisateur autorisé : ${email}`);
});

// --- CONFIGURATION ET UTILITAIRES ---

const functionSecret = defineSecret("FUNCTION_SECRET");

function assertAuthorized(req: Request, secret: string) {
  if (!secret) {
    throw new Error("FUNCTION_SECRET non configuré côté serveur");
  }
  
  const auth = req.headers.authorization;
  if (!auth) {
    throw new Error("Header Authorization manquant");
  }
  
  if (!auth.startsWith("Bearer ")) {
    throw new Error("Format Authorization invalide (attendu: Bearer <token>)");
  }
  
  const token = auth.substring(7);
  if (token !== secret) {
    throw new Error("Token d'authentification invalide");
  }
}

// --- VOS FONCTIONS EXISTANTES ---

export const subscribeToTopic = onRequest(
  {
    region: 'europe-west1',
    cors: true,
    secrets: [functionSecret],
  },
  async (req, res) => {
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    try {
      assertAuthorized(req, functionSecret.value());
      if (req.method !== "POST") {
        res.status(405).send("Method Not Allowed");
        return;
      }

      const { token, topic } = req.body ?? {};
      if (!token || !topic) {
        res.status(400).send("token et topic sont requis");
        return;
      }

      if (typeof token !== 'string' || token.length < 10) {
        res.status(400).send({ error: "Format de token invalide" });
        return;
      }

      if (typeof topic !== 'string' || topic.length === 0) {
        res.status(400).send({ error: "Format de topic invalide" });
        return;
      }

      try {
        await messaging.subscribeToTopic([token], topic);
        res.status(200).send({ success: true, message: `Abonné au topic ${topic}` });
      } catch (fcmError) {
        const fcmErrorMessage = (fcmError as Error).message;
        console.error(`[subscribeToTopic] Erreur FCM lors de l'abonnement:`, fcmErrorMessage);
        if (fcmErrorMessage.includes('invalid-argument') || fcmErrorMessage.includes('Invalid')) {
          res.status(400).send({ error: "Token ou topic invalide", details: fcmErrorMessage });
        } else if (fcmErrorMessage.includes('unavailable') || fcmErrorMessage.includes('timeout')) {
          res.status(503).send({ error: "Service FCM temporairement indisponible", details: fcmErrorMessage });
        } else {
          res.status(500).send({ error: "Erreur lors de l'abonnement", details: fcmErrorMessage });
        }
      }
    } catch (error) {
      const errorMessage = (error as Error).message;
      console.error('[subscribeToTopic] Erreur générale:', errorMessage);
      res.status(500).send({ error: errorMessage });
    }
  }
);

export const unsubscribeFromTopic = onRequest(
  {
    region: 'europe-west1',
    cors: true,
    secrets: [functionSecret],
  },
  async (req, res) => {
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    try {
      assertAuthorized(req, functionSecret.value());
      if (req.method !== "POST") {
        res.status(405).send("Method Not Allowed");
        return;
      }

      const { token, topic } = req.body ?? {};
      if (!token || !topic) {
        res.status(400).send("token et topic sont requis");
        return;
      }

      if (typeof token !== 'string' || token.length < 10) {
        res.status(400).send({ error: "Format de token invalide" });
        return;
      }
      
      try {
        await messaging.unsubscribeFromTopic([token], topic);
        res.status(200).send({ success: true, message: `Désabonné du topic ${topic}` });
      } catch (fcmError) {
        const fcmErrorMessage = (fcmError as Error).message;
        console.error(`[unsubscribeFromTopic] Erreur FCM lors du désabonnement:`, fcmErrorMessage);
        if (fcmErrorMessage.includes('invalid-argument') || fcmErrorMessage.includes('Invalid')) {
          res.status(400).send({ error: "Token ou topic invalide", details: fcmErrorMessage });
        } else {
          res.status(500).send({ error: "Erreur lors du désabonnement", details: fcmErrorMessage });
        }
      }
    } catch (error) {
      const errorMessage = (error as Error).message;
      console.error('[unsubscribeFromTopic] Erreur générale:', errorMessage);
      res.status(500).send({ error: errorMessage });
    }
  }
);

export const sendChatNotification = onRequest(
  {
    region: 'europe-west1',
    cors: true,
    secrets: [functionSecret],
  },
  async (req, res) => {
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    try {
      assertAuthorized(req, functionSecret.value());
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
          title: sender ? `Nouveau message : ${sender}` : "Nouveau message",
          body: message,
        },
        android: {
          notification: {
            icon: 'ic_notification',
            color: '#000000',
            priority: 'high' as const,
            sound: 'default',
            channelId: 'default',
          },
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title: sender ? `Nouveau message : ${sender}` : "Nouveau message",
                body: message,
              },
              sound: 'default',
              badge: 1,
            },
          },
        },
        data: {
          sender: sender ?? "",
          message,
          timestamp: String(timestamp ?? Date.now()),
        },
      });

      res.status(200).send({ success: true });
    } catch (error) {
      const errorMessage = (error as Error).message;
      console.error('[sendChatNotification] Erreur:', errorMessage);
      res.status(500).send({ error: errorMessage });
    }
  }
);

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
    region: 'europe-west1',
    cors: true,
    secrets: [functionSecret],
  },
  async (req, res) => {
    try {
      assertAuthorized(req, functionSecret.value());
      if (req.method !== "POST") {
        res.status(405).send("Method Not Allowed");
        return;
      }

      const participantsRef = database.ref("participants");
      const participantsSnapshot = await participantsRef.once("value");

      if (!participantsSnapshot.exists()) {
        res.status(200).send({ success: true, message: "Aucun participant trouvé" });
        return;
      }

      const allParticipants = participantsSnapshot.val() as Record<string, Participant>;
      const allDelegations = new Set<string>();
      const delegationVotesMap: { [delegation: string]: DelegationVotes } = {};

      Object.values(allParticipants).forEach((participant) => {
        if (participant.delegation) {
          allDelegations.add(participant.delegation);
          if (!delegationVotesMap[participant.delegation]) {
            delegationVotesMap[participant.delegation] = {};
          }
        }
      });

      Object.values(allParticipants).forEach((participant) => {
        if (participant.delegation && participant.bets) {
          const delegation = participant.delegation;
          const newDelegationVotes = delegationVotesMap[delegation];

          Object.entries(participant.bets).forEach(([sportKey, votedDelegation]) => {
            if (votedDelegation) {
              if (!newDelegationVotes[sportKey]) {
                newDelegationVotes[sportKey] = {
                  votes: {},
                  totalVotes: 0,
                  winner: null
                };
              }

              if (!newDelegationVotes[sportKey].votes[votedDelegation as string]) {
                newDelegationVotes[sportKey].votes[votedDelegation as string] = 0;
              }
              newDelegationVotes[sportKey].votes[votedDelegation as string]++;
              newDelegationVotes[sportKey].totalVotes++;
            }
          });
        }
      });

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

      const updatePromises: Promise<void>[] = [];

      allDelegations.forEach(delegation => {
        const votes = delegationVotesMap[delegation];
        Object.keys(votes).forEach(sportKey => {
          const sportVotes = votes[sportKey];
          if (existingWinnersMap[delegation] && existingWinnersMap[delegation][sportKey] !== undefined) {
            sportVotes.winner = existingWinnersMap[delegation][sportKey];
          } else {
            sportVotes.winner = null;
          }
        });

        const delegationBetsRef = database.ref(`delegationBets/${delegation}`);
        const updatePromise = delegationBetsRef.set(votes).catch(err => {
          console.error(`Erreur sauvegarde votes délégation ${delegation}:`, err);
        });
        updatePromises.push(updatePromise);
      });

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