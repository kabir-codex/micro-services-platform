# Provisions a local k3d (k3s-in-Docker) cluster and wires up the same
# cluster addons you'd run in a real cloud environment: ingress-nginx,
# cert-manager, and the monitoring stack. This makes the local dev cluster
# a faithful, if smaller, stand-in for a cloud EKS/GKE/AKS cluster.

module "k3d_cluster" {
  source = "./modules/k3d-cluster"

  cluster_name = var.cluster_name
  agent_count  = var.agent_count
  http_port    = var.http_port
  https_port   = var.https_port
}

provider "kubernetes" {
  config_path    = module.k3d_cluster.kubeconfig_path
  config_context = module.k3d_cluster.kube_context
}

provider "helm" {
  kubernetes {
    config_path    = module.k3d_cluster.kubeconfig_path
    config_context = module.k3d_cluster.kube_context
  }
}

module "addons" {
  source     = "./modules/addons"
  depends_on = [module.k3d_cluster]

  install_monitoring = var.install_monitoring
}
