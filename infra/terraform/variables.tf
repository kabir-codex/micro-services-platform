variable "cluster_name" {
  description = "Name of the local k3d cluster"
  type        = string
  default     = "platform-local"
}

variable "agent_count" {
  description = "Number of k3d worker nodes"
  type        = number
  default     = 2
}

variable "http_port" {
  description = "Host port mapped to the cluster's ingress (80)"
  type        = number
  default     = 8081
}

variable "https_port" {
  description = "Host port mapped to the cluster's ingress (443)"
  type        = number
  default     = 8443
}

variable "install_monitoring" {
  description = "Install kube-prometheus-stack + Loki"
  type        = bool
  default     = true
}
