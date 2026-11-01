#!/usr/bin/env node
'use strict';
// Verifies completeness and reproducible inputs, not fairness, machine isolation or scientific significance.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const args = process.argv.slice(2);
if (!args[0] || args[0].startsWith('--')) { console.error('Usage: node v2/verify.cjs result.json [--allow-smoke] [--allow-gc] [--root benchmarks-directory]'); process.exit(2); }
const rootIndex = args.indexOf('--root');
const root = path.resolve(rootIndex < 0 ? path.join(__dirname, '..') : args[rootIndex + 1]);
try {
 const r = JSON.parse(fs.readFileSync(args[0]));
 assert.equal(r.schema, 'forge-benchmarks-v2');
 assert(r.finished && !r.failure, 'run is incomplete or failed');
 assert(r.classification === 'measurement' || (r.classification === 'smoke-only' && args.includes('--allow-smoke')) || (r.classification === 'gc-diagnostic' && args.includes('--allow-gc')), 'smoke/GC data needs its explicit verification flag');
 const files = r.provenance.files;
 for (const name of ['run.cjs', 'fixtures.cjs', 'telemetry.cjs', 'workloads.cjs']) assert.equal(sha(path.join(__dirname, name)), files[name], 'suite source changed: ' + name);
 const fixtures = require('./fixtures.cjs');
 const packages = fixtures.frameworks;
 for (const [name, hash] of Object.entries(files)) {
  if (name.startsWith('installed/')) {
   const [, id, file] = name.split('/');
   assert.equal(sha(path.join(root, 'apps', fixtures.appId(id), 'node_modules', packages[id], file)), hash, 'installed source changed: ' + name);
  } else if (!['run.cjs','fixtures.cjs','telemetry.cjs','workloads.cjs'].includes(name)) assert.equal(sha(path.join(root, name)), hash, 'input changed: ' + name);
 }
 const ids = r.config.frameworks;
 const workloads = r.config.workloads;
 assert(Array.isArray(ids) && Array.isArray(workloads) && ids.length > 0 && workloads.length > 0, 'missing planned matrix');
 assert.deepEqual([...ids].sort(), Object.keys(r.provenance.adapters).sort(), 'missing adapter');
 const expected = new Set();
 for (let rep=1;rep<=r.config.reps;rep++) for(const id of ids) for(const w of workloads) for(const rate of r.config.rates) expected.add([rep,id,w,rate].join('/'));
 for(const m of r.measurements) {
  const key=[m.rep,m.framework,m.workload,m.rateCeiling].join('/');
  assert(expected.delete(key), 'duplicate or unexpected cell: '+key);
  assert(m.samples.length > 0, 'missing telemetry: '+key);
  assert(m.phases.load.memory && m.phases.baseline.memory && m.phases.recovery.memory, 'missing phase samples: '+key);
  assert(m.load.duration > 0 && Number.isFinite(m.load.rps), 'invalid load: '+key);
  assert(m.samples.every(s=>s.rss>0 && s.heapUsed>=0 && s.cpuUserUs>=0), 'invalid samples: '+key);
 }
 assert.equal(expected.size,0,'missing cells: '+[...expected].join(', '));
 assert.equal(ids.length, Object.keys(r.provenance.packages).length-1, 'adapter/package mismatch');
 const unhealthy=r.measurements.filter(m=>!m.healthyAtRequestedCeiling).length;
 console.log('OK: complete '+r.classification+'; '+r.measurements.length+' cells; recorded inputs match.');
 console.log('Cells outside the configured health threshold: '+unhealthy+'. This check does not establish a performance ranking.');
 if(r.classification!=='measurement') console.log('Diagnostic/check data only; not performance evidence.');
} catch(e) { console.error('FAIL: '+e.message); process.exitCode=1; }
