package com.platform.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.platform.model.Product;
import com.platform.repository.ProductRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(CatalogController.class)
class CatalogControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private ProductRepository repository;

    @Test
    void listProductsReturnsAll() throws Exception {
        given(repository.findAll()).willReturn(List.of(new Product("Mouse", "Peripherals", 19.99)));

        mockMvc.perform(get("/catalog/products"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].name").value("Mouse"));
    }

    @Test
    void createProductPersists() throws Exception {
        Product input = new Product("Keyboard", "Peripherals", 89.00);

        // The repository assigns the id; the controller echoes it back.
        Product saved = new Product("Keyboard", "Peripherals", 89.00);
        given(repository.save(org.mockito.ArgumentMatchers.any(Product.class))).willReturn(saved);

        mockMvc.perform(post("/catalog/products")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(input)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Keyboard"));
    }
}