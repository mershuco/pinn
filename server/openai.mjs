import { ApiError } from './service.mjs';

export const OPENAI_MODEL = 'gpt-4.1-mini';
export function openaiBinding(env, fetchImpl = fetch) {
  if (!env.OPENAI_API_KEY?.trim()) return null;
  return {
    async run(model, input) {
      const response = await fetchImpl('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({model, input: input.messages, max_output_tokens: input.max_tokens,
          temperature: input.temperature, text: { format: { type: 'json_object' } }, store: false}),
        signal: AbortSignal.timeout(50000)
      });
      if (response.status === 429) throw new ApiError(429, 'AI_QUOTA', 'AI 서비스의 사용 한도에 도달했습니다. 잠시 후 다시 시도해 주세요.');
      if ([401,403].includes(response.status)) throw new ApiError(503, 'AI_AUTH', '서버의 AI 인증 설정을 확인해야 합니다. 운영자에게 문의해 주세요.');
      if (!response.ok) throw new ApiError(502, 'AI_UNAVAILABLE', 'AI 서비스가 응답하지 못했습니다. 잠시 후 다시 시도해 주세요.');
      const data = await response.json();
      if (data.status !== 'completed') throw new ApiError(502, 'INCOMPLETE_AI_RESPONSE', 'AI가 결과를 끝까지 작성하지 못했습니다. 다시 시도해 주세요.');
      const text = (data.output || []).filter(v=>v.type==='message').flatMap(v=>v.content || []).filter(v=>v.type==='output_text').map(v=>v.text).join('');
      if (!text) throw new ApiError(502, 'INVALID_AI_RESPONSE', 'AI가 결과를 작성하지 못했습니다. 질문을 구체적으로 적고 다시 시도해 주세요.');
      return { response: text };
    }
  };
}
