#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const args = process.argv.slice(2);
if (!args[0]) { console.error('Usage: node v2/report.cjs result.json [--allow-smoke] [--allow-gc] [--root benchmarks-directory]'); process.exit(2); }
try { cp.execFileSync(process.execPath, [path.join(__dirname,'verify.cjs'), ...args], {stdio:['ignore','pipe','pipe']}); }
catch(e) { console.error(e.stderr ? e.stderr.toString() : e.message); process.exit(1); }
const r = JSON.parse(fs.readFileSync(args[0]));
const median = list => { const s=list.slice().sort((a,b)=>a-b),i=Math.floor(s.length/2);return s.length%2?s[i]:(s[i-1]+s[i])/2; };
const range = (values, unit=1) => { const v=values.map(x=>x/unit); return median(v).toFixed(1)+' ['+Math.min(...v).toFixed(1)+'–'+Math.max(...v).toFixed(1)+']'; };
const groups = new Map();
for(const m of r.measurements){const key=[m.workload,m.rateCeiling,m.framework].join('/');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(m);}
console.log('# Node Framework Benchmarks — '+r.classification+'\n');
console.log('Versions: '+Object.entries(r.provenance.packages).map(([id,p])=>id+' '+p.version).join(', ')+'.\n');
console.log('Each cell shows median [min–max] across repetitions; rows keep run order, without ranking. RSS is MiB, not live JS heap. CPU is % of one logical CPU over the sampled load window.\n');
if(r.classification!=='measurement')console.log('**Functional/diagnostic data only. These short runs must not support performance claims.**\n');
console.log('| Framework | Workload | Target req/s | Runs healthy/total | Coverage % | p99 ms | RSS baseline MiB | RSS load MiB | RSS recovered MiB | CPU % |');
console.log('|---|---|---:|---:|---|---|---|---|---|---|');
for(const rows of groups.values()){
 const m=rows[0], cpu=rows.filter(x=>x.serverCpu&&x.serverCpu.sampleWindowMs>0).map(x=>(x.serverCpu.userUs+x.serverCpu.systemUs)/x.serverCpu.sampleWindowMs/10);
 console.log('| '+[m.framework,m.workload,m.rateCeiling,rows.filter(x=>x.healthyAtRequestedCeiling).length+'/'+rows.length,
 range(rows.map(x=>x.targetCoverage*100)),range(rows.map(x=>x.load.latency.p99)),
 ...['baseline','load','recovery'].map(p=>range(rows.map(x=>x.phases[p].memory.medianRss),1048576)),cpu.length?range(cpu):'insufficient samples'].join(' | ')+' |');
}
console.log('\nMemory columns are medians within each phase, then summarized across runs. Raw JSON retains sampled peaks, all telemetry, errors and timeouts. Coverage compares completions with the configured rate target, not known independent arrivals. Read the raw counters and generator health before comparing rows.');
