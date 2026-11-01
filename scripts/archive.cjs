'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { sha256, summarize, validateResult } = require('./lib.cjs');
function archive(input, history) {
  const entries = fs.readdirSync(input).filter(n => n.startsWith('benchmark-'));
  assert(entries.length, 'No benchmark artifacts');
  const loaded = entries.map(name => {
    const folder = path.join(input, name), raw = fs.readFileSync(path.join(folder, 'result.json'));
    const r = validateResult(JSON.parse(raw));
    const receipt = JSON.parse(fs.readFileSync(path.join(folder, 'receipt.json')));
    assert.equal(receipt.schema, 'node-framework-benchmarks-receipt-v1');
    assert.equal(receipt.rawSha256, sha256(raw), 'Raw hash mismatch');
    assert.equal(receipt.classification, 'measurement');
    assert.equal(receipt.integrity, 'verified-against-installed-inputs');
    assert.equal(r.config.workloads.length, 1);
    assert.equal(receipt.workload, r.config.workloads[0]);
    assert(/^[a-f0-9]{40}$/.test(receipt.sourceCommit));
    assert(/^\d+$/.test(receipt.runId) && /^\d+$/.test(receipt.attempt));
    return { folder, r, receipt };
  });
  const first = loaded[0].receipt;
  for (const { receipt } of loaded) for (const key of ['sourceCommit', 'repository', 'runId', 'attempt']) assert.equal(receipt[key], first[key], 'Mixed campaigns');
  assert.equal(new Set(loaded.map(x => x.receipt.workload)).size, loaded.length, 'Duplicate workload');
  // Each workload owns its VM. The campaign groups them without pooling their measurements.
  const id = `${first.runId}-${first.attempt}`;
  const dest = path.join(history, 'runs', id);
  assert(!fs.existsSync(dest), 'Campaign already archived');
  fs.mkdirSync(dest, { recursive: true });
  const campaign = { id, sourceCommit: first.sourceCommit, repository: first.repository, workflowUrl: first.workflowUrl, completedAt: loaded.map(x => x.r.finished).sort().at(-1), comparisons: [] };
  for (const { folder, r, receipt } of loaded) {
    const w = receipt.workload;
    for (const [source, target] of [['result.json', `${w}.json`], ['receipt.json', `${w}-receipt.json`], ['report.md', `${w}-report.md`]]) fs.copyFileSync(path.join(folder, source), path.join(dest, target));
    campaign.comparisons.push({ workload: w, config: r.config, node: r.node, machine: r.machine, container: receipt.container, runner: receipt.runner, raw: `${w}.json`, receipt: `${w}-receipt.json`, report: `${w}-report.md`, rawSha256: receipt.rawSha256, rows: summarize(r) });
  }
  fs.writeFileSync(path.join(dest, 'summary.json'), JSON.stringify(campaign, null, 2) + '\n');
  const indexFile = path.join(history, 'index.json');
  const index = fs.existsSync(indexFile) ? JSON.parse(fs.readFileSync(indexFile)) : { schema: 1, campaigns: [] };
  index.campaigns.unshift({ id, completedAt: campaign.completedAt, sourceCommit: campaign.sourceCommit, workloads: campaign.comparisons.map(c => c.workload), summary: `runs/${id}/summary.json` });
  index.campaigns.sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  fs.writeFileSync(indexFile, JSON.stringify(index, null, 2) + '\n');
  return campaign;
}
if (require.main === module) archive(path.resolve(process.argv[2]), path.resolve(process.argv[3]));
module.exports = { archive };
