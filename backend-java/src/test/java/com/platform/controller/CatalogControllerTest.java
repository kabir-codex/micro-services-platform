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
    void landingExposesServiceMetadata() throws Exception {
        mockMvc.perform(get("/catalog"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.service").value("catalog-api"))
                .andExpect(jsonPath("$.endpoints.length()").value(8));
    }

    @Test
    void listProductsReturnsAll() throws Exception {
        given(repository.findAll()).willReturn(List.of(new Product("Mouse", "Peripherals", 19.99)));

        mockMvc.perform(get("/catalog/products"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].name").value("Mouse"));
    }

    @Test
    void listProductsFiltersByCategoryIgnoringCase() throws Exception {
        given(repository.findByCategoryIgnoreCase("peripherals"))
                .willReturn(List.of(new Product("Mouse", "Peripherals", 19.99)));

        mockMvc.perform(get("/catalog/products").param("category", "peripherals"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].category").value("Peripherals"));
    }

    @Test
    void getProductReturnsItWhenFound() throws Exception {
        given(repository.findById(1L)).willReturn(java.util.Optional.of(new Product("Monitor", "Displays", 249.00)));

        mockMvc.perform(get("/catalog/products/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Monitor"));
    }

    @Test
    void getProductReturns404WhenMissing() throws Exception {
        given(repository.findById(99L)).willReturn(java.util.Optional.empty());

        mockMvc.perform(get("/catalog/products/99"))
                .andExpect(status().isNotFound());
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

    @Test
    void createProductRejectsBlankName() throws Exception {
        mockMvc.perform(post("/catalog/products")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "   ",
                                  "category": "Peripherals",
                                  "price": 5.0
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("name"))
                .andExpect(jsonPath("$.errors[0].message").value("name must not be blank"));

        // The invalid payload must never reach the repository.
        org.mockito.Mockito.verifyNoInteractions(repository);
    }

    @Test
    void createProductRejectsNegativePrice() throws Exception {
        mockMvc.perform(post("/catalog/products")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Mouse",
                                  "category": "Peripherals",
                                  "price": -1.0
                                }
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void updateProductOverwritesFields() throws Exception {
        Product existing = new Product("Mouse", "Peripherals", 19.99);
        given(repository.findById(1L)).willReturn(java.util.Optional.of(existing));
        given(repository.save(org.mockito.ArgumentMatchers.any(Product.class)))
                .willAnswer(invocation -> invocation.getArgument(0));

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .put("/catalog/products/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Gaming Mouse",
                                  "category": "Peripherals",
                                  "price": 49.99
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Gaming Mouse"))
                .andExpect(jsonPath("$.price").value(49.99));
    }

    @Test
    void updateProductReturns404WhenMissing() throws Exception {
        given(repository.findById(99L)).willReturn(java.util.Optional.empty());

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .put("/catalog/products/99")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Ghost",
                                  "category": "Misc",
                                  "price": 1.0
                                }
                                """))
                .andExpect(status().isNotFound());
    }

    @Test
    void deleteProductReturns204() throws Exception {
        given(repository.existsById(1L)).willReturn(true);

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .delete("/catalog/products/1"))
                .andExpect(status().isNoContent());

        org.mockito.Mockito.verify(repository).deleteById(1L);
    }

    @Test
    void deleteProductReturns404WhenMissing() throws Exception {
        given(repository.existsById(99L)).willReturn(false);

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .delete("/catalog/products/99"))
                .andExpect(status().isNotFound());
    }
}