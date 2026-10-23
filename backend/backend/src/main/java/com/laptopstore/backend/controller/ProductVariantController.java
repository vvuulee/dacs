package com.laptopstore.backend.controller;

import com.laptopstore.backend.entity.ProductVariant;
import com.laptopstore.backend.repository.ProductVariantRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/variants")
public class ProductVariantController {

    private final ProductVariantRepository variantRepository;

    public ProductVariantController(ProductVariantRepository variantRepository) {
        this.variantRepository = variantRepository;
    }

    @GetMapping
    public List<ProductVariant> getAllVariants() {
        return variantRepository.findAll();
    }

    @GetMapping("/product/{productId}")
    public List<ProductVariant> getVariantsByProductId(@PathVariable Long productId) {
        return variantRepository.findByProductId(productId);
    }
}
