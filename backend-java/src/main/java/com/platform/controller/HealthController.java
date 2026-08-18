package com.platform.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

// Actuator already exposes /actuator/health for readiness/liveness probes;
// this is a plain, dependency-free /health kept for parity with the other
// service and for simple curl checks.
@RestController
public class HealthController {

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "ok");
    }
}
