# backend-node (orders API)

Helm chart for the Node/Express orders service. Deployed by ArgoCD from this
repository — do not `helm install` by hand unless debugging; the GitOps
controller owns the cluster state.

## Values that matter

| Key | Default | Notes |
|---|---|---|
| `image.tag` | set by CI | Bumped automatically on every merge to `main` |
| `service.port` | `4000` | Container port for the API |
| `ingress.path` | `/api/orders` | Routed via the platform ingress |
| `autoscaling.*` | 2–8 replicas @ 70% CPU | HPA template lives in `templates/hpa.yaml` |
| `networkPolicy.enabled` | `true` | Restricts ingress to the ingress-nginx namespace |

## Probes

- **readiness** → `GET /ready` (checks Postgres + Redis)
- **liveness** → `GET /health` (process only)

The PodDisruptionBudget (`templates/pdb.yaml`) is created only when
autoscaling is enabled, guaranteeing at least one replica survives drains.
