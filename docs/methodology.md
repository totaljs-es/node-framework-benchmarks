# Methodology

This repository is a new GitHub-hosted measurement campaign, derived from the [Forge study](https://forge.totaljs.es/es/benchmarks/). Historical Forge results are not imported or relabelled. Results describe the recorded versions, implementations and hardware, rather than all applications built with a framework.

## Participants and workloads

Eight participants are available: Total.js 4, Total.js 5, Express, Fastify, Node.js HTTP, Meteor, AdonisJS and NestJS with its Express platform. The `core` selection omits Meteor. Actual installed versions and lock-file/source hashes are recorded in every raw file. Framework updates require new locks and a new campaign.

The shared workloads live in `benchmarks/v2/workloads.cjs`:

| Scenario | Work |
| --- | --- |
| `hello` | Small JSON response, an overhead control |
| `catalog` | Filter 1,000 deterministic records, sort, select 20, serialize JSON |
| `validate` | Parse a JSON POST and return validated fields |
| `upstream` | Local HTTP service with 10 ms simulated delay, JSON parsing and order calculation |

Adapters use actual framework routes and boot pipelines. Total5 uses a compact `NEWSCHEMA` and direct controller; Total4 a native schema workflow; Fastify a native JSON schema; Adonis VineJS; Express and NestJS Zod; Node HTTP hand-written checks. Their general validation/coercion semantics are **not identical**. The shared valid response and selected invalid inputs are checked; there is no claim of exhaustive semantic equivalence. NestJS runs on Express, not Fastify. Meteor runs a server-only production bundle.

## Campaign design

Each selected workload runs as a separate job on `ubuntu-24.04`, with all selected adapters sequentially on that job's VM. Jobs for different workloads may run concurrently on different VMs. **Compare participants within one workload and campaign.** A campaign is not one physical machine shared by all scenarios, and the next campaign may use different underlying hardware.

The Docker base is `node:24.15.0-bookworm`. The same exact Node runtime executes all adapters and the co-located autocannon generator. Each measured container has 2 logical CPUs of quota, 2 GiB memory and a 2 GiB combined memory/swap limit, a PID limit, read-only application files and no external network. These are shared limits for the server, generator and simulated upstream, not a dedicated 2 CPUs for the server. CPU quota is not physical core pinning. Container-visible host CPU count/RAM are not the container's entitlement; both host information and limits are recorded.

The base tag and pinned package locks aid reproduction but do not make the entire build byte-for-byte reproducible. The OS tag can move; the Meteor installer and production bundle dependency installation can depend on upstream availability. Receipts retain the built image ID, runner image version and input hashes. The image ID identifies the local build; it is not a downloadable registry digest or a promise that the image has been retained. Source and locks remain available at the source commit.

For each participant, scenario, rate and repetition:

1. Start a fresh production process, without clustering or a watcher.
2. Check the process token and full response; sample baseline for 1.5 seconds.
3. Warm up for 15 seconds at at most 100 req/s, then settle for 6 seconds.
4. Measure for 60 seconds at a rate ceiling of 100 or 1,000 req/s, requesting 32 connections.
5. Stop traffic and sample recovery for 30 seconds.
6. Check the response again, then terminate the process.

Repeat three times, rotating adapter order. An eight-participant, four-workload campaign has **192 cells**, split into 48 cells per job. A workload takes roughly 1.5–2 hours plus image build/verification; this is an estimate, not a timeout guarantee. The job timeout is 240 minutes, below GitHub's [six-hour hosted job limit](https://docs.github.com/en/actions/reference/limits).

## Metrics and interpretation

- Memory is server process RSS in bytes in raw data, divided by 1,048,576 for MiB. The page summarizes per-phase median RSS across repetitions and displays their min/median/max. Raw data retains samples, heap/external memory, baseline, recovery and sampled peaks. Samples cannot reveal the instantaneous peak. RSS is not live JS heap, and a 30-second recovery interval does not prove or disprove a memory leak.
- CPU is `(userUs + systemUs) / sampleWindowMs / 10`, expressed as percent of one logical CPU. It uses first-to-last telemetry samples inside load, a shorter window than the whole phase. Missing CPU data stays unavailable.
- Latency p50/p99 describes **completed** requests. Read errors and timeouts with it.
- Autocannon uses a rate-limited **closed-loop** model. Requested rate is a ceiling, not independently delivered arrivals. Finite connections and the generator can constrain observed throughput. At a fixed target, slightly greater completed RPS is not evidence of greater maximum capacity.
- Coverage is completions divided by `rate × generator duration`. It can exceed 100% with short-window timing/bursts. The raw file also preserves sent counts, effective connections and generator CPU/RSS/event-loop delay.
- A healthy repetition has at least 95% target coverage, p99 ≤ 250 ms, zero errors, zero timeouts and zero non-2xx responses. This is a short-window check. Unhealthy runs are included rather than discarded. Autocannon's errors/timeouts can overlap, so they are shown separately and never summed.
- The page preserves participant order and all repetitions. Large or overlapping ranges deserve further investigation; this is not an automated winner selector or a significance test.

## Verification and publication

The runner writes partial data incrementally and marks completion only at the end. Its verifier checks the full planned matrix, phase telemetry and source/installed-input hashes inside the same image. A verification receipt links raw SHA-256, source commit, GitHub run/attempt, runtime, runner image and container limits.

Only successful manual `measurement` workflows on `main` can archive. All requested scenario jobs must succeed. The archive additionally checks matrices, minimum measurement intervals, matching receipt hashes and campaign identity. The static-site builder rechecks hashes and regenerates summaries from raw data. Existing campaigns are never overwritten. A failed/incomplete workflow keeps available artifacts for diagnosis but does not enter the history. Re-run **all jobs** for a new consistent campaign; receipts from mixed workflow attempts are rejected.

The `results` branch is the durable history. GitHub Pages publishes a static copy, with anonymous downloads and links to each source commit and execution. This avoids depending on expiring Actions artifacts, which [require GitHub sign-in](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/download-workflow-artifacts).

Automated integrity verification is **not independent review**. Published data stays labelled automated and unreviewed; the runner's original `publishable: false` flag is preserved. This explorer exposes experimental evidence, and does not claim certification, host isolation or scientific significance. Review raw samples and environment before making a performance claim.

Smoke checks are functional only: 2-second warm-up, 3-second load and 2-second recovery, one repetition. They stay in Actions artifacts and never enter Pages charts. Forced-GC diagnostics are also excluded. No old Forge numbers or synthetic test fixtures are published as new measurements.

See [`benchmarks/v2/README.md`](../benchmarks/v2/README.md) for the inherited runner's detailed controls and limits. That document also describes historical Forge campaigns; those are background, not evidence produced by this repository.
