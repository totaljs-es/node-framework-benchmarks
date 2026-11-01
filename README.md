# Total.js Benchmarks

Reproducible benchmarks comparing **Total.js 4 & 5, Express, Fastify, Node.js HTTP, Meteor, AdonisJS and NestJS / Express**, with public GitHub Actions runs and an evidence-first results explorer.

[Results website](https://totaljs-es.github.io/node-framework-benchmarks/) · [Run benchmarks](https://github.com/totaljs-es/node-framework-benchmarks/actions/workflows/benchmarks.yml) · [Methodology](docs/methodology.md)

The website becomes available after GitHub Pages is enabled and its first deployment succeeds. Until the first measured campaign completes, it shows an empty state rather than example performance numbers.

## First-time setup

1. Push this checkout to the public repository's `main` branch.
2. In **Settings → Pages → Build and deployment → Source**, select **GitHub Actions**. The workflows declare their required token permissions: ordinary checks are read-only; only the archive job requests `contents: write`; Pages deployment requests `pages: write` and `id-token: write`. Organization policies must allow these actions/permissions and creation/updates of the `results` branch. No personal access token is needed.
3. In **Actions → Benchmarks → Run workflow**, select `main`, profile **smoke**, workload **all**, participants **all**. This builds Meteor too and checks all eight adapters. It is a functional check, not performance evidence.
4. Once that succeeds, run the same workflow with profile **measurement**. Choose **all** workloads for the full comparison, or one for a focused campaign.

Measured output is archived only when every requested scenario completes and verifies. The website rebuilds automatically after that successful workflow. A failed workflow retains available raw/partial artifacts for diagnosis and does not update the public measurement history. Use **Re-run all jobs** when retrying a campaign, so every receipt belongs to the same attempt.

## What runs

| Workflow | Trigger | Purpose |
| --- | --- | --- |
| **Checks** | PRs and pushes to `main` | Tests, empty-site build, seven-adapter contracts and functional runner smoke; Meteor is exercised in manual `all` runs |
| **Benchmarks** | Manual | Choose smoke/measurement, workload, and all eight participants or core seven without Meteor |
| **Results website** | Push to `main`, successful benchmark workflow on `main`, or manual | Rebuild the static explorer from the durable history and deploy GitHub Pages |

Measurements use Node.js **24.15.0**, locked adapter dependencies, production processes, the same requested traffic, rotated participant order and 2 CPU / 2 GiB container limits. There are four workloads: `hello`, `catalog`, `validate` and `upstream`. Each workload gets its own VM. Participants run **sequentially within that VM**. Different workloads/campaigns can use different physical hosts.

The full campaign runs 192 cells: 8 participants × 4 workloads × 2 requested rates × 3 repetitions. Each workload job normally takes around 1.5–2 hours plus build time. There is no automatic daily schedule or expensive full run on every push. Hosted-runner noise and the co-located closed-loop load generator limit the conclusions; read the [methodology](docs/methodology.md) before interpreting the charts.

## Results and provenance

The **`results` branch** stores an append-only `index.json` and `runs/<run-id>-<attempt>/` directory for each measured campaign. Each scenario has original JSON, a SHA-256-linked verification receipt and a Markdown report. A campaign summary supports the explorer; the site builder verifies that summary against the raw measurements before publishing it.

The website provides campaign/workload/rate/metric/participant filters, min–median–max charts, health/error counters, exact versions, environment details and CSV/JSON/Markdown downloads. URLs preserve the selected campaign and comparison. It compares rows within a scenario and never pools VMs into a single hardware result or automatically picks a winner. Downloaded CSV units: memory in MiB, CPU in percent of one logical CPU, latency in ms, coverage in percent, throughput in completed req/s.

Results are **automatically verified, not independently reviewed**. Raw runner outputs retain `publishable: false`; the website explicitly labels them experimental automated measurements. Smoke and GC diagnostic data never enter measurement charts. Existing Forge data is not imported.

## Run locally

Requires Docker with Linux containers. The default target includes Meteor; use `--target core` to omit its build, and omit `meteor` from adapter selections.

```sh
docker build --target full -t framework-benchmarks .
mkdir -p results
docker run --rm --cpus 2 --memory 2g --memory-swap 2g --pids-limit 256 \
  --read-only --network none --user "$(id -u):$(id -g)" \
  --tmpfs /tmp:rw,nosuid,nodev,size=512m,mode=1777 \
  -v "$PWD/results:/results" framework-benchmarks \
  node benchmarks/v2/run.cjs --frameworks totaljs4,totaljs,express,fastify,node,meteor,adonis,nestjs \
  --workloads hello --rates 100,1000 --seconds 60 --warmup 15 --rest 30 --reps 3 \
  --connections 32 --out /results/local-hello.json

docker run --rm --network none --read-only -v "$PWD/results:/results:ro" \
  framework-benchmarks node benchmarks/v2/verify.cjs /results/local-hello.json
```

Use a new output filename each time; the runner refuses overwrites. On Apple Silicon, adding `--platform linux/amd64` to build/run uses emulation and changes the environment; label it accordingly, and do not compare it as native GitHub x64 evidence. Local files are not automatically imported as GitHub campaign results.

## Work on the website

The root package has **no npm dependencies**. With Node 24 installed:

```sh
npm test
npm run build
npm run serve
# http://127.0.0.1:4173
```

Without a `history/` directory the build shows an empty state. To preview actual published history:

```sh
git fetch origin results
mkdir -p history
git archive origin/results | tar -x -C history
npm run build
```

The frontend is plain HTML/CSS/JavaScript with relative asset paths for project Pages hosting. It needs no application server, API credentials or frontend framework. Optional Google Fonts fall back to system fonts if unavailable.

## Layout

- `benchmarks/v2/`: inherited runner, shared work, native adapters, telemetry, integrity verifier and Markdown report.
- `benchmarks/apps/`: locked adapter dependencies and the Meteor source app.
- `scripts/`: campaign planning, receipts, durable archive and static-site build.
- `site/`: results explorer.
- `tests/`: synthetic integrity/regression fixtures, never published by the website builder.
- `.github/workflows/`: functional checks, manual measurements and Pages deployment.

The suite was extracted from [Total.js Forge](https://forge.totaljs.es/es/benchmarks/). This repository is maintained by Spanish Total.js Platform, part of the Total.js community; the project has an interest in Total.js. All participant implementations, raw measurements and methodology are public for inspection. Dependencies retain their upstream licenses; this repository's code is MIT licensed.

## Toto branding

The website uses the official Toto™ face and favicon kit from [Spanish Total.js](https://github.com/totaljs-es/toto), including Apple and 192/512 px icons. The images are unmodified and served locally with relative paths for GitHub Pages. Toto artwork in `site/assets/toto/` is excluded from the MIT code license and retains its [own license](site/assets/toto/LICENSE.md).
