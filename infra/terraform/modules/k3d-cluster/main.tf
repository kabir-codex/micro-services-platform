# k3d has no native Terraform provider, so we shell out to the k3d CLI via
# null_resource + local-exec. This keeps cluster creation declarative and
# idempotent (destroy/create tracked through Terraform state) without
# depending on a cloud provider's own Terraform provider.

resource "null_resource" "k3d_cluster" {
  triggers = {
    cluster_name = var.cluster_name
    agent_count  = var.agent_count
    http_port    = var.http_port
    https_port   = var.https_port
  }

  provisioner "local-exec" {
    command = <<-EOT
      if ! k3d cluster list | grep -q "^${var.cluster_name} "; then
        k3d cluster create ${var.cluster_name} \
          --agents ${var.agent_count} \
          --port "${var.http_port}:80@loadbalancer" \
          --port "${var.https_port}:443@loadbalancer" \
          --k3s-arg "--disable=traefik@server:0" \
          --wait
      else
        echo "Cluster ${var.cluster_name} already exists, skipping create."
      fi
      k3d kubeconfig write ${var.cluster_name} --output ${path.module}/kubeconfig-${var.cluster_name}.yaml
    EOT
  }

  provisioner "local-exec" {
    when    = destroy
    command = "k3d cluster delete ${self.triggers.cluster_name}"
  }
}

# We disable Traefik (k3d's default ingress) because the platform installs
# ingress-nginx explicitly in modules/addons, matching what you'd do on a
# real cloud cluster.
