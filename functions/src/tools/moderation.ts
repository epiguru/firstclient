import type { OpenAITool } from './openai';

export function getModerationTools(): OpenAITool[] {
  return [
    {
      type: 'function',
      function: {
        name: 'flagInappropriate',
        description:
          'Flag a message as hateful, harassing, or otherwise violating policy. Use when user content is offensive or harmful.',
        parameters: {
          type: 'object',
          properties: {
            chatId: { type: 'string' },
            messageId: { type: 'string' },
            reason: { type: 'string' },
          },
          required: ['chatId', 'messageId', 'reason'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'writeMemory',
        description:
          'Store an important fact about the chat participants, their preferences, or goals to help future assistance.',
        parameters: {
          type: 'object',
          properties: {
            chatId: { type: 'string' },
            memory: { type: 'string' },
          },
          required: ['chatId', 'memory'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'respondToChat',
        description:
          "Post a brief assistant response to the chat when appropriate. Use sparingly: only if the AI is addressed by name (e.g., 'Ena'), if an intervention would help group cohesion, or to concisely summarize key learnings/decisions after exploration. Do not over-respond.",
        parameters: {
          type: 'object',
          properties: {
            chatId: { type: 'string' },
            messageId: { type: 'string', description: 'The current (latest) message id being processed' },
            text: { type: 'string' },
          },
          required: ['chatId', 'messageId', 'text'],
        },
      },
    },
  ];
}
