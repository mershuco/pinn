import { ApiError, predict, validateQuestion } from './service.mjs';
import { openaiBinding, OPENAI_MODEL } from './openai.mjs';

const windows = new Map();
const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
const json = (body,status=200) => Response.json(body,{status,headers});
function limited(key) {
  const now=Date.now();
  for (const [ip,entry] of windows) if (entry.until<=now) windows.delete(ip);
  let entry=windows.get(key);
  if (!entry) {
    if (windows.size>=1024) return true;
    entry={count:0,until:now+60000}; windows.set(key,entry);
  }
  return ++entry.count>5;
}
export async function handleApi(request, env=process.env, fetchImpl=fetch) {
  const url=new URL(request.url);
  if (url.pathname==='/api/health') {
    if (request.method!=='GET') return json({error:'GET 요청이 필요합니다.'},405);
    return json({ready:!!env.OPENAI_API_KEY?.trim(),provider:'OpenAI',hosting:'Vercel'});
  }
  if (url.pathname!=='/api/predict') return json({error:'페이지를 찾을 수 없습니다.'},404);
  if (request.method!=='POST') return json({error:'POST 요청이 필요합니다.'},405);
  if (request.headers.get('Origin') && request.headers.get('Origin')!==url.origin) return json({error:'다른 사이트의 요청은 허용하지 않습니다.'},403);
  if (!request.headers.get('Content-Type')?.includes('application/json')) return json({error:'JSON 요청이 필요합니다.'},415);
  try {
    if (Number(request.headers.get('Content-Length'))>5000) return json({error:'질문이 너무 깁니다.'},413);
    const raw=await request.text();
    if (new TextEncoder().encode(raw).length>5000) return json({error:'질문이 너무 깁니다.'},413);
    let body;try{body=JSON.parse(raw);}catch{throw new ApiError(400,'INVALID_JSON','질문 형식을 확인해 주세요.');}
    const question=validateQuestion(body?.question);
    const ai=openaiBinding(env,fetchImpl);
    if (!ai) throw new ApiError(503,'AI_NOT_CONNECTED','아직 AI 서버가 연결되지 않았습니다. 예시 결과를 먼저 읽어 보세요.');
    const ip=request.headers.get('x-vercel-forwarded-for') || request.headers.get('x-real-ip') || 'local';
    if(limited(ip)) return json({error:'요청이 많습니다. 1분 후 다시 시도해 주세요.',code:'RATE_LIMITED'},429);
    return json(await predict(question,ai,env.OPENAI_MODEL || OPENAI_MODEL));
  } catch(error) {
    if(error instanceof ApiError) return json({error:error.message,code:error.code},error.status);
    return json({error:'서버에서 오류가 발생했습니다.',code:'SERVER_ERROR'},500);
  }
}

export async function nodeHandler(req,res) {
  try {
    let raw;
    if (req.body!==undefined) raw=typeof req.body==='string'?req.body:Buffer.isBuffer(req.body)?req.body:JSON.stringify(req.body);
    else {
      const chunks=[];let bytes=0;
      for await(const chunk of req) {bytes+=chunk.length;if(bytes>5000){res.statusCode=413;res.end(JSON.stringify({error:'질문이 너무 깁니다.'}));return;}chunks.push(chunk);}
      raw=Buffer.concat(chunks);
    }
    const origin=`${process.env.VERCEL?'https':'http'}://${req.headers.host}`;
    const request=new Request(new URL(req.url,origin),{method:req.method,headers:req.headers,...(!['GET','HEAD'].includes(req.method)?{body:raw}:{})});
    const response=await handleApi(request);
    res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
  } catch { res.writeHead(500,{'Content-Type':'application/json',...headers});res.end(JSON.stringify({error:'서버에서 오류가 발생했습니다.'})); }
}
