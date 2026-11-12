import { config } from './config.js';
export function apiUrl(path) { return new URL(`api/${path}`,import.meta.url); }
export async function health() {
  if(config.mode==='preview') return {ready:false,preview:true};
  const response=await fetch(apiUrl('health'),{signal:AbortSignal.timeout(10000)});
  if(!response.ok) throw new Error('연결 상태를 확인하지 못했습니다.');
  return response.json();
}
export async function requestPrediction(question,signal) {
  if(config.mode==='preview') throw new Error('현재는 미리보기입니다. 운영용 AI 서버가 연결되면 새 가설을 예측할 수 있습니다. 아래의 예시 결과를 먼저 읽어 보세요.');
  const response=await fetch(apiUrl('predict'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question}),signal});
  const data=await response.json();
  if(!response.ok)throw new Error(data.error||'예측을 불러오지 못했습니다.');
  return data;
}
