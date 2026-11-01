'use strict';
const fs = require('node:fs');
const path = require('node:path');
exports.frameworks = { node: null, totaljs4: 'total4', totaljs: 'total5', 'totaljs-action': 'total5', express: 'express', fastify: 'fastify', nestjs:'@nestjs/core', adonis:'@adonisjs/core', meteor:null };
exports.appId = id => id === 'totaljs-action' ? 'totaljs' : id;
exports.create = function(folder, id, root) {
 const appId = exports.appId(id);
 const modulePath = name => JSON.stringify(path.join(root, 'apps', appId, 'node_modules', name));
 const common = `const w = require(${JSON.stringify(path.join(__dirname, 'workloads.cjs'))});\nconst port = +process.env.PORT;\n`;
 let source;
 if (appId === 'totaljs' || appId === 'totaljs4') {
  fs.mkdirSync(path.join(folder, 'controllers'), { recursive: true });
  const v5 = appId === 'totaljs';
  const useAction = id === 'totaljs-action';
  const controller = v5 ? `
${useAction ? `NEWACTION('Bench/validate', { input: '*name:String, age:Number', action: ($, model) => $.callback({name:model.name,age:model.age}) });` : `const schema = NEWSCHEMA('Bench', '*name:String, age:Number');`}
exports.install = function() {
 ROUTE('GET /ready/', $ => $.json({ token: process.env.BENCH_TOKEN }));
 ROUTE('GET /hello/', $ => $.json(w.hello()));
 ROUTE('GET /catalog/', $ => $.json(w.catalog()));
 ROUTE('GET /upstream/', async $ => { try { $.json(await w.upstream()); } catch { $.status=502; $.json({error:'upstream'}); } });
 ${useAction ? `ROUTE('POST /validate/ --> *Bench/validate');` : `ROUTE('POST /validate/', $ => {
  if(!$.body || typeof $.body!=='object' || Array.isArray($.body)){ $.response.status=400; $.json({error:'invalid'}); return; }
  const result = schema.transform($.body);
  if (result.error) { $.response.status = 400; $.json({error:'invalid'}); return; }
  const model = result.response;
  $.json({name:model.name,age:model.age});
 });`}
};` : `
NEWSCHEMA('Bench', function(schema) {
 schema.define('name', 'String', true); schema.define('age', 'Number');
 schema.setSave($ => $.callback({name:$.model.name,age:$.model.age}));
});
exports.install = function() {
 ROUTE('GET /ready/', function() { this.json({ token: process.env.BENCH_TOKEN }); });
 ROUTE('GET /hello/', function() { this.json(w.hello()); });
 ROUTE('GET /catalog/', function() { this.json(w.catalog()); });
 ROUTE('GET /upstream/', async function() { try { this.json(await w.upstream()); } catch { this.status=502; this.json({error:'upstream'}); } });
 ROUTE('POST /validate/ *Bench --> save');
};`;
  fs.writeFileSync(path.join(folder, 'controllers', 'bench.js'), common + controller);
  source = `require(${modulePath(v5 ? 'total5' : 'total4')});\n` + (v5 ? `Total.run({port:+process.env.PORT,ip:'127.0.0.1',release:true,watcher:false});` : `F.http('release',{port:+process.env.PORT,ip:'127.0.0.1',watcher:false});`);
 } else if (id === 'nestjs') {
  source = common + `require(${modulePath('reflect-metadata')});
const {NestFactory}=require(${modulePath('@nestjs/core')});
const {ExpressAdapter}=require(${modulePath('@nestjs/platform-express')});
const {Module,Controller,Get,Post,Body,HttpCode,BadRequestException,ServiceUnavailableException}=require(${modulePath('@nestjs/common')});
const {z}=require(${modulePath('zod')});
const schema=z.object({name:z.string().min(1),age:z.number().optional()});
class BenchController {
 ready(){return {token:process.env.BENCH_TOKEN};}
 hello(){return w.hello();} catalog(){return w.catalog();}
 async upstream(){try{return await w.upstream();}catch{throw new ServiceUnavailableException();}}
 validate(body){const result=schema.safeParse(body);if(!result.success)throw new BadRequestException({error:'invalid'});return {name:result.data.name,age:result.data.age};}
}
const proto=BenchController.prototype,method=name=>Object.getOwnPropertyDescriptor(proto,name);
Controller()(BenchController);
for(const name of ['ready','hello','catalog','upstream'])Get(name+'/')(proto,name,method(name));
Post('validate/')(proto,'validate',method('validate'));HttpCode(200)(proto,'validate',method('validate'));Body()(proto,'validate',0);
class AppModule {} Module({controllers:[BenchController]})(AppModule);
NestFactory.create(AppModule,new ExpressAdapter(),{logger:false}).then(app=>app.listen(port,'127.0.0.1')).catch(e=>{console.error(e);process.exit(1)});`;
 } else if (id === 'adonis') {
  // Snapshot the slim app boot/configuration. Only the generated routes vary.
  for(const name of ['package.json','adonisrc.js','bin','config','start','app'])fs.cpSync(path.join(root,'apps/adonis',name),path.join(folder,name),{recursive:true});
  fs.symlinkSync(path.join(root,'apps/adonis/node_modules'),path.join(folder,'node_modules'),'dir');
  fs.writeFileSync(path.join(folder,'start/routes.js'),`import router from '@adonisjs/core/services/router';
import vine from '@vinejs/vine';
import w from ${JSON.stringify(path.join(__dirname,'workloads.cjs'))};
const validator=vine.compile(vine.object({name:vine.string().minLength(1),age:vine.number().optional()}));
router.get('/ready/',()=>({token:process.env.BENCH_TOKEN}));
router.get('/hello/',()=>w.hello()); router.get('/catalog/',()=>w.catalog());
router.get('/upstream/',async({response})=>{try{return await w.upstream();}catch{return response.status(502).send({error:'upstream'});}});
router.post('/validate/',async({request,response})=>{try{const data=await validator.validate(request.body());return {name:data.name,age:data.age};}catch{return response.status(400).send({error:'invalid'});}});`);
  source=`process.env.APP_KEY='benchmark-only-key-not-a-secret-0123456';process.env.HOST='127.0.0.1';process.env.LOG_LEVEL='silent';\nimport('./bin/server.js');\n`;
 } else if (id === 'meteor') {
  const bundle=path.join(root,'dist-meteor-v2/bundle');
  if(!fs.existsSync(path.join(bundle,'main.js')))throw Error('Build Meteor first: node v2/build-meteor.cjs');
  const required=fs.readFileSync(path.join(bundle,'.node_version.txt'),'utf8').trim();
  if(process.version!==required)throw Error('Meteor bundle requires '+required+'; current '+process.version);
  source=`process.env.ROOT_URL='http://127.0.0.1:'+process.env.PORT;process.env.BIND_IP='127.0.0.1';process.env.BENCH_WORKLOADS=${JSON.stringify(path.join(__dirname,'workloads.cjs'))};\nrequire(${JSON.stringify(path.join(bundle,'main.js'))});\n`;
 } else if (id === 'express') {
  source = common + `const app = require(${modulePath('express')})();
const {z} = require(${modulePath('zod')});
const schema = z.object({name:z.string().min(1),age:z.number().optional()});
app.use(require(${modulePath('express')}).json());
app.get('/ready/',(req,res)=>res.json({token:process.env.BENCH_TOKEN}));
app.get('/hello/',(req,res)=>res.json(w.hello()));
app.get('/catalog/',(req,res)=>res.json(w.catalog()));
app.get('/upstream/',async(req,res)=>{try{res.json(await w.upstream());}catch{res.status(502).json({error:'upstream'});}});
app.post('/validate/',(req,res)=>{const r=schema.safeParse(req.body);if(!r.success)return res.status(400).json({error:'invalid'});res.json({name:r.data.name,age:r.data.age});});
app.listen(port,'127.0.0.1');`;
 } else if (id === 'fastify') {
  source = common + `const app = require(${modulePath('fastify')})({logger:false});
app.get('/ready/',async()=>({token:process.env.BENCH_TOKEN}));
app.get('/hello/',async()=>w.hello()); app.get('/catalog/',async()=>w.catalog());
app.get('/upstream/',async(req,reply)=>{try{return await w.upstream();}catch{return reply.code(502).send({error:'upstream'});}});
app.post('/validate/',{schema:{body:{type:'object',required:['name'],properties:{name:{type:'string',minLength:1},age:{type:'number'}}}}},async req=>({name:req.body.name,age:req.body.age}));
app.listen({port,host:'127.0.0.1'}).catch(e=>{console.error(e);process.exit(1);});`;
 } else {
  source = common + `const http=require('node:http');
function send(res,status,body){const text=JSON.stringify(body);res.writeHead(status,{'content-type':'application/json','content-length':Buffer.byteLength(text)});res.end(text);}
http.createServer(async(req,res)=>{
 if(req.method==='GET'){
  if(req.url==='/ready/')return send(res,200,{token:process.env.BENCH_TOKEN});
  if(req.url==='/hello/')return send(res,200,w.hello());
  if(req.url==='/catalog/')return send(res,200,w.catalog());
  if(req.url==='/upstream/'){try{return send(res,200,await w.upstream());}catch{return send(res,502,{error:'upstream'});}}
 }
 if(req.method==='POST'&&req.url==='/validate/'){
  const chunks=[];for await(const chunk of req)chunks.push(chunk);
  let b;try{b=JSON.parse(Buffer.concat(chunks).toString());}catch{return send(res,400,{error:'invalid'});}
  if(!b||typeof b.name!=='string'||!b.name.length||(b.age!==undefined&&typeof b.age!=='number'))return send(res,400,{error:'invalid'});
  return send(res,200,{name:b.name,age:b.age});
 }
 send(res,404,{error:'not found'});
}).listen(port,'127.0.0.1');`;
 }
 fs.writeFileSync(path.join(folder, 'index.js'), source);
 return source + (id==='adonis'?'\n'+fs.readFileSync(path.join(folder,'start/routes.js'),'utf8'):'');
};

// Additional boot/application inputs are captured in the result and checked by verify.cjs.
exports.inputs=function(id,root){
 const out=[];
 if(id==='adonis'){
  const walk=dir=>{for(const ent of fs.readdirSync(path.join(root,dir),{withFileTypes:true})){const name=path.join(dir,ent.name);if(ent.isDirectory())walk(name);else if(ent.isFile())out.push(name);}};
  for(const name of ['bin','config','start','app'])walk('apps/adonis/'+name);out.push('apps/adonis/adonisrc.js');
 }
 if(id==='meteor')for(const name of ['.node_version.txt','main.js','programs/server/program.json','programs/server/app/app.js','programs/server/package.json','programs/server/package-lock.json']){const file='dist-meteor-v2/bundle/'+name;if(fs.existsSync(path.join(root,file)))out.push(file);}
 if(id==='meteor')for(const name of ['package.json','package-lock.json','.meteor/release','.meteor/packages','.meteor/versions','server/main.js'])out.push('apps/meteor-v2/'+name);
 return out;
};
