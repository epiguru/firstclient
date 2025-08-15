import * as logger from 'firebase-functions/logger';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

export type OpenAITool = {
  type: 'function';
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, any>;
  };
};

export async function callOpenAIWithTools(args: {
  apiKey?: string;
  system: string;
  user: string;
  tools?: OpenAITool[];
  tool_choice?: 'auto' | { type: 'function'; function: { name: string } };
  model?: string;
  temperature?: number;
}) {
  const apiKey = args.apiKey ?? process.env.OPENAI_API_KEY;
  if (!apiKey) {
    logger.error('OPENAI_API_KEY is not set.');
    return null;
  }

  const body = {
    model: args.model ?? 'gpt-4o-mini',
    messages: [
      { role: 'system', content: args.system },
      { role: 'user', content: args.user },
    ],
    temperature: args.temperature ?? 0,
    tools: args.tools ?? [],
    tool_choice: args.tool_choice ?? 'auto',
  } as const;

  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    logger.error('OpenAI error', { status: res.status, body: text });
    return null;
  }

  return (await res.json()) as any;
}

export async function chatJSON(args: {
  apiKey?: string;
  system: string;
  user: string;
  model?: string;
  temperature?: number;
}) {
  const apiKey = args.apiKey ?? process.env.OPENAI_API_KEY;
  if (!apiKey) {
    logger.error('OPENAI_API_KEY is not set (chatJSON).');
    return null;
  }

  const body = {
    model: args.model ?? 'gpt-4o-mini',
    messages: [
      { role: 'system', content: args.system },
      { role: 'user', content: args.user },
    ],
    temperature: args.temperature ?? 0,
    response_format: { type: 'json_object' as const },
  };

  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    logger.error('OpenAI error (chatJSON)', { status: res.status, body: text });
    return null;
  }

  return (await res.json()) as any;
}
