'use strict';
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const frameworks = ['totaljs4', 'totaljs', 'express', 'fastify', 'node', 'meteor', 'adonis', 'nestjs'];
const workloads = ['hello', 'catalog', 'validate', 'upstream'];
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const median = values => {
  const sorted = values.slice().sort((a, b) => a - b);
  const i = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[i] : (sorted[i - 1] + sorted[i]) / 2;
};
function stats(values) {
  if (!values.length || values.some(v => !Number.isFinite(v))) return null;
  return { median: median(values), min: Math.min(...values), max: Math.max(...values), values };
}
function validateResult(r, { allowSmoke = false } = {}) {
  assert.equal(r.schema, 'forge-benchmarks-v2');
  assert(r.finished && !r.failure, 'Incomplete or failed run');
  assert(r.classification === 'measurement' || (allowSmoke && r.classification === 'smoke-only'), 'Not a measurement');
  const c = r.config;
  for (const [values, allowed] of [[c.frameworks, frameworks], [c.workloads, workloads]]) {
    assert(Array.isArray(values) && values.length && new Set(values).size === values.length);
    assert(values.every(v => allowed.includes(v)), 'Unknown adapter/workload');
  }
  assert(Number.isInteger(c.reps) && c.reps > 0);
  assert(c.rates.length && new Set(c.rates).size === c.rates.length && c.rates.every(n => Number.isInteger(n) && n > 0));
  if (r.classification === 'measurement') {
    assert(c.reps >= 3 && c.seconds >= 60 && c.warmup >= 15 && c.rest >= 30 && !c.gcDiagnostic, 'Measurement intervals are too short or diagnostic');
  }
  const expected = new Set();
  for (let rep = 1; rep <= c.reps; rep++) for (const f of c.frameworks) for (const w of c.workloads) for (const rate of c.rates) expected.add([rep, f, w, rate].join('/'));
  for (const m of r.measurements) {
    assert(expected.delete([m.rep, m.framework, m.workload, m.rateCeiling].join('/')), 'Duplicate/unexpected cell');
    assert(m.samples?.length, 'Missing telemetry');
    for (const phase of ['baseline', 'load', 'recovery']) assert(Number.isFinite(m.phases[phase]?.memory?.medianRss) && m.phases[phase].memory.medianRss > 0, 'Missing phase');
    for (const v of [m.targetCoverage, m.load.completedPerSecond, m.load.latency.p50, m.load.latency.p99, m.load.errors, m.load.timeouts, m.load.non2xx]) assert(Number.isFinite(v) && v >= 0, 'Invalid metric');
    assert(typeof m.healthyAtRequestedCeiling === 'boolean');
  }
  assert.equal(expected.size, 0, 'Missing matrix cells');
  assert(r.provenance?.packages && r.machine && r.node);
  return r;
}
function summarize(r) {
  validateResult(r);
  const groups = new Map();
  for (const row of r.measurements) {
    const key = [row.workload, row.rateCeiling, row.framework].join('/');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  return [...groups.values()].map(rows => {
    const first = rows[0];
    return {
      framework: first.framework, workload: first.workload, rate: first.rateCeiling,
      version: r.provenance.packages[first.framework]?.version,
      repetitions: rows.length, healthy: rows.filter(r => r.healthyAtRequestedCeiling).length,
      metrics: {
        rss: stats(rows.map(r => r.phases.load.memory.medianRss / 1048576)),
        baseline: stats(rows.map(r => r.phases.baseline.memory.medianRss / 1048576)),
        recovery: stats(rows.map(r => r.phases.recovery.memory.medianRss / 1048576)),
        p50: stats(rows.map(r => r.load.latency.p50)), p99: stats(rows.map(r => r.load.latency.p99)),
        cpu: stats(rows.map(r => r.serverCpu?.sampleWindowMs > 0 ? (r.serverCpu.userUs + r.serverCpu.systemUs) / r.serverCpu.sampleWindowMs / 10 : NaN)),
        coverage: stats(rows.map(r => r.targetCoverage * 100)),
        throughput: stats(rows.map(r => r.load.completedPerSecond))
      },
      errors: rows.reduce((n, r) => n + r.load.errors, 0),
      timeouts: rows.reduce((n, r) => n + r.load.timeouts, 0),
      non2xx: rows.reduce((n, r) => n + r.load.non2xx, 0)
    };
  });
}
module.exports = { frameworks, workloads, stats, sha256, validateResult, summarize };
