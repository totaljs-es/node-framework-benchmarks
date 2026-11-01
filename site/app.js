'use strict';
const $ = id => document.getElementById(id);
const names = { totaljs4: 'Total.js 4', totaljs: 'Total.js 5', express: 'Express', fastify: 'Fastify', node: 'Node.js HTTP', meteor: 'Meteor', adonis: 'AdonisJS', nestjs: 'NestJS / Express' };
const colors = { totaljs4: '#577b42', totaljs: '#3d6240', express: '#cf6d42', fastify: '#a3852b', node: '#597f6f', meteor: '#b16465', adonis: '#8772ad', nestjs: '#486d83' };
const workloadNames = { hello: 'Hello · small JSON response', catalog: 'Catalog · filter, sort & serialize', validate: 'Validate · JSON input', upstream: 'Upstream · simulated I/O' };
const metricNames = { rss: ['Memory during load', 'MiB'], baseline: ['Baseline memory', 'MiB'], recovery: ['Memory after recovery', 'MiB'], cpu: ['Server CPU utilization', '%'], p50: ['Median response latency', 'ms'], p99: ['Tail response latency · p99', 'ms'], coverage: ['Coverage of requested traffic', '%'], throughput: ['Completed requests per second', 'req/s'] };
const state = { index: null, campaign: null, comparison: null, selected: new Set(), rows: [], request: 0 };
const number = n => Number.isFinite(n) ? n.toLocaleString('en-US', { maximumFractionDigits: 1, minimumFractionDigits: 1 }) : 'Unavailable';
const range = s => s ? `${number(s.median)} [${number(s.min)}–${number(s.max)}]` : 'Unavailable';
const el = (tag, text, className) => { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (className) node.className = className; return node; };
function options(select, entries, preferred) {
  select.replaceChildren(...entries.map(([value, label]) => { const node = el('option', label); node.value = value; return node; }));
  if (entries.some(([v]) => String(v) === String(preferred))) select.value = preferred;
}
async function read(url) { const r = await fetch(url); if (!r.ok) throw Error(`Could not load ${url} (${r.status})`); return r.json(); }
function syncUrl() {
  const params = new URLSearchParams({ campaign: $('campaign').value, workload: $('workload').value, rate: $('rate').value, metric: $('metric').value });
  history.replaceState(null, '', `?${params}#results`);
}
function sourceUrl(campaign) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(campaign.repository) || !/^[a-f0-9]{40}$/.test(campaign.sourceCommit)) throw Error('Invalid source provenance');
  return `https://github.com/${campaign.repository}/tree/${campaign.sourceCommit}`;
}
async function loadCampaign(id, preferred = {}) {
  const request = ++state.request;
  $('load-status').hidden = false;
  $('load-status').textContent = 'Loading campaign…';
  $('explorer').hidden = true;
  const entry = state.index.campaigns.find(c => c.id === id);
  if (!entry || !/^\d+-\d+$/.test(entry.id) || entry.summary !== `runs/${entry.id}/summary.json`) throw Error('Invalid campaign');
  const campaign = await read(`data/${entry.summary}`);
  if (request !== state.request) return;
  state.campaign = campaign;
  $('source').href = sourceUrl(campaign);
  const execution = `https://github.com/${campaign.repository}/actions/runs/${id.split('-')[0]}`;
  $('execution').href = execution;
  options($('workload'), campaign.comparisons.map(c => [c.workload, workloadNames[c.workload]]), preferred.workload);
  if (Object.hasOwn(metricNames, preferred.metric)) $('metric').value = preferred.metric;
  setWorkload(preferred.rate);
  $('load-status').hidden = true;
  $('explorer').hidden = false;
}
function setWorkload(preferredRate) {
  state.comparison = state.campaign.comparisons.find(c => c.workload === $('workload').value);
  const c = state.comparison;
  options($('rate'), c.config.rates.map(r => [String(r), `${r.toLocaleString()} req/s`]), preferredRate || $('rate').value || '1000');
  state.selected = new Set(c.config.frameworks);
  $('frameworks').replaceChildren(...c.config.frameworks.map(id => {
    const label = el('label', undefined, 'framework-choice');
    const input = el('input'); input.type = 'checkbox'; input.checked = true; input.value = id;
    input.addEventListener('change', () => { if (input.checked) state.selected.add(id); else state.selected.delete(id); render(); });
    label.append(input, el('span', names[id])); return label;
  }));
  const env = el('dl', undefined, 'environment-grid');
  const lines = [
    ['Machine reported by the container', `${c.machine.cpu} · ${c.machine.arch} · ${c.machine.cores} host logical CPUs`],
    ['Container limits · server + generator', `${c.container.cpus} CPU quota · ${number(c.container.memoryBytes / 1073741824)} GiB memory · external network disabled`],
    ['Runtime & runner', `${c.node} · ${c.runner.os || c.machine.platform} · ${c.runner.image || 'OS image not recorded'} ${c.runner.imageVersion || ''}`],
    ['Measured intervals', `${c.config.warmup}s warm-up · ${c.config.seconds}s load · ${c.config.rest}s recovery · ${c.config.reps} repetitions`],
    ['Traffic', `${c.config.connections} requested connections · closed-loop rate ceiling · ${c.config.upstreamMs}ms simulated upstream`],
    ['Source commit', state.campaign.sourceCommit]
  ];
  for (const [term, value] of lines) { const group = el('div'); group.append(el('dt', term), el('dd', value)); env.append(group); }
  $('environment').replaceChildren(env);
  for (const key of ['raw', 'receipt', 'report']) {
    if (!/^[a-z]+(?:-receipt|-report)?\.(?:json|md)$/.test(c[key])) throw Error('Invalid download path');
    $(key).href = `data/runs/${state.campaign.id}/${c[key]}`;
    $(key).setAttribute('download', c[key]);
  }
  $('hash').textContent = `RAW SHA-256 / ${c.rawSha256}`;
  render();
}
function render() {
  const c = state.comparison;
  const metric = $('metric').value;
  const [label, unit] = metricNames[metric];
  const rows = c.rows.filter(r => r.rate === Number($('rate').value) && state.selected.has(r.framework));
  state.rows = rows;
  const maximum = Math.max(1, ...rows.map(r => r.metrics[metric]?.max || 0)) * 1.12;
  $('chart-context').textContent = `${c.workload.toUpperCase()} / ${Number($('rate').value).toLocaleString()} REQUESTED REQ/S / ${c.config.reps} REPETITIONS`;
  $('chart-title').textContent = label;
  $('chart-description').textContent = metric === 'throughput' || metric === 'coverage' ? 'At a fixed requested rate, higher completed throughput is not evidence of greater maximum capacity. Read coverage with errors and timeouts.' : metric === 'cpu' ? 'Process CPU time over the sampled load window, as a percentage of one logical CPU. The container also runs the load generator.' : metric.includes('rss') || ['baseline', 'recovery'].includes(metric) ? 'Median server RSS within the selected phase, then summarized across repetitions. Sampled resident memory includes the runtime.' : 'Latency percentiles describe completed requests. Read them alongside timeouts and achieved traffic.';
  $('chart').replaceChildren(...rows.map(r => {
    const s = r.metrics[metric];
    const row = el('div', undefined, 'chart-row');
    row.append(el('span', names[r.framework], 'chart-name'));
    const track = el('div', undefined, 'chart-track');
    if (s) {
      for (const key of ['min', 'median', 'max']) track.style.setProperty(`--${key}`, `${s[key] / maximum * 100}%`);
      track.style.setProperty('--color', colors[r.framework]);
      track.append(el('div', undefined, 'chart-fill'), el('div', undefined, 'chart-range'), el('div', undefined, 'chart-dot'));
    }
    const value = el('span', s ? `${number(s.median)} ${unit}` : 'Unavailable', 'chart-number');
    if (s) value.append(el('small', `${number(s.min)}–${number(s.max)}`));
    row.append(track, value); return row;
  }));
  if (!rows.length) $('chart').append(el('p', 'Select a participant to explore its measurements.', 'muted'));
  $('rows').replaceChildren(...rows.map(r => {
    const row = el('tr'), name = el('td'); name.append(el('strong', names[r.framework]), el('small', r.version));
    const health = el('td'); health.append(el('span', `${r.healthy} / ${r.repetitions}`, `health${r.healthy < r.repetitions ? ' bad' : ''}`));
    row.append(name, health, ...['rss', 'cpu', 'p99', 'coverage'].map(m => el('td', range(r.metrics[m]))), el('td', r.errors), el('td', r.timeouts), el('td', r.non2xx));
    return row;
  }));
  $('csv').disabled = !rows.length;
  syncUrl();
}
$('campaign').addEventListener('change', () => loadCampaign($('campaign').value).catch(fail));
$('workload').addEventListener('change', () => { try { setWorkload(); } catch (e) { fail(e); } });
for (const id of ['rate', 'metric']) $(id).addEventListener('change', render);
$('csv').addEventListener('click', () => {
  const fields = ['framework', 'version', 'workload', 'rate', 'healthy', 'repetitions', 'errors', 'timeouts', 'non2xx'];
  const metrics = Object.keys(metricNames);
  const csv = [fields.concat(metrics.flatMap(m => ['median', 'min', 'max'].map(s => `${m}_${s}`))), ...state.rows.map(r => fields.map(k => r[k]).concat(metrics.flatMap(m => ['median', 'min', 'max'].map(s => r.metrics[m]?.[s] ?? ''))))].map(row => row.map(v => '"' + String(v ?? '').replaceAll('"', '""') + '"').join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = el('a'); a.href = url; a.download = `${state.campaign.id}-${state.comparison.workload}-${$('rate').value}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
});
function fail(error) { $('load-status').hidden = false; $('load-status').textContent = `Results could not be loaded. ${error.message}. You can still inspect the evidence in the repository's results branch.`; $('explorer').hidden = true; }
(async () => {
  state.index = await read('data/index.json');
  if (!state.index.campaigns.length) { $('load-status').hidden = true; $('empty').hidden = false; return; }
  const preferred = Object.fromEntries(new URLSearchParams(location.search));
  options($('campaign'), state.index.campaigns.map(c => [c.id, `${new Date(c.completedAt).toLocaleString('en-GB', { timeZone: 'UTC' })} UTC · ${c.workloads.join(', ')} · ${c.sourceCommit.slice(0, 7)}`]), preferred.campaign);
  await loadCampaign($('campaign').value, preferred);
})().catch(fail);
