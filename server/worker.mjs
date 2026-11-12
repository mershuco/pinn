import { predict, ApiError } from './service.mjs';
import { assets } from './assets.mjs';

const security = {
  'X-Content-Type-Options':'nosniff', 'Referrer-Policy':'strict-origin-when-cross-origin',
  'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"
};
function json(data, status=200) { return Response.json(data,{status,headers:{...security,'Cache-Control':'no-store'}}); }
export default {
  async fetch(request, env) {
    const url=new URL(request.url);
    if (url.pathname==='/api/health') return json({ready:!!env.AI?.run,provider:'Cloudflare Workers AI'});
    if (url.pathname==='/api/predict') {
      if (request.method!=='POST') return json({error:'POST 요청이 필요합니다.'},405);
      if (request.headers.get('Origin') && request.headers.get('Origin')!==url.origin) return json({error:'다른 사이트의 요청은 허용하지 않습니다.'},403);
      if (!request.headers.get('Content-Type')?.includes('application/json')) return json({error:'JSON 요청이 필요합니다.'},415);
      if (Number(request.headers.get('Content-Length'))>5000) return json({error:'질문이 너무 깁니다.'},413);
      try {
        // Native Cloudflare rate-limit binding, applied before model invocation.
        if (env.AI_RATE_LIMITER) {
          const {success}=await env.AI_RATE_LIMITER.limit({key:request.headers.get('CF-Connecting-IP')||'unknown'});
          if (!success) return json({error:'요청이 많습니다. 1분 후 다시 시도해 주세요.',code:'RATE_LIMITED'},429);
        }
        const bodyText=await request.text();
        if (bodyText.length>5000) return json({error:'질문이 너무 깁니다.'},413);
        let body; try { body=JSON.parse(bodyText); } catch { throw new ApiError(400,'INVALID_JSON','질문 형식을 확인해 주세요.'); }
        if (!body || typeof body!=='object' || Array.isArray(body)) throw new ApiError(400,'INVALID_JSON','질문 형식을 확인해 주세요.');
        return json(await predict(body.question,env.AI,env.AI_MODEL));
      } catch(error) {
        if (error instanceof ApiError) return json({error:error.message,code:error.code},error.status);
        return json({error:'서버에서 오류가 발생했습니다.',code:'SERVER_ERROR'},500);
      }
    }
    if (!['GET','HEAD'].includes(request.method)) return new Response('Method not allowed',{status:405});
    const asset=assets[url.pathname==='/'?'/index.html':url.pathname];
    if (!asset) return new Response('Not found',{status:404,headers:security});
    return new Response(request.method==='HEAD'?null:asset.body,{headers:{...security,'Content-Type':asset.type,'Cache-Control':'no-cache'}});
  }
};
