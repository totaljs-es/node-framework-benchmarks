# Node Framework Benchmarks — measurement

Versions: totaljs4 0.0.99, totaljs 0.0.20-6, express 5.3.0, fastify 5.12.7, node v24.15.0, meteor 3.5.2, adonis 6.21.0, nestjs 12.1.3, generator 8.0.0.

Each cell shows median [min–max] across repetitions; rows keep run order, without ranking. RSS is MiB, not live JS heap. CPU is % of one logical CPU over the sampled load window.

| Framework | Workload | Target req/s | Runs healthy/total | Coverage % | p99 ms | RSS baseline MiB | RSS load MiB | RSS recovered MiB | CPU % |
|---|---|---:|---:|---|---|---|---|---|---|
| totaljs4 | validate | 100 | 3/3 | 100.7 [100.3–101.2] | 3.0 [3.0–4.0] | 62.9 [62.7–63.0] | 101.7 [96.6–102.6] | 102.6 [96.8–103.1] | 0.7 [0.7–0.8] |
| totaljs | validate | 100 | 3/3 | 100.3 [100.0–100.4] | 2.0 [2.0–2.0] | 63.9 [63.7–64.1] | 83.3 [82.1–83.9] | 83.6 [82.3–83.9] | 0.6 [0.6–0.6] |
| express | validate | 100 | 3/3 | 100.5 [100.0–100.8] | 3.0 [2.0–4.0] | 74.6 [74.3–74.8] | 97.4 [96.7–97.8] | 97.3 [97.0–97.9] | 0.7 [0.7–0.8] |
| fastify | validate | 100 | 3/3 | 100.3 [100.2–100.6] | 2.0 [2.0–2.0] | 76.4 [76.4–76.6] | 97.4 [96.3–97.8] | 98.2 [96.3–98.2] | 0.6 [0.5–0.6] |
| node | validate | 100 | 3/3 | 100.9 [100.5–101.5] | 2.0 [2.0–2.0] | 50.9 [50.7–51.0] | 72.1 [69.3–72.7] | 72.7 [69.5–73.4] | 0.5 [0.5–0.6] |
| meteor | validate | 100 | 3/3 | 100.0 [100.0–100.3] | 7.0 [7.0–8.0] | 124.5 [123.8–124.5] | 139.5 [133.5–139.5] | 168.7 [162.2–169.7] | 1.8 [1.8–1.9] |
| adonis | validate | 100 | 3/3 | 100.0 [100.0–100.2] | 4.0 [4.0–5.0] | 113.3 [113.2–113.5] | 145.4 [144.9–146.3] | 145.9 [145.0–146.8] | 1.2 [1.2–1.2] |
| nestjs | validate | 100 | 3/3 | 100.2 [100.1–100.3] | 3.0 [3.0–4.0] | 100.5 [99.8–101.0] | 130.1 [129.5–130.9] | 130.2 [130.1–131.7] | 0.9 [0.8–0.9] |
| totaljs4 | validate | 1000 | 3/3 | 100.0 [100.0–100.0] | 4.0 [4.0–4.0] | 62.8 [62.7–62.9] | 171.8 [170.6–173.8] | 180.8 [180.2–181.8] | 4.5 [4.3–4.6] |
| totaljs | validate | 1000 | 3/3 | 100.0 [100.0–100.1] | 1.0 [1.0–2.0] | 64.1 [64.0–64.1] | 83.7 [82.9–87.2] | 84.1 [83.3–87.5] | 2.4 [2.4–2.4] |
| express | validate | 1000 | 3/3 | 100.0 [100.0–100.0] | 2.0 [2.0–2.0] | 74.6 [74.3–76.0] | 94.7 [94.5–100.3] | 94.7 [94.6–100.3] | 3.4 [3.4–3.6] |
| fastify | validate | 1000 | 3/3 | 100.0 [100.0–100.0] | 1.0 [1.0–1.0] | 76.6 [76.5–76.8] | 97.9 [97.9–98.4] | 97.9 [96.3–98.1] | 2.2 [2.2–2.2] |
| node | validate | 1000 | 3/3 | 100.0 [100.0–100.0] | 1.0 [1.0–1.0] | 50.8 [50.7–50.8] | 72.7 [71.1–73.3] | 76.6 [75.1–77.0] | 2.2 [2.1–2.3] |
| meteor | validate | 1000 | 3/3 | 100.0 [100.0–100.0] | 7.0 [7.0–7.0] | 123.1 [122.3–124.5] | 177.1 [171.9–177.5] | 178.0 [173.9–178.8] | 7.5 [7.5–8.1] |
| adonis | validate | 1000 | 3/3 | 100.0 [100.0–100.0] | 5.0 [4.0–14.0] | 113.3 [113.2–113.5] | 146.7 [145.0–148.1] | 146.7 [145.4–147.9] | 6.5 [6.2–6.6] |
| nestjs | validate | 1000 | 3/3 | 100.0 [100.0–100.0] | 3.0 [3.0–19.0] | 100.4 [99.8–101.8] | 132.6 [132.5–133.2] | 132.6 [132.5–133.3] | 4.3 [4.2–4.3] |

Memory columns are medians within each phase, then summarized across runs. Raw JSON retains sampled peaks, all telemetry, errors and timeouts. Coverage compares completions with the configured rate target, not known independent arrivals. Read the raw counters and generator health before comparing rows.
