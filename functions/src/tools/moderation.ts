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
  ];
}
