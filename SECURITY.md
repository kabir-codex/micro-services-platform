# Security

This project is a local-first demonstration platform, but it still follows
security-basics that are worth keeping when you take it further.

## Secrets are never committed

- `.env` files, `k8s/postgres/secret.yaml`, Terraform state, and kubeconfigs
  are gitignored (see `.gitignore`).
- Real credentials are provided through a `Secret` (see
  `k8s/postgres/secret.example.yaml` for the shape) and referenced by name
  from the deployments via `secretKeyRef`.
- The example secret file ships with a `CHANGE_ME` placeholder — copy it to
  `secret.yaml` (gitignored) and fill in real values before applying.

## Containers run non-root

Each service Dockerfile creates and switches to an unprivileged user, and the
Helm charts set `runAsNonRoot: true` with `allowPrivilegeEscalation: false`
and dropped capabilities.

## TLS

Traffic to `platform.local` is served over HTTPS using cert-manager with a
self-signed issuer for local use (see
`k8s/cert-manager/cluster-issuer.yaml`). If this platform is ever exposed
beyond localhost, replace the self-signed issuer with a Let's Encrypt (or
equivalent) ACME issuer.

## Deploys

Changes reach the cluster only through GitOps (ArgoCD reconciles from this
repository), so the reviewable commit history is the deployment audit trail.

## Reporting a vulnerability

This is a demonstration project; if you find a real vulnerability in a
production use of it, please open a GitHub issue with details.
