# backend-java (catalog API)

Helm chart for the Spring Boot catalog service. Deployed by ArgoCD from this
repository — do not `helm install` by hand unless debugging; the GitOps
controller owns the cluster state.

## Values that matter

| Key | Default | Notes |
|---|---|---|
| `image.tag` | set by CI | Bumped automatically on every merge to `main` |
| `service.port` | `8080` | Container port for the API |
| `ingress.path` | `/api/catalog` | Routed via the platform ingress |
| `autoscaling.*` | 2–6 replicas @ 70% CPU | HPA template lives in `templates/hpa.yaml` |
| `networkPolicy.enabled` | `true` | Restricts ingress to the ingress-nginx namespace |

## Probes

- **readiness** → `/actuator/health` (Spring Boot health)
- **liveness** → `/actuator/health`

The PodDisruptionBudget (`templates/pdb.yaml`) is created only when
autoscaling is enabled, guaranteeing at least one replica survives drains.
