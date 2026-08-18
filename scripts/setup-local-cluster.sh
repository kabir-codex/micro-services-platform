#!/usr/bin/env bash
# Alternative to `terraform apply` in infra/terraform: stands up the same
# cluster + addons using plain CLI commands. Useful if you'd rather not
# install Terraform, or if you want Minikube instead of k3d.
set -euo pipefail

PROVIDER="k3d"
if [[ "${1:-}" == "--provider" ]]; then
  PROVIDER="$2"
fi

echo "==> Using provider: ${PROVIDER}"

if [[ "$PROVIDER" == "k3d" ]]; then
  command -v k3d >/dev/null || { echo "Install k3d first: https://k3d.io"; exit 1; }
  k3d cluster create platform-local \
    --agents 2 \
    --port "8081:80@loadbalancer" \
    --port "8443:443@loadbalancer" \
    --k3s-arg "--disable=traefik@server:0" \
    --wait
elif [[ "$PROVIDER" == "minikube" ]]; then
  command -v minikube >/dev/null || { echo "Install minikube first."; exit 1; }
  minikube start --cpus=4 --memory=8192 --addons=ingress
else
  echo "Unknown provider: $PROVIDER (expected k3d or minikube)"; exit 1
fi

echo "==> Installing cert-manager"
helm repo add jetstack https://charts.jetstack.io >/dev/null
helm upgrade --install cert-manager jetstack/cert-manager \
  --namespace cert-manager --create-namespace \
  --set installCRDs=true

echo "==> Installing ingress-nginx"
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx >/dev/null
helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx --create-namespace

echo "==> Installing kube-prometheus-stack + Loki"
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts >/dev/null
helm repo add grafana https://grafana.github.io/helm-charts >/dev/null
helm repo update >/dev/null
helm upgrade --install kube-prometheus-stack prometheus-community/kube-prometheus-stack \
  --namespace monitoring --create-namespace \
  -f "$(dirname "$0")/../monitoring/prometheus-values.yaml"
helm upgrade --install loki grafana/loki-stack \
  --namespace monitoring \
  -f "$(dirname "$0")/../monitoring/loki-values.yaml"

kubectl apply -f "$(dirname "$0")/../k8s/namespaces.yaml"
kubectl apply -f "$(dirname "$0")/../k8s/cert-manager/cluster-issuer.yaml"

echo "==> Cluster ready. Next: ./bootstrap-argocd.sh"
