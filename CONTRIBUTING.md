# Contributing

Issues and focused pull requests against `main` are welcome. Read [README.md](README.md), [AGENTS.md](AGENTS.md) and the [methodology](docs/methodology.md) first.

## Describe the change

For a bug, include the source commit, affected adapter/scenario, exact Node/framework versions, platform, reproduction steps and expected/observed behavior. For a published measurement, link its GitHub workflow run and campaign JSON. Do not include tokens or private machine information.

Performance changes need an explanation of the work before and after. A comparison must retain equivalent observable responses and traffic across participants. Keep errors and all repetitions visible. An improvement in a short smoke check is not performance evidence.

## Checks

The root package has no npm dependencies. With Node.js 24:

```sh
npm test
npm run build
git diff --check
```

For website changes, serve the build with `npm run serve` and inspect desktop/mobile layouts and project-relative asset paths. For documentation-only changes, check the referenced paths and commands; a full benchmark is unnecessary.

For adapter/runner changes, use the Docker contracts and smoke steps described in [AGENTS.md](AGENTS.md) and README. Include Meteor when affected. Verify runner output against the same built inputs. State which checks passed and which could not run. CI checks seven adapters; the manual `all` workflow also builds and checks Meteor.

## Results and versions

Update package manifests and locks together, and preserve the common pinned runtime. A new version needs a new measured campaign before it has public performance data. Never rewrite historical results, change their version labels, import smoke/synthetic fixtures as measurements, or force-push the `results` branch.

The public website labels measurements automated and unreviewed. Retain source hashes, workflow links, runtime/container context, unhealthy runs and the limits of the closed-loop co-located generator.

## Style and license

Use clear English, existing CommonJS/static frontend conventions and focused changes. Avoid unnecessary dependencies. Visible branding is Total.js Benchmarks; use the existing unmodified Toto assets and layout.

Contributed code follows the repository's [MIT license](LICENSE). Toto artwork/icons retain their [separate license](site/assets/toto/LICENSE.md); do not treat them as MIT assets or submit unauthorized derivatives. Report vulnerabilities as described in [SECURITY.md](SECURITY.md).
