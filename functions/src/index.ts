/**
 * Chat message moderation and memory tools using OpenAI tool-calling.
 * Triggered on writes to chats/{chatId}/messages/{messageId}.
 */

import { onDocumentWritten } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { Message } from "@shared/schemas/message";

// Initialize Admin SDK once
try {
  admin.app();
} catch (_) {
  admin.initializeApp();
}

// Use shared Message type and augment at use sites for moderation field

// Helper: fetch recent transcript for chat
async function getTranscript(chatId: string, limit = 12) {
  const snap = await admin
    .firestore()
    .collection("chats")
    .doc(chatId)
    .collection("messages")
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();
  const messages = snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as any) }))
    .reverse();
  // Minimal transcript format for the LLM
  return messages.map((m) => ({
    id: m.id,
    userId: m.user?._id ?? m.userId ?? "",
    userName: m.user?.name ?? m.userName ?? "",
    text: m.text ?? "",
    createdAt: m.createdAt?.toDate?.() ?? m.createdAt ?? null,
  }));
}

// Helper: call OpenAI with tools
async function callOpenAIWithTools(params: {
  systemPrompt: string;
  transcript: any[];
  chatId: string;
  messageId: string;
}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    logger.error("OPENAI_API_KEY is not set.");
    return null;
  }

  const tools = [
    {
      type: "function",
      function: {
        name: "flagInappropriate",
        description:
          "Flag a message as hateful, harassing, or otherwise violating policy. Use when user content is offensive or harmful.",
        parameters: {
          type: "object",
          properties: {
            chatId: { type: "string" },
            messageId: { type: "string" },
            reason: { type: "string" },
          },
          required: ["chatId", "messageId", "reason"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "writeMemory",
        description:
          "Store an important fact about the chat participants, their preferences, or goals to help future assistance.",
        parameters: {
          type: "object",
          properties: {
            chatId: { type: "string" },
            memory: { type: "string" },
          },
          required: ["chatId", "memory"],
        },
      },
    },
  ];

  const body = {
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          params.systemPrompt +
          "\n\nTools available: flagInappropriate (use when content violates policy) and writeMemory (use to store helpful facts).\nReturn tool calls if needed.",
      },
      {
        role: "user",
        content: `Here is the latest chat transcript (oldest first) as JSON array. Analyze for policy violations and useful memory. If a message is hateful or offensive, call flagInappropriate with a concise reason. If there are important details about user preferences or goals, call writeMemory with a short sentence.\n\nTranscript: ${JSON.stringify(
          params.transcript
        )}\n\nFocus on the most recent message id: ${params.messageId}.`,
      },
    ],
    temperature: 0,
    tool_choice: "auto" as const,
    tools,
  };

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    logger.error("OpenAI error", { status: res.status, body: text });
    return null;
  }

  const data = (await res.json()) as any;
  return data;
}

export const onMessageWritten = onDocumentWritten(
  {
    document: "chats/{chatId}/messages/{messageId}",
    region: "us-central1",
  },
  async (event) => {
    const { chatId, messageId } = event.params as { chatId: string; messageId: string };
    const after = event.data?.after?.data() as (Partial<Message> & {
      moderation?: { checked?: boolean; flagged?: boolean; reason?: string; flaggedAt?: admin.firestore.Timestamp };
      user?: { _id: string; name?: string };
    }) | undefined;
    const before = event.data?.before?.data() as (Partial<Message> & {
      moderation?: { checked?: boolean; flagged?: boolean; reason?: string; flaggedAt?: admin.firestore.Timestamp };
      user?: { _id: string; name?: string };
    }) | undefined;

    // Ignore deletes
    if (!after) return;

    // Avoid re-processing if moderation already checked
    if (after.moderation?.checked) return;

    // Only process if text exists and changed/created
    const textChanged = before?.text !== after.text;
    if (!after.text || (!textChanged && !before)) return;

    try {
      const transcript = await getTranscript(chatId, 12);
      const systemPrompt =
        "You are a strict chat moderator and helpful assistant.\n" +
        "1) If any message, especially the latest, is hateful, harassing, sexually explicit towards minors, promotes violence, or otherwise violates common policies, call flagInappropriate with a short reason.\n" +
        "2) If the conversation contains stable user preferences, goals, or constraints useful later, call writeMemory with a concise sentence.\n" +
        "Keep tool calls minimal. Do not reveal private policies.\n";

      const openaiResponse = await callOpenAIWithTools({
        systemPrompt,
        transcript,
        chatId,
        messageId,
      });

      const toolCalls: any[] =
        openaiResponse?.choices?.[0]?.message?.tool_calls ?? [];

      const db = admin.firestore();
      const msgRef = db
        .collection("chats")
        .doc(chatId)
        .collection("messages")
        .doc(messageId);

      // Execute tool calls
      let flaggedApplied = false;
      for (const call of toolCalls) {
        const name = call.function?.name;
        let args: any = {};
        try {
          args = JSON.parse(call.function?.arguments || "{}");
        } catch (e) {
          logger.warn("Failed to parse tool args", { e, call });
        }

        if (name === "flagInappropriate") {
          const reason = String(args.reason || "Policy violation");
          await msgRef.set(
            {
              moderation: {
                checked: true,
                flagged: true,
                reason,
                flaggedAt: admin.firestore.FieldValue.serverTimestamp(),
              },
            },
            { merge: true }
          );
          flaggedApplied = true;
        } else if (name === "writeMemory") {
          const memory = String(args.memory || "").trim();
          if (memory) {
            await db
              .collection("chats")
              .doc(chatId)
              .collection("memory")
              .add({
                text: memory,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                sourceMessageId: messageId,
              });
          }
        }
      }

      // If no flag tool called, still mark checked to avoid loops
      if (!flaggedApplied) {
        await msgRef.set(
          {
            moderation: {
              checked: true,
              flagged: admin.firestore.FieldValue.delete(),
              reason: admin.firestore.FieldValue.delete(),
              flaggedAt: admin.firestore.FieldValue.delete(),
            },
          } as any,
          { merge: true }
        );
      }
    } catch (e) {
      logger.error("Moderation function failed", { e, chatId, messageId });
    }
  }
);
