import type { Transaction } from '../types';

/**
 * Sends spending data (amount + category only) to OpenAI for analysis.
 */
export async function getSpendingAnalysis(
  apiKey: string,
  transactions: Pick<Transaction, 'amount' | 'category'>[],
  periodLabel: string
): Promise<string> {
  if (!apiKey?.trim()) {
    throw new Error('OpenAI API key is required.');
  }

  const payload = transactions.map((t) => ({
    amount: t.amount,
    category: t.category,
  }));

  const systemPrompt = `You are a helpful spending analyst. The user will send you a list of transactions for a period. Each transaction has only:
- amount: number in CZK (negative = expense, positive = income)
- category: the category assigned by the user

Analyze how they are doing: total spending vs income, spending by category, any notable patterns, and brief practical suggestions to improve or keep on track. Be concise and friendly. Write in the same language the user uses for categories (if Czech, respond in Czech; otherwise English).`;

  const userContent = `Period: ${periodLabel}\n\nTransactions (amount in CZK, category):\n${JSON.stringify(payload, null, 0)}`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey.trim()}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      max_tokens: 1024,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    let message = `OpenAI API error (${res.status})`;
    try {
      const parsed = JSON.parse(errBody) as { error?: { message?: string } };
      if (parsed.error?.message) message = parsed.error.message;
    } catch {
      if (errBody) message = errBody.slice(0, 200);
    }
    throw new Error(message);
  }

  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content;
  if (content == null) {
    throw new Error('No response from OpenAI.');
  }
  return content;
}
