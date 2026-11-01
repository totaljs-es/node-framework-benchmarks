# Initial validation — 2026-11-01

The repository has been prepared locally. No measurement campaign, remote workflow or GitHub Pages deployment has been completed from this checkout.

## Passed locally

- Eight automated integrity tests (`npm test`): unit conversion/ranges, unhealthy repetitions, overlapping error counters, unavailable CPU, incomplete/duplicate/missing cells, smoke/GC exclusion, minimum measurement intervals, raw receipt hashes, mixed workflow attempts, immutable campaign IDs, tampered summaries/download paths, and a genuinely empty first website build.
- Static website build with no historical data. No synthetic or historical Forge performance numbers are included in the published input tree.
- GitHub Actions workflow validation with actionlint 1.7.12; JavaScript syntax checks across 15 runner/tool/frontend files.
- Browser checks in headless Chrome at desktop (1440 px) and mobile (390 px): empty and populated states, URL selections, workload/rate/metric filters, participant selection, chart/table updates, CSV download, evidence links, no page overflow and no JavaScript runtime errors. Populated-state data was injected into the test browser only, visibly labelled synthetic, and is not in the site or history.
- Native contracts for seven locally available adapters: Total.js 4, Total.js 5, Express, Fastify, Node HTTP, AdonisJS and NestJS. Checked full workload responses, malformed/missing/empty validation rejection, process identity and telemetry.
- Runner smoke across those seven adapters and two workloads (`hello`, `validate`), 14 cells. Completion/input verification and report generation passed with `--allow-smoke`. These short runs are functional evidence only and are not archived or charted.
- Local disposable Git integration check: first creation of an orphan `results` branch, appending a later campaign, pushing from the shared worktree, and preserving `main` source files.

Local contracts/smoke used the existing Forge adapter installations and **Node v24.22.1 on macOS arm64**, not the pinned Linux Docker environment. They establish local functional behavior only, not reproducible performance or a successful clean container installation.

## Still to validate on GitHub

Docker is not installed on this local machine. The clean Linux image build, Meteor 3.5.2 bundle, all-eight smoke run, pinned Node 24.15.0 measurement environment, Actions artifact transfer, authenticated archive push and Pages deployment remain unverified end to end. Begin with the manual `smoke` / `all` / `all` workflow before running measurements.

The public repository exists on `main`; Pages was not enabled when inspected. The existing local GitHub credential returned **HTTP 403** on a dry-run push, so no remote changes were made. Push the prepared changes with an account/credential authorized for this repository, then select **GitHub Actions** in Settings → Pages. See the [setup steps](development.md#github-actions-and-pages).
