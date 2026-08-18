#!/usr/bin/env bash
# Installs ArgoCD and registers this repo's argocd/app-of-apps.yaml so
# every other Application (frontend, backend-node, backend-java, infra)
# is picked up automatically from then on.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "==> Installing ArgoCD"
kubectl create namespace argocd --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

echo "==> Waiting for argocd-server to be ready"
kubectl -n argocd rollout status deployment/argocd-server --timeout=180s

echo "==> Registering app-of-apps"
kubectl apply -f "$ROOT_DIR/argocd/app-of-apps.yaml"

INITIAL_PW=$(kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d)

cat <<MSG

ArgoCD is installed.

  kubectl -n argocd port-forward svc/argocd-server 8080:443

Then open https://localhost:8080
  user:     admin
  password: ${INITIAL_PW}

(Change this password after first login — it's only meant for bootstrap.)
MSG
