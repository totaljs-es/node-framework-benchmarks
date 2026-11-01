'use strict';
// Synthetic data for integrity and browser checks; never published.
function fixture() {
  return {
    schema: 'forge-benchmarks-v2', classification: 'measurement', publishable: false,
    finished: '2026-11-01T12:00:00.000Z', node: 'v24.15.0',
    machine: { cpu: 'SYNTHETIC TEST MACHINE', cores: 4, ramBytes: 17179869184, platform: 'linux', arch: 'x64' },
    provenance: { packages: { node: { name: 'node:http', version: 'v24.15.0' } } },
    config: { frameworks: ['node'], workloads: ['hello'], rates: [100], reps: 3, seconds: 60, warmup: 15, rest: 30, connections: 32, upstreamMs: 10, gcDiagnostic: false },
    measurements: [1, 2, 3].map(rep => ({
      rep, framework: 'node', workload: 'hello', rateCeiling: 100,
      healthyAtRequestedCeiling: rep !== 3, targetCoverage: rep === 3 ? 0.8 : 1,
      phases: Object.fromEntries(['baseline', 'load', 'recovery'].map(phase => [phase, { memory: { medianRss: rep * 1048576 } }])),
      samples: [{ rss: 1048576 }], serverCpu: { sampleWindowMs: 59000, userUs: rep * 59000, systemUs: 0 },
      load: { completedPerSecond: 100, latency: { p50: rep, p99: rep * 2 }, errors: rep === 3 ? 1 : 0, timeouts: rep === 3 ? 1 : 0, non2xx: 0 }
    }))
  };
}
module.exports = { fixture };
