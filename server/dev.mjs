import { createServer } from 'node:http';
import { handleApi } from './vercel.mjs';
import '../scripts/build.mjs';
const {default:worker}=await import('../build/worker.mjs');
const port=Number(process.env.PORT||4180);
createServer(async(req,res)=>{
  try {
    const chunks=[];let length=0;
    for await(const chunk of req){length+=chunk.length;if(length>5000){res.writeHead(413);res.end('Request too large');return;}chunks.push(chunk);}
    const request=new Request(`http://${req.headers.host}${req.url}`,{method:req.method,headers:req.headers,...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(chunks)}:{})});
    const response=new URL(request.url).pathname.startsWith('/api/') ? await handleApi(request) : await worker.fetch(request,{});
    res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
  }catch{res.writeHead(500);res.end('Server error');}
}).listen(port,'0.0.0.0',()=>console.log(`독자의 가설: http://localhost:${port} (Vercel-compatible Node API; AI requires server-side OPENAI_API_KEY)`));
