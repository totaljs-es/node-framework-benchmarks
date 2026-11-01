# Security

## Report a vulnerability

Do not post credentials or details of an exploitable vulnerability in a public issue or workflow log. Contact **hola@totaljs.es**, the Spanish Total.js contact used by our projects, with:

- the affected source commit, workflow, file or published endpoint;
- minimal reproduction steps and the expected/observed behavior;
- the potential impact and any relevant sanitized evidence.

Do not send access tokens, private keys or unrelated private data. Ordinary benchmark methodology questions and non-sensitive bugs can be discussed in public issues.

## Scope

This repository's benchmark adapters, runner, archive/receipt/site tools and GitHub Actions configuration are in scope. The website is a static GitHub Pages explorer; it does not expose an HTTP endpoint that launches benchmarks. The local preview server is a development utility, not a production service.

Node.js, Docker, GitHub Actions and the compared frameworks have their own upstream security processes. A successful contract test or integrity verifier does not establish that a dependency or deployment is secure.

## Maintainer practices

- Keep credentials out of source, artifacts, receipts and logs. Use the workflow's scoped GitHub token rather than committing a personal token.
- Keep untrusted pull-request execution separate from write-capable archival and deployment jobs. Validate dispatch inputs and preserve pinned action revisions.
- Build dependencies before measurements; measured containers disable external networking and use read-only source, resource limits and temporary writable space. These settings do not make arbitrary untrusted code safe to execute on a maintainer's machine.
- Preserve raw hashes, source provenance, append-only history and smoke/measurement separation. An integrity defect must be corrected transparently; never conceal it by rewriting previous measurements.
- Do not claim an audit, response-time guarantee or supported-version policy that has not been established.
