# frontend (React dashboard)

Helm chart for the NGINX-served React dashboard. Deployed by ArgoCD from this
repository — do not `helm install` by hand unless debugging; the GitOps
controller owns the cluster state.

## Values that matter

| Key | Default | Notes |
|---|---|---|
| `image.tag` | `latest` | Bumped automatically on every merge to `main` |
| `service.port` | `8080` | NGINX listen port inside the container |
| `ingress.host` | `platform.local` | TLS-terminated via cert-manager |
| `autoscaling.*` | 2–5 replicas @ 70% CPU | HPA template lives in `templates/hpa.yaml` |
| `networkPolicy.enabled` | `true` | Restricts ingress to the ingress-nginx namespace |

## Notes

- The backend URLs are **build-time** (`VITE_*`) values baked into the image
  by CI — there is no runtime env override; see the root README.
- **readiness/liveness** → `GET /healthz` served directly by NGINX.
- Static assets are cached aggressively (`/assets/` is immutable);
  `index.html` is always revalidated.
