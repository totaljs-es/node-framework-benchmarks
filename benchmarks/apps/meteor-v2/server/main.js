import {WebApp} from 'meteor/webapp';
import {check,Match} from 'meteor/check';
const w=Npm.require(process.env.BENCH_WORKLOADS);
function send(res,status,body){res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify(body));}
WebApp.handlers.get('/ready/',(req,res)=>send(res,200,{token:process.env.BENCH_TOKEN}));
WebApp.handlers.get('/hello/',(req,res)=>send(res,200,w.hello()));
WebApp.handlers.get('/catalog/',(req,res)=>send(res,200,w.catalog()));
WebApp.handlers.get('/upstream/',async(req,res)=>{try{send(res,200,await w.upstream());}catch{send(res,502,{error:'upstream'});}});
WebApp.handlers.post('/validate/',(req,res)=>{const chunks=[];req.on('data',c=>chunks.push(c));req.on('end',()=>{try{const model=JSON.parse(Buffer.concat(chunks).toString());check(model,{name:Match.Where(v=>typeof v==='string'&&v.length>0),age:Match.Optional(Number)});send(res,200,{name:model.name,age:model.age});}catch{send(res,400,{error:'invalid'});}});});
