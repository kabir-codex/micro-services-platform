package com.platform.controller;

import com.platform.model.Product;
import com.platform.repository.ProductRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

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

    @PostMapping("/products")
    public Product createProduct(@RequestBody Product product) {
        return repository.save(product);
    }
}
