'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { sha256, validateResult, summarize } = require('./lib.cjs');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
function build(history = path.join(root, 'history'), output = path.join(root, 'dist')) {
  if (fs.existsSync(output)) fs.rmSync(output, { recursive: true });
  fs.cpSync(path.join(root, 'site'), output, { recursive: true });
  const data = path.join(output, 'data');
  fs.mkdirSync(data, { recursive: true });
  let index = { schema: 1, campaigns: [] };
  const safe = relative => {
    assert(typeof relative === 'string' && !path.isAbsolute(relative));
    const full = path.resolve(history, relative);
    assert(full.startsWith(path.resolve(history) + path.sep), 'Unsafe history path');
    return full;
  };
  if (fs.existsSync(path.join(history, 'index.json'))) {
    index = JSON.parse(fs.readFileSync(path.join(history, 'index.json')));
    assert.equal(index.schema, 1);
    for (const entry of index.campaigns) {
      assert(/^\d+-\d+$/.test(entry.id));
      assert.equal(entry.summary, `runs/${entry.id}/summary.json`);
      const summary = JSON.parse(fs.readFileSync(safe(entry.summary)));
      assert.equal(summary.id, entry.id);
      assert.equal(summary.sourceCommit, entry.sourceCommit);
      assert(summary.comparisons.length, 'Empty campaign');
      for (const comparison of summary.comparisons) {
        for (const key of ['raw', 'receipt', 'report']) assert.equal(path.basename(comparison[key]), comparison[key], 'Unsafe download path');
        const relative = `runs/${entry.id}/${comparison.raw}`;
        const bytes = fs.readFileSync(safe(relative));
        assert.equal(sha256(bytes), comparison.rawSha256, 'History hash mismatch');
        const r = validateResult(JSON.parse(bytes));
        assert.deepEqual(summarize(r), comparison.rows, 'Summary differs from raw data');
        assert.deepEqual(r.config, comparison.config, 'Configuration differs from raw data');
        assert.deepEqual(r.machine, comparison.machine, 'Machine differs from raw data');
        assert.equal(r.node, comparison.node, 'Runtime differs from raw data');
        assert.equal(r.config.workloads[0], comparison.workload);
        const receipt = JSON.parse(fs.readFileSync(safe(`runs/${entry.id}/${comparison.receipt}`)));
        assert.equal(receipt.sourceCommit, summary.sourceCommit);
        assert.equal(receipt.rawSha256, comparison.rawSha256);
        assert.deepEqual(receipt.container, comparison.container);
        assert.deepEqual(receipt.runner, comparison.runner);
        for (const key of ['raw', 'receipt', 'report']) {
          const rel = `runs/${entry.id}/${comparison[key]}`;
          fs.mkdirSync(path.dirname(path.join(data, rel)), { recursive: true });
          fs.copyFileSync(safe(rel), path.join(data, rel));
        }
      }
      fs.copyFileSync(safe(entry.summary), path.join(data, entry.summary));
    }
  }
  fs.writeFileSync(path.join(data, 'index.json'), JSON.stringify(index));
  fs.writeFileSync(path.join(output, '.nojekyll'), '');
  console.log(`Built ${index.campaigns.length} campaign(s) into ${output}`);
}
if (require.main === module) build(process.argv[2] && path.resolve(process.argv[2]), process.argv[3] && path.resolve(process.argv[3]));
module.exports = { build };
