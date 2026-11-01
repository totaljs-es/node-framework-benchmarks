<img src="site/assets/toto/favicon-192.png" width="80" height="80" alt="Toto, the mascot of Spanish Total.js">

# Total.js Benchmarks

Public, reproducible comparisons of **Total.js 4 & 5, Express, Fastify, Node.js HTTP, Meteor, AdonisJS and NestJS / Express**, maintained by Spanish Total.js Platform.

[Explore results](https://totaljs-es.github.io/node-framework-benchmarks/) · [Methodology](docs/methodology.md) · [Public executions](https://github.com/totaljs-es/node-framework-benchmarks/actions/workflows/benchmarks.yml) · [Reproduce the benchmarks](docs/development.md#run-locally)

## Same work. Same traffic. Open measurements.

The suite measures memory, CPU, latency and errors while each participant performs shared workloads at the same requested traffic rates. Every published campaign includes exact versions, original samples, source provenance and links to its GitHub Actions execution.

| Workload | Work performed |
| --- | --- |
| **Hello** | Return a small JSON response |
| **Catalog** | Filter 1,000 deterministic records, sort them, select 20 and serialize the response |
| **Validate** | Parse a JSON POST and validate its fields through each adapter |
| **Upstream** | Call a local service with a simulated 10 ms delay, parse its response and calculate an order total |

Participants use real framework routes and production processes. A full campaign covers eight participants, four workloads, two requested rates and three repetitions: **192 measurements**. Each workload runs on its own GitHub-hosted VM, with participants measured sequentially, a common pinned Node.js runtime and equal container resource limits.

## Explore the evidence

The [results website](https://totaljs-es.github.io/node-framework-benchmarks/) provides campaign, workload, traffic, metric and participant filters, with min–median–max charts and detailed tables. It includes:

- Memory before, during and after load, CPU utilization and latency.
- Target coverage, unhealthy repetitions, errors, timeouts and non-2xx responses.
- Exact participant versions, source commit and execution environment.
- Original JSON samples, verification receipts, Markdown reports and filtered CSV downloads.

The repository is the source of campaign evidence. Verified measurement campaigns are retained in the append-only **results** branch and published to the website. Functional smoke checks and GC diagnostics are excluded from performance charts.

## Read the conditions with the numbers

These measurements describe the recorded implementations and environments. Hosted hardware can vary between campaigns, and workloads run on separate VMs. Compare participants within the same campaign and workload.

The closed-loop load generator shares resources with the server. Requested traffic is a ceiling, rather than guaranteed independent arrivals; completed throughput at a fixed target does not establish maximum capacity. RSS is resident process memory, not live JavaScript heap. All repetitions and unhealthy results remain visible.

Results are **automatically verified, not independently reviewed**. Verification checks completeness and recorded inputs; it does not establish scientific significance. Read the [full methodology](docs/methodology.md) for the measurement protocol, validation differences and limitations.

## Contribute and reproduce

Source code, dependency locks, workload implementations and collection tools are public. The [development guide](docs/development.md) covers local reproduction, website development and workflow maintenance.

See [CONTRIBUTING.md](CONTRIBUTING.md) for contributions and [SECURITY.md](SECURITY.md) for vulnerability reports. AI coding agents share [AGENTS.md](AGENTS.md), with entry points for [Claude](CLAUDE.md), [Gemini](GEMINI.md) and [Copilot](.github/copilot-instructions.md).

## Maintained by Spanish Total.js

This project is maintained by [Spanish Total.js Platform](https://www.totaljs.es/), part of the Total.js community. We have an interest in Total.js; implementations, methodology and evidence are public for inspection.

Code is [MIT licensed](LICENSE). Toto™ artwork and icons retain their [separate license](site/assets/toto/LICENSE.md); dependencies retain their upstream licenses.
