output "kubeconfig_path" {
  description = "Path to the kubeconfig for this cluster"
  value       = module.k3d_cluster.kubeconfig_path
}

output "kube_context" {
  value = module.k3d_cluster.kube_context
}

output "next_steps" {
  value = <<-EOT
    Cluster '${var.cluster_name}' is up.

    export KUBECONFIG=${module.k3d_cluster.kubeconfig_path}
    kubectl get nodes

    Ingress is reachable at:
      http://localhost:${var.http_port}
      https://localhost:${var.https_port}

    Next: run scripts/bootstrap-argocd.sh to install ArgoCD and register
    this repo as the GitOps source of truth.
  EOT
}
