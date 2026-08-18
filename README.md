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
