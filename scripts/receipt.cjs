'use strict';
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const { sha256, validateResult } = require('./lib.cjs');
const folder = path.resolve(process.argv[2]);
const raw = fs.readFileSync(path.join(folder, 'result.json'));
const result = validateResult(JSON.parse(raw), { allowSmoke: true });
const repo = process.env.GITHUB_REPOSITORY;
const commit = process.env.GITHUB_SHA;
const id = process.env.GITHUB_RUN_ID;
const attempt = process.env.GITHUB_RUN_ATTEMPT;
if (!/^[\w.-]+\/[\w.-]+$/.test(repo) || !/^[a-f0-9]{40}$/.test(commit) || !/^\d+$/.test(id) || !/^\d+$/.test(attempt)) throw Error('Missing GitHub provenance');
const image = JSON.parse(cp.execFileSync('docker', ['image', 'inspect', 'framework-benchmarks'], { encoding: 'utf8' }))[0];
const receipt = {
  schema: 'node-framework-benchmarks-receipt-v1',
  classification: result.classification, integrity: 'verified-against-installed-inputs',
  reviewed: false, sourceCommit: commit, repository: repo,
  workflowUrl: `https://github.com/${repo}/actions/runs/${id}/attempts/${attempt}`,
  runId: id, attempt, workload: result.config.workloads[0],
  rawSha256: sha256(raw), node: result.node,
  runner: { os: process.env.RUNNER_OS, arch: process.env.RUNNER_ARCH, image: process.env.ImageOS, imageVersion: process.env.ImageVersion },
  container: { imageId: image.Id, baseImage: 'node:24.15.0-bookworm', cpus: 2, memoryBytes: 2147483648, swapBytes: 2147483648, network: 'none', generatorColocated: true },
  machine: result.machine, completedAt: result.finished
};
fs.writeFileSync(path.join(folder, 'receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
