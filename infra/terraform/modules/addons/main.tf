resource "kubernetes_namespace" "ingress_nginx" {
  metadata { name = "ingress-nginx" }
}

resource "helm_release" "ingress_nginx" {
  name       = "ingress-nginx"
  repository = "https://kubernetes.github.io/ingress-nginx"
  chart      = "ingress-nginx"
  namespace  = kubernetes_namespace.ingress_nginx.metadata[0].name
  version    = "4.11.1"

  set {
    name  = "controller.service.type"
    value = "LoadBalancer"
  }
}

resource "kubernetes_namespace" "cert_manager" {
  metadata { name = "cert-manager" }
}

resource "helm_release" "cert_manager" {
  name       = "cert-manager"
  repository = "https://charts.jetstack.io"
  chart      = "cert-manager"
  namespace  = kubernetes_namespace.cert_manager.metadata[0].name
  version    = "v1.15.1"

  set {
    name  = "installCRDs"
    value = "true"
  }
}

resource "kubernetes_namespace" "monitoring" {
  count = var.install_monitoring ? 1 : 0
  metadata { name = "monitoring" }
}

resource "helm_release" "kube_prometheus_stack" {
  count      = var.install_monitoring ? 1 : 0
  name       = "kube-prometheus-stack"
  repository = "https://prometheus-community.github.io/helm-charts"
  chart      = "kube-prometheus-stack"
  namespace  = kubernetes_namespace.monitoring[0].metadata[0].name
  version    = "60.3.0"

  values = [file("${path.module}/../../../../monitoring/prometheus-values.yaml")]
}

resource "helm_release" "loki" {
  count      = var.install_monitoring ? 1 : 0
  name       = "loki"
  repository = "https://grafana.github.io/helm-charts"
  chart      = "loki-stack"
  namespace  = kubernetes_namespace.monitoring[0].metadata[0].name
  version    = "2.10.2"

  values = [file("${path.module}/../../../../monitoring/loki-values.yaml")]
}

resource "kubernetes_namespace" "platform" {
  metadata { name = "platform" }
}
