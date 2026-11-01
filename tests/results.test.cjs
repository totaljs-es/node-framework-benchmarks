'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { sha256, summarize, validateResult } = require('../scripts/lib.cjs');
const { archive } = require('../scripts/archive.cjs');
const { build } = require('../scripts/build-site.cjs');
// Synthetic data only. Never copied to site/ or public history.
const { fixture } = require('./fixture.cjs');
function setup(t, result = fixture()) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'framework-results-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const input = path.join(root, 'incoming'), artifact = path.join(input, 'benchmark-hello'), history = path.join(root, 'history'), output = path.join(root, 'site');
  fs.mkdirSync(artifact, { recursive: true });
  const raw = JSON.stringify(result);
  fs.writeFileSync(path.join(artifact, 'result.json'), raw);
  fs.writeFileSync(path.join(artifact, 'report.md'), '# Synthetic test only');
  const receipt = { schema: 'node-framework-benchmarks-receipt-v1', classification: 'measurement', integrity: 'verified-against-installed-inputs', reviewed: false, sourceCommit: 'a'.repeat(40), repository: 'totaljs-es/node-framework-benchmarks', workflowUrl: 'https://github.com/totaljs-es/node-framework-benchmarks/actions/runs/123', runId: '123', attempt: '1', workload: 'hello', rawSha256: sha256(raw), container: { cpus: 2, memoryBytes: 2147483648 }, runner: { os: 'Linux' } };
  fs.writeFileSync(path.join(artifact, 'receipt.json'), JSON.stringify(receipt));
  return { root, input, artifact, history, output, receipt, result };
}
test('summary calculates units and ranges and retains unhealthy repetitions and overlapping counters', () => {
  const row = summarize(fixture())[0];
  assert.deepEqual(row.metrics.rss, { median: 2, min: 1, max: 3, values: [1, 2, 3] });
  assert.equal(row.metrics.cpu.median, 0.2);
  assert.equal(row.healthy, 2);
  assert.equal(row.repetitions, 3);
  assert.equal(row.errors, 1);
  assert.equal(row.timeouts, 1);
});
test('missing CPU is unavailable instead of zero or a subset of repetitions', () => {
  const r = fixture(); delete r.measurements[0].serverCpu;
  assert.equal(summarize(r)[0].metrics.cpu, null);
});
test('reject incomplete, duplicate, missing, unknown and nonfinite result cells', () => {
  for (const mutate of [r => delete r.finished, r => r.failure = 'boom', r => r.measurements.pop(), r => r.measurements.push(r.measurements[0]), r => r.config.frameworks.push('fake'), r => r.measurements[0].load.latency.p99 = NaN, r => delete r.measurements[0].phases.recovery.memory]) {
    const r = fixture(); mutate(r); assert.throws(() => validateResult(r));
  }
});
test('exclude smoke/GC and reject shortened measurement intervals', () => {
  for (const mutate of [r => r.classification = 'smoke-only', r => r.classification = 'gc-diagnostic', r => r.config.gcDiagnostic = true, r => r.config.seconds = 3, r => r.config.rest = 2, r => r.config.warmup = 2, r => r.config.reps = 1]) {
    const r = fixture(); mutate(r); assert.throws(() => validateResult(r));
  }
  const r = fixture(); r.classification = 'smoke-only'; assert.doesNotThrow(() => validateResult(r, { allowSmoke: true }));
});
test('archive, rebuild and download preserve exact raw bytes and never overwrite campaigns', t => {
  const f = setup(t);
  const campaign = archive(f.input, f.history);
  assert.equal(campaign.id, '123-1');
  build(f.history, f.output);
  assert.deepEqual(fs.readFileSync(path.join(f.output, 'data/runs/123-1/hello.json')), fs.readFileSync(path.join(f.artifact, 'result.json')));
  assert.equal(JSON.parse(fs.readFileSync(path.join(f.output, 'data/index.json'))).campaigns.length, 1);
  assert.throws(() => archive(f.input, f.history), /already archived/);
});
test('archive rejects changed raw bytes and mixed workflow attempts', t => {
  const f = setup(t);
  fs.appendFileSync(path.join(f.artifact, 'result.json'), ' ');
  assert.throws(() => archive(f.input, f.history), /hash mismatch/);
  fs.writeFileSync(path.join(f.artifact, 'result.json'), JSON.stringify(f.result));
  const second = path.join(f.input, 'benchmark-second'); fs.cpSync(f.artifact, second, { recursive: true });
  fs.writeFileSync(path.join(second, 'receipt.json'), JSON.stringify({ ...f.receipt, attempt: '2' }));
  assert.throws(() => archive(f.input, f.history), /Mixed campaigns/);
});
test('site build rejects tampered summaries, raw files and unsafe history paths', t => {
  const f = setup(t); archive(f.input, f.history);
  const file = path.join(f.history, 'runs/123-1/summary.json');
  const summary = JSON.parse(fs.readFileSync(file)); summary.comparisons[0].rows[0].metrics.rss.median = 12345;
  fs.writeFileSync(file, JSON.stringify(summary));
  assert.throws(() => build(f.history, f.output), /differs from raw/);
  summary.comparisons[0].rows = summarize(f.result); fs.writeFileSync(file, JSON.stringify(summary));
  fs.appendFileSync(path.join(f.history, 'runs/123-1/hello.json'), ' ');
  assert.throws(() => build(f.history, f.output), /hash mismatch/);
  const index = JSON.parse(fs.readFileSync(path.join(f.history, 'index.json'))); index.campaigns[0].summary = '../outside.json';
  fs.writeFileSync(path.join(f.history, 'index.json'), JSON.stringify(index));
  assert.throws(() => build(f.history, f.output));
});
test('first site build is empty, with no synthetic performance data', t => {
  const f = setup(t);
  build(f.history, f.output);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(f.output, 'data/index.json'))), { schema: 1, campaigns: [] });
  assert(!fs.existsSync(path.join(f.output, 'data/runs')));
  assert(!fs.readFileSync(path.join(f.output, 'index.html'), 'utf8').includes('SYNTHETIC TEST MACHINE'));
});
