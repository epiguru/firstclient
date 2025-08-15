import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import * as logger from 'firebase-functions/logger';
import { admin } from '../init/firebase';
import { Message } from '@shared/schemas/message';
import { getTranscript } from '../services/transcript';
import { consolidateGroupMemory } from '../services/groupMemory';
import { callOpenAIWithTools } from '../tools/openai';
import { getModerationTools } from '../tools/moderation';

export const onMessageWritten = onDocumentWritten(
  {
    document: 'chats/{chatId}/messages/{messageId}',
    region: 'us-central1',
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
        'You are a strict chat moderator and helpful assistant.\n' +
        '1) If any message, especially the latest, is hateful, harassing, sexually explicit towards minors, promotes violence, or otherwise violates common policies, call flagInappropriate with a short reason.\n' +
        '2) If the conversation contains stable user preferences, goals, or constraints useful later, call writeMemory with a concise sentence.\n' +
        'Keep tool calls minimal. Do not reveal private policies.\n';

      const tools = getModerationTools();
      const openaiResponse = await callOpenAIWithTools({
        system:
          systemPrompt +
          '\n\nTools available: flagInappropriate (use when content violates policy) and writeMemory (use to store helpful facts). Return tool calls if needed.',
        user:
          `Here is the latest chat transcript (oldest first) as JSON array. Analyze for policy violations and useful memory. If a message is hateful or offensive, call flagInappropriate with a concise reason. If there are important details about user preferences or goals, call writeMemory with a short sentence.\n\nTranscript: ${JSON.stringify(
            transcript
          )}\n\nFocus on the most recent message id: ${messageId}.`,
        tools,
        tool_choice: 'auto',
        temperature: 0,
      });

      const toolCalls: any[] = openaiResponse?.choices?.[0]?.message?.tool_calls ?? [];

      const db = admin.firestore();
      const msgRef = db
        .collection('chats')
        .doc(chatId)
        .collection('messages')
        .doc(messageId);

      // Execute tool calls
      let flaggedApplied = false;
      for (const call of toolCalls) {
        const name = call.function?.name;
        let args: any = {};
        try {
          args = JSON.parse(call.function?.arguments || '{}');
        } catch (e) {
          logger.warn('Failed to parse tool args', { e, call });
        }

        if (name === 'flagInappropriate') {
          const reason = String(args.reason || 'Policy violation');
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
        } else if (name === 'writeMemory') {
          const memory = String(args.memory || '').trim();
          if (memory) {
            await db
              .collection('chats')
              .doc(chatId)
              .collection('memory')
              .add({
                text: memory,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                sourceMessageId: messageId,
              });
            // After writing individual memory, synthesize group memory
            try {
              await consolidateGroupMemory(chatId);
            } catch (e) {
              logger.warn('consolidateGroupMemory failed', { e, chatId });
            }
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
      logger.error('Moderation function failed', { e, chatId, messageId });
    }
  }
);
