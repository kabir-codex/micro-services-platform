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

@RestController
@RequestMapping("/catalog")
public class CatalogController {

    @Autowired
    private ProductRepository repository;

    @GetMapping("/products")
    public List<Product> listProducts() {
        return repository.findAll();
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
