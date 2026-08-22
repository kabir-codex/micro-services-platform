# Production-Ready Microservices Platform

A local-first, portfolio-grade DevOps platform demonstrating the full lifecycle
of a modern microservices system: containerization, GitOps delivery,
observability, and infrastructure as code — all runnable on a laptop with
**k3d** (k3s in Docker) or **Minikube**, no cloud account required.

```
GitHub
  │
GitHub Actions  (build, test, scan, push image)
  │
GHCR (ghcr.io)
  │
ArgoCD          (watches this repo, syncs to cluster)
  │
Kubernetes (k3d/Minikube)
  ├── frontend        (React, served by NGINX)
  ├── backend-node     (Express API)
  ├── backend-java     (Spring Boot API)
  ├── redis            (cache)
  ├── postgresql       (database)
  ├── nginx-ingress    (HTTPS entrypoint)
  ├── cert-manager     (self-signed / Let's Encrypt certs)
  └── kube-prometheus-stack + Loki  (metrics, dashboards, logs)
```

## Why two backends?

`backend-node` and `backend-java` are two independent microservices (not two
copies of the same thing) — Node/Express owns a lightweight "orders" API,
Spring Boot owns a "catalog" API. Both talk to the same Postgres instance
(separate schemas) and share Redis for caching. This is deliberately polyglot
to demonstrate that the platform (CI, Helm, ArgoCD, monitoring) is
language-agnostic.

## API surface

**Orders API** (`backend-node`, port 4000)

| Method | Path | Notes |
|---|---|---|
| GET | `/` | Service metadata + endpoint list |
| GET | `/health` | Liveness (no dependency checks) |
| GET | `/ready` | Readiness — 503 unless Postgres + Redis respond |
| GET | `/orders` | List orders; optional `?status=`, `?limit=`, `?offset=` |
| GET | `/orders/:id` | Fetch one order; 404 when missing |
| POST | `/orders` | Create; validates item + quantity; honors `Idempotency-Key` |
| PATCH | `/orders/:id/status` | Lifecycle transition (`processing → shipped → delivered`, or cancel); 409 on invalid moves |
| DELETE | `/orders/:id` | Remove; 204 on success |
| GET | `/metrics` | Prometheus scrape (never self-instrumented) |

**Catalog API** (`backend-java`, port 8080)

| Method | Path | Notes |
|---|---|---|
| GET | `/catalog` | Service metadata + endpoint list |
| GET | `/health` | Plain health check |
| GET | `/actuator/health` | Spring Boot health (used by probes) |
| GET | `/catalog/products` | List products; optional `?category=` filter |
| GET | `/catalog/products/count` | Aggregate count; optional `?category=` |
| GET | `/catalog/products/{id}` | Fetch one product; 404 when missing |
| POST | `/catalog/products` | Create; bean-validated, field-level error JSON |
| PUT | `/catalog/products/{id}` | Update; bean-validated |
| DELETE | `/catalog/products/{id}` | Remove; 204 on success |
| GET | `/actuator/prometheus` | Prometheus scrape |

## Repo layout

| Path | What it is |
|---|---|
| `frontend/` | React app, Dockerfile, nginx config |
| `backend-node/` | Express "orders" API |
| `backend-java/` | Spring Boot "catalog" API |
| `infra/terraform/` | Provisions a local k3d cluster + cluster addons via Terraform |
| `helm/` | One Helm chart per service (deployment, service, ingress, HPA) |
| `k8s/` | Plain manifests for stateful infra (Postgres, Redis, namespaces, cert-manager issuers) |
| `argocd/` | App-of-apps GitOps definitions |
| `monitoring/` | Prometheus/Grafana/Loki Helm values + a starter dashboard |
| `.github/workflows/` | CI: lint, test, build, scan, push image per service |
| `scripts/` | One-command bootstrap scripts |

## Quickstart

```bash
# 1. Create the local cluster + core addons (ingress-nginx, cert-manager,
#    kube-prometheus-stack, loki) via Terraform
cd infra/terraform
terraform init
terraform apply

# 2. Point kubectl at it (terraform output prints the exact command)
export KUBECONFIG=$(terraform output -raw kubeconfig_path)

# 3. Install ArgoCD and register this repo as the source of truth
cd ../../scripts
./bootstrap-argocd.sh

# 4. Watch ArgoCD sync frontend, backend-node, backend-java, and the
#    monitoring stack
kubectl -n argocd port-forward svc/argocd-server 8080:443
```

Open `https://localhost:8080` for ArgoCD, and `https://platform.local`
(after adding it to `/etc/hosts` → `127.0.0.1`) for the app itself.

In Kubernetes the frontend discovers its backends through the ingress
(`https://platform.local/api/orders` → backend-node, `/api/catalog` →
backend-java); the Docker Compose path uses the `VITE_*` build-time env vars
below instead.

## Everyday commands

The `Makefile` wraps the common workflows:

```bash
make test     # all three test suites (node, java, frontend)
make lint     # all linters
make up       # docker compose dev environment
make seed     # seed the local database (localhost only)
```

## Frontend → backend URLs

The Vite frontend resolves its APIs at build time. Locally (no cluster), pass
`VITE_ORDERS_API_URL` and `VITE_CATALOG_API_URL` so the dashboard can reach the
dev-served backends:

```bash
# in docker-compose.yml under frontend build args / env
VITE_ORDERS_API_URL=http://localhost:4000
VITE_CATALOG_API_URL=http://localhost:8080
```

Without these, the dashboard falls back to the same `localhost` ports, which is
what the compose file already sets.

## What this demonstrates

- **Infrastructure as Code** — Terraform provisions the cluster and every
  cluster-wide addon; nothing is clicked into existence by hand.
- **GitOps continuous delivery** — ArgoCD reconciles cluster state from this
  repo; a `git push` is the only deploy step.
- **Progressive delivery** — rolling updates with `maxUnavailable: 0`,
  readiness/liveness probes, and ArgoCD auto-rollback on a failed health
  check.
- **Observability** — Prometheus scrapes app + cluster metrics, Grafana
  dashboards visualize them, Loki aggregates logs from every pod.
  Alert rules live in `monitoring/platform-alerts.yaml`: a warning fires on
  >5% 5xx responses (2m) and on readiness flapping (>4 changes in 10m).
- **Security basics** — TLS via cert-manager, secrets kept out of git
  (see `k8s/postgres/secret.example.yaml`), non-root containers, resource
  limits.
- **Elastic scaling** — `HorizontalPodAutoscaler` on each service, driven by
  CPU (and, for backend-node, a custom request-latency metric via the
  Prometheus adapter).

## Local cluster options

The Terraform module defaults to **k3d**. To use **Minikube** instead, skip
`infra/terraform` and run:

```bash
minikube start --cpus=4 --memory=8192 --addons=ingress
./scripts/setup-local-cluster.sh --provider minikube
```

See `scripts/setup-local-cluster.sh` for details on both paths.
