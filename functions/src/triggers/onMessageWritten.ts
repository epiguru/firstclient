import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import * as logger from 'firebase-functions/logger';
import { db } from '../admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { Message } from '@shared/schemas/message';
import { getTranscript } from '../services/transcript';
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
      moderation?: { checked?: boolean; flagged?: boolean; reason?: string; flaggedAt?: Timestamp };
      user?: { _id: string; name?: string };
    }) | undefined;
    const before = event.data?.before?.data() as (Partial<Message> & {
      moderation?: { checked?: boolean; flagged?: boolean; reason?: string; flaggedAt?: Timestamp };
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
        '1) Evaluate ONLY the most recent message (the one whose id is provided). If and only if THIS message is hateful, harassing, sexually explicit towards minors, promotes violence, or otherwise violates policy, call flagInappropriate with a short reason. Do NOT flag due to earlier messages.\n' +
        '2) If the conversation contains stable user preferences, goals, or constraints useful later, call writeMemory with a concise sentence.\n' +
        'Keep tool calls minimal. Do not reveal private policies.\n';

      const tools = getModerationTools();
      const openaiResponse = await callOpenAIWithTools({
        system:
          systemPrompt +
          '\n\nTools available: flagInappropriate (use when content violates policy) and writeMemory (use to store helpful facts). Return tool calls if needed.',
        user:
          `Here is the latest chat transcript (oldest first) as JSON array. Analyze ONLY the last message for policy violations. If and only if the LAST message is hateful or offensive, call flagInappropriate with a concise reason. If there are important details about user preferences or goals, call writeMemory with a short sentence.\n\nTranscript: ${JSON.stringify(
            transcript
          )}\n\nFocus on the most recent message id: ${messageId}.`,
        tools,
        tool_choice: 'auto',
        temperature: 0,
      });

      const toolCalls: any[] = openaiResponse?.choices?.[0]?.message?.tool_calls ?? [];

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
          // Guard: only allow flagging the current message
          if (String(args.messageId || '') !== String(messageId)) {
            logger.info('Ignoring flagInappropriate for non-current message', { argsMessageId: args.messageId, messageId });
            continue;
          }
          const reason = String(args.reason || 'Policy violation');
          await msgRef.set(
            {
              moderation: {
                checked: true,
                flagged: true,
                reason,
                flaggedAt: FieldValue.serverTimestamp(),
              },
            },
            { merge: true }
          );
          flaggedApplied = true;
        } else if (name === 'writeMemory') {
          const memory = String(args.memory || '').trim();
          if (memory) {
            const senderUid = String(after.user?._id || '');
            if (!senderUid) {
              logger.warn('writeMemory skipped: missing sender uid', { chatId, messageId });
            } else {
              await db
                .collection('users')
                .doc(senderUid)
                .collection('memory')
                .add({
                  text: memory,
                  createdAt: FieldValue.serverTimestamp(),
                  sourceMessageId: messageId,
                  chatId,
                });
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
              flagged: FieldValue.delete(),
              reason: FieldValue.delete(),
              flaggedAt: FieldValue.delete(),
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
