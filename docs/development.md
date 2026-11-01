# Development and maintenance

Technical instructions for reproducing measurements, developing the website and maintaining the GitHub workflows. For the public project overview, see [README.md](../README.md); read the [methodology](methodology.md) before interpreting results.

## GitHub Actions and Pages

1. Push this checkout to the public repository's `main` branch.
2. In **Settings → Pages → Build and deployment → Source**, select **GitHub Actions**. The workflows declare their required token permissions: ordinary checks are read-only; only the archive job requests `contents: write`; Pages deployment requests `pages: write` and `id-token: write`. Organization policies must allow these actions/permissions and creation/updates of the `results` branch. No personal access token is needed.
3. In **Actions → Benchmarks → Run workflow**, select `main`, profile **smoke**, workload **all**, participants **all**. This builds Meteor too and checks all eight adapters. It is a functional check, not performance evidence.
4. Once that succeeds, run the same workflow with profile **measurement**. Choose **all** workloads for the full comparison, or one for a focused campaign.

Measured output is archived only when every requested scenario completes and verifies. The website rebuilds automatically after that successful workflow. A failed workflow retains available raw/partial artifacts for diagnosis and does not update the public measurement history. Use **Re-run all jobs** when retrying a campaign, so every receipt belongs to the same attempt.

## Workflows

| Workflow | Trigger | Purpose |
| --- | --- | --- |
| **Checks** | PRs and pushes to `main` | Tests, empty-site build, seven-adapter contracts and functional runner smoke; Meteor is exercised in manual `all` runs |
| **Benchmarks** | Manual | Choose smoke/measurement, workload, and all eight participants or core seven without Meteor |
| **Results website** | Push to `main`, successful benchmark workflow on `main`, or manual | Rebuild the static explorer from the durable history and deploy GitHub Pages |

Measurements use Node.js **24.15.0**, locked adapter dependencies, production processes, the same requested traffic, rotated participant order and 2 CPU / 2 GiB container limits. There are four workloads: `hello`, `catalog`, `validate` and `upstream`. Each workload gets its own VM. Participants run **sequentially within that VM**. Different workloads/campaigns can use different physical hosts.

The full campaign runs 192 cells: 8 participants × 4 workloads × 2 requested rates × 3 repetitions. Each workload job normally takes around 1.5–2 hours plus build time. There is no automatic daily schedule or expensive full run on every push. Hosted-runner noise and the co-located closed-loop load generator limit the conclusions; read the [methodology](methodology.md) before interpreting the charts.

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
