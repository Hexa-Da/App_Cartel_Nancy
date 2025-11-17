import { onRequest } from "firebase-functions/v2/https";
import type { Request } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

const app = initializeApp();
const messaging = getMessaging(app);

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