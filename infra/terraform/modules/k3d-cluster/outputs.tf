output "kubeconfig_path" {
  value      = "${path.module}/kubeconfig-${var.cluster_name}.yaml"
  depends_on = [null_resource.k3d_cluster]
}

output "kube_context" {
  value = "k3d-${var.cluster_name}"
}
