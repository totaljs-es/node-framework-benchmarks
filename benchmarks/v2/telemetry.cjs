'use strict';
const fs = require('node:fs');
const { monitorEventLoopDelay } = require('node:perf_hooks');
const delay = monitorEventLoopDelay({ resolution: 20 });
delay.enable();
function sample() {
 const m = process.memoryUsage();
 const cpu = process.cpuUsage();
 const f = global.F;
 const row = { t: Date.now(), pid: process.pid, rss: m.rss, heapUsed: m.heapUsed, heapTotal: m.heapTotal,
  external: m.external, arrayBuffers: m.arrayBuffers, cpuUserUs: cpu.user, cpuSystemUs: cpu.system,
  eventLoopMaxMs: Number.isFinite(delay.max) ? delay.max / 1e6 : null,
  pendingReferences: f && f.temporary && Array.isArray(f.temporary.pending) ? f.temporary.pending.length : null };
 try { fs.writeSync(3, JSON.stringify(row) + '\n'); } catch {}
 delay.reset();
}
sample();
setInterval(sample, 1000).unref();
// Diagnostic only. Normal runs never force GC, and the same option is applied to all adapters.
if (process.env.BENCH_GC === '1') process.on('SIGUSR2', () => { if (global.gc) { global.gc(); sample(); } });
