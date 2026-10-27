package com.laptopstore.backend.controller;

import com.laptopstore.backend.entity.ProductVariant;
import com.laptopstore.backend.service.ProductService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/variants")
public class ProductVariantController {

    private final ProductService productService;

    public ProductVariantController(ProductService productService) {
        this.productService = productService;
    }

    @GetMapping
    public List<ProductVariant> getAllVariants() {
        return productService.getAllVariants();
    }

    @GetMapping("/product/{productId}")
    public List<ProductVariant> getVariantsByProductId(@PathVariable Long productId) {
        return productService.getVariantsByProductId(productId);
    }
}
