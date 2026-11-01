#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const cp = require('node:child_process');
const http = require('node:http');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { monitorEventLoopDelay } = require('node:perf_hooks');
const fixtures = require('./fixtures.cjs');
const workloads = require('./workloads.cjs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const sha = data => crypto.createHash('sha256').update(data).digest('hex');
const args = process.argv.slice(2);
function option(name, fallback) { const i = args.indexOf('--' + name); if (i < 0) return fallback; if (!args[i + 1] || args[i + 1].startsWith('--')) throw Error('Missing value for --' + name); return args[i + 1]; }
const valued = ['root', 'frameworks', 'workloads', 'rates', 'seconds', 'warmup', 'rest', 'reps', 'connections', 'upstream-ms', 'out'];
for (let i = 0; i < args.length; i++) {
 if (valued.includes(args[i].replace(/^--/, ''))) { if (!args[++i] || args[i].startsWith('--')) throw Error('Missing option value'); }
 else if (!['--smoke', '--gc-diagnostic', '--help'].includes(args[i])) throw Error('Unknown argument ' + args[i]);
}
if (args.includes('--help')) {
 console.log('node v2/run.cjs [--smoke] [--frameworks totaljs4,totaljs,express,fastify,node (optional: totaljs-action)] [--workloads hello,catalog,validate,upstream] [--rates 10,100,1000] [--seconds 60] [--warmup 15] [--rest 30] [--reps 3] [--connections 32] [--upstream-ms 10] [--gc-diagnostic] [--out /absolute/result.json]');
 process.exit(0);
}
const smoke = args.includes('--smoke');
const root = path.resolve(option('root', path.join(__dirname, '..')));
const list = (name, fallback) => option(name, fallback).split(',');
const ids = list('frameworks', 'totaljs4,totaljs,express,fastify,node');
const endpoints = list('workloads', 'hello,catalog,validate,upstream').map(id => {
 const e = workloads.endpoints.find(e => e.id === id); if (!e) throw Error('Unknown workload ' + id); return e;
});
for (const id of ids) if (!Object.hasOwn(fixtures.frameworks, id)) throw Error('Unknown framework ' + id);
function number(name, fallback, zero = false) { const n = Number(option(name, String(fallback))); if (!Number.isInteger(n) || n < (zero ? 0 : 1)) throw Error('Invalid --' + name); return n; }
const config = {
 frameworks: ids, workloads: endpoints.map(e => e.id),
 rates: list('rates', smoke ? '100' : '10,100,1000').map(Number),
 seconds: number('seconds', smoke ? 3 : 60), warmup: number('warmup', smoke ? 2 : 15),
 rest: number('rest', smoke ? 2 : 30), reps: number('reps', smoke ? 1 : 3),
 connections: number('connections', 32), upstreamMs: number('upstream-ms', 10, true),
 gcDiagnostic: args.includes('--gc-diagnostic')
};
if (!config.rates.length || config.rates.some(n => !Number.isInteger(n) || n < 1)) throw Error('Invalid --rates');
for(const values of [ids, endpoints.map(e=>e.id), config.rates]) if(new Set(values).size!==values.length) throw Error('Duplicate framework, workload or rate');
const autocannon = require(path.join(root, 'node_modules/autocannon'));
const out = path.resolve(option('out', path.join(root, 'results', 'v2-' + new Date().toISOString().replace(/[:.]/g, '-') + '.json')));
if (fs.existsSync(out)) throw Error('Refusing to replace existing output: ' + out);
const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-bench-v2-'));
const active = new Set();
function stop(child) { if (!active.delete(child)) return; try { process.kill(-child.pid, 'SIGKILL'); } catch {} }
function cleanup() { for (const child of [...active]) stop(child); fs.rmSync(folder, { recursive: true, force: true }); }
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { cleanup(); process.exit(signal === 'SIGINT' ? 130 : 143); });
const result = {
 schema: 'forge-benchmarks-v2', started: new Date().toISOString(),
 classification: smoke ? 'smoke-only' : config.gcDiagnostic ? 'gc-diagnostic' : 'measurement',
 publishable: false, // A review is required; no automatic ranking or publication.
 config, node: process.version, machine: { cpu: os.cpus()[0].model, cores: os.cpus().length, ramBytes: os.totalmem(), platform: os.platform(), release: os.release(), arch: os.arch() },
 methodology: { totaljsValidation: { totaljs: 'NEWSCHEMA compact schema + direct controller', 'totaljs-action': 'NEWACTION input + action execution (optional control)' }, generator: 'autocannon rate ceiling, closed loop; not an independent open-loop arrival generator', colocated: true,
  memory: 'server process RSS, heap and external bytes sampled every second; no process-tree sum',
  upstream: 'simulated local HTTP dependency, fixed delay, no database or real external API',
  validation: 'native validators for the measured valid body and one missing-name rejection; not full semantic equivalence',
  cpu: 'cumulative process CPU microseconds in raw samples; approximate phase deltas',
  limitations: ['single process per adapter', 'generator and simulated dependency share the host', 'RSS is not live JS heap', 'short runs cannot establish absence of leaks', 'no Flow or Raspberry Pi measurement', 'client response bodies checked before and after, not during timed load'] },
 provenance: { files: {}, packages: {}, adapters: {}, commit: null }, measurements: []
};
for (const file of ['run.cjs', 'fixtures.cjs', 'telemetry.cjs', 'workloads.cjs']) result.provenance.files[file] = sha(fs.readFileSync(path.join(__dirname, file)));
for (const id of ids) {
 const pkg = fixtures.frameworks[id];
 if (pkg) {
  const dir = path.join(root, 'apps', fixtures.appId(id), 'node_modules', pkg);
  result.provenance.packages[id] = { name: pkg, version: JSON.parse(fs.readFileSync(path.join(dir, 'package.json'))).version };
  for (const name of ['index.js', 'http.js', 'release.js']) if (fs.existsSync(path.join(dir, name))) result.provenance.files['installed/' + id + '/' + name] = sha(fs.readFileSync(path.join(dir, name)));
 } else if(id==='meteor') result.provenance.packages[id]={name:'meteor',version:fs.readFileSync(path.join(root,'apps/meteor-v2/.meteor/release'),'utf8').trim().replace('METEOR@',''),requiredNode:fs.readFileSync(path.join(root,'dist-meteor-v2/bundle/.node_version.txt'),'utf8').trim()};
 else result.provenance.packages[id] = { name: 'node:http', version: process.version };
 for(const name of fixtures.inputs(id,root))result.provenance.files[name]=sha(fs.readFileSync(path.join(root,name)));
 for (const name of ['package.json', 'package-lock.json']) { const file = path.join(root, 'apps', fixtures.appId(id), name); if (fs.existsSync(file)) result.provenance.files['apps/' + fixtures.appId(id) + '/' + name] = sha(fs.readFileSync(file)); }
}
result.provenance.packages.generator = { name: 'autocannon', version: require(path.join(root, 'node_modules/autocannon/package.json')).version };
for (const file of ['package.json', 'package-lock.json']) if (fs.existsSync(path.join(root, file))) result.provenance.files[file] = sha(fs.readFileSync(path.join(root, file)));
try { result.provenance.commit = cp.execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(); } catch {}
function save() { fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out + '.tmp', JSON.stringify(result, null, 2) + '\n'); fs.renameSync(out + '.tmp', out); }
async function availablePort() {
 const server = http.createServer(); await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
 const port = server.address().port; await new Promise(r => server.close(r)); return port;
}
async function check(base, token, endpoint) {
 const ready = await fetch(base + '/ready/', { signal: AbortSignal.timeout(3000) });
 assert.equal((await ready.json()).token, token, 'wrong server process');
 const response = await fetch(base + endpoint.path, { method: endpoint.method, body: endpoint.body, headers: endpoint.headers, signal: AbortSignal.timeout(5000) });
 assert.equal(response.status, 200); assert.deepEqual(await response.json(), endpoint.expected);
 if (endpoint.id === 'validate') {
  const bad = await fetch(base + endpoint.path, { method: 'POST', headers: endpoint.headers, body: '{"age":30}', signal: AbortSignal.timeout(3000) });
  assert.equal(bad.status, 400);
 }
}
function load(base, endpoint, rate, seconds) {
 return new Promise((resolve, reject) => {
  const instance = autocannon({ url: base + endpoint.path, method: endpoint.method || 'GET', body: endpoint.body, headers: endpoint.headers,
   connections: config.connections, duration: seconds, overallRate: rate, timeout: 5 }, (error, r) => {
   clearTimeout(timer); if (error) return reject(error);
   resolve({ duration: r.duration, rps: r.requests.average, completed: r.requests.total, sent: r.requests.sent, effectiveConnections: r.connections, completedPerSecond: r.requests.total / r.duration,
    latency: { p50: r.latency.p50, p90: r.latency.p90, p99: r.latency.p99, max: r.latency.max },
    errors: r.errors, timeouts: r.timeouts, non2xx: r.non2xx, statusCodeStats: r.statusCodeStats, throughput: r.throughput });
  });
  const timer = setTimeout(() => { instance.stop(); reject(Error('load generator exceeded deadline')); }, (seconds + 20) * 1000);
 });
}
function memorySummary(samples) {
 const median = values => { values.sort((a,b)=>a-b); const i=Math.floor(values.length/2); return values.length%2?values[i]:(values[i-1]+values[i])/2; };
 if (!samples.length) return null;
 return { samples: samples.length, medianRss: median(samples.map(s=>s.rss)), sampledPeakRss: Math.max(...samples.map(s=>s.rss)),
  medianHeapUsed: median(samples.map(s=>s.heapUsed)), sampledPeakHeapUsed: Math.max(...samples.map(s=>s.heapUsed)),
  last: samples.at(-1), eventLoopMaxMs: Math.max(...samples.map(s=>s.eventLoopMaxMs)) };
}
async function measure(id, endpoint, rate, rep, upstream) {
 const appFolder = path.join(folder, id + '-' + result.measurements.length); fs.mkdirSync(appFolder);
 const source = fixtures.create(appFolder, id, root); result.provenance.adapters[id] = sha(source);
 const token = crypto.randomUUID(), port = await availablePort(), base = 'http://127.0.0.1:' + port;
 const samples = []; let buffer = '', logs = '';
 const child = cp.spawn(process.execPath, [...(config.gcDiagnostic ? ['--expose-gc'] : []), '--require', path.join(__dirname, 'telemetry.cjs'), path.join(appFolder, 'index.js')], {
  cwd: appFolder, detached: true, env: { ...process.env, NODE_OPTIONS: '', NODE_ENV: 'production', PORT: String(port), BENCH_TOKEN: token, BENCH_UPSTREAM: upstream, BENCH_GC: config.gcDiagnostic ? '1' : '0' },
  stdio: ['ignore', 'pipe', 'pipe', 'pipe']
 });
 active.add(child);
 child.stdout.on('data', b => { logs = (logs + b).slice(-8192); }); child.stderr.on('data', b => { logs = (logs + b).slice(-8192); });
 child.stdio[3].on('data', b => { buffer += b; let i; while ((i = buffer.indexOf('\n')) >= 0) { const line = buffer.slice(0,i); buffer=buffer.slice(i+1); try { samples.push(JSON.parse(line)); } catch {} } });
 let spawnError; child.once('error', e => { spawnError=e; });
 const phases = {}, row = { framework: id, workload: endpoint.id, rateCeiling: rate, rep, phases, samples, generatedSourceSha256: sha(source) };
 try {
  const started = Date.now(); let ready = false;
  while (Date.now() - started < 15000) {
   if (spawnError || child.exitCode !== null) throw spawnError || Error('server exited: ' + logs);
   try { const r=await fetch(base+'/ready/',{signal:AbortSignal.timeout(500)}); if(r.ok && (await r.json()).token===token){ready=true;break;} } catch {}
   await sleep(50);
  }
  if(!ready) throw Error('server did not become ready: '+logs);
  row.startupReadyMs = Date.now() - started;
  await check(base, token, endpoint);
  phases.baseline = { start: Date.now() }; await sleep(1500); phases.baseline.end=Date.now();
  await load(base, endpoint, Math.min(rate,100), config.warmup);
  await sleep(6000); // Equal settling interval, longer than the Total housekeeping period.
  const genDelay = monitorEventLoopDelay({resolution:20}); genDelay.enable(); const genCpu=process.cpuUsage();
  phases.load = { start: Date.now() };
  row.load = await load(base, endpoint, rate, config.seconds);
  phases.load.end=Date.now();
  row.generator = { cpu:process.cpuUsage(genCpu), eventLoopMaxMs:genDelay.max/1e6, rss:process.memoryUsage().rss }; genDelay.disable();
  phases.recovery = { start: Date.now() }; await sleep(config.rest*1000); phases.recovery.end=Date.now();
  if (config.gcDiagnostic) { phases.forcedGc={start:Date.now()}; child.kill('SIGUSR2'); await sleep(1200); phases.forcedGc.end=Date.now(); }
  await check(base, token, endpoint);
  for(const [name,p] of Object.entries(phases)) p.memory=memorySummary(samples.filter(s=>s.t>=p.start&&s.t<=p.end));
  const during=samples.filter(s=>s.t>=phases.load.start&&s.t<=phases.load.end);
  if(during.length>=2){const first=during[0],last=during.at(-1); row.serverCpu={sampleWindowMs:last.t-first.t,userUs:last.cpuUserUs-first.cpuUserUs,systemUs:last.cpuSystemUs-first.cpuSystemUs};}
  row.targetCoverage=row.load.completed/(rate*row.load.duration);
  row.healthyAtRequestedCeiling = row.targetCoverage>=0.95 && row.load.errors===0 && row.load.timeouts===0 && row.load.non2xx===0 && row.load.latency.p99<=250;
  // A health flag is not evidence of maximum capacity or long-term stability.
  if (!during.length) throw Error('No telemetry during load');
  return row;
 } finally { stop(child); }
}
(async()=>{
 const upstream=http.createServer((req,res)=>{setTimeout(()=>{res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({customer:42,items:[{price:12,quantity:2},{price:7,quantity:3}]}));},config.upstreamMs);});
 upstream.on('connection',s=>s.unref());
 await new Promise((resolve,reject)=>{upstream.once('error',reject);upstream.listen(0,'127.0.0.1',resolve);});
 try {
  save(); console.log('Output: '+out+' ('+result.classification+')');
  for(let rep=0;rep<config.reps;rep++) for(const rate of config.rates) for(const endpoint of endpoints){
   const order=ids.slice(rep%ids.length).concat(ids.slice(0,rep%ids.length));
   for(const id of order){
    console.log([rep+1,id,endpoint.id,rate+' req/s'].join(' | '));
    const row=await measure(id,endpoint,rate,rep+1,'http://127.0.0.1:'+upstream.address().port);
    result.measurements.push(row); save();
    console.log('  '+row.load.rps+' req/s; p99 '+row.load.latency.p99+' ms; RSS sample max '+Math.round(row.phases.load.memory.sampledPeakRss/1048576)+' MiB; healthy '+row.healthyAtRequestedCeiling);
   }
  }
  result.finished=new Date().toISOString(); save(); console.log('Finished; raw data saved. No pages changed.');
 } finally { upstream.closeAllConnections(); await new Promise(r=>upstream.close(r)); }
})().catch(e=>{result.failure=String(e.stack||e);save();console.error(e);process.exitCode=1;}).finally(cleanup);
