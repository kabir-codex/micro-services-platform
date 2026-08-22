package com.platform.controller;

import com.platform.model.Product;
import com.platform.repository.ProductRepository;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;


import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/catalog")
public class CatalogController {

    @Autowired
    private ProductRepository repository;

    // Landing metadata for the catalog API, mirroring the orders service.
    @GetMapping
    public Map<String, Object> landing() {
        return Map.of(
                "service", "catalog-api",
                "endpoints", List.of(
                        "/health",
                        "/actuator/health",
                        "GET /catalog/products[?category=]",
                        "GET /catalog/products/count",
                        "GET /catalog/products/{id}",
                        "POST /catalog/products",
                        "PUT /catalog/products/{id}",
                        "DELETE /catalog/products/{id}",
                        "/actuator/prometheus"));
    }

    @GetMapping("/products")
    public List<Product> listProducts(@RequestParam(required = false) String category) {
        if (category != null && !category.isBlank()) {
            return repository.findByCategoryIgnoreCase(category);
        }
        return repository.findAll();
    }

    @GetMapping("/products/count")
    public Map<String, Long> countProducts(@RequestParam(required = false) String category) {
        long count = (category != null && !category.isBlank())
                ? repository.findByCategoryIgnoreCase(category).size()
                : repository.count();
        return Map.of("count", count);
    }

    @GetMapping("/products/{id}")
    public Product getProduct(@PathVariable Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "product not found"));
    }

    @PostMapping("/products")
    public Product createProduct(@Valid @RequestBody Product product) {
        return repository.save(product);
    }

    @PutMapping("/products/{id}")
    public Product updateProduct(@PathVariable Long id, @Valid @RequestBody Product product) {
        Product existing = repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "product not found"));
        existing.setName(product.getName());
        existing.setCategory(product.getCategory());
        existing.setPrice(product.getPrice());
        return repository.save(existing);
    }

    @DeleteMapping("/products/{id}")
    public ResponseEntity<Void> deleteProduct(@PathVariable Long id) {
        if (!repository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "product not found");
        }
        repository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
