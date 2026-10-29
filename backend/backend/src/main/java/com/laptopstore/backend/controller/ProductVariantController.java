package com.laptopstore.backend.controller;

import com.laptopstore.backend.entity.ProductVariant;
import com.laptopstore.backend.service.ProductService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@CrossOrigin("*")
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

    // Nhân viên cập nhật nhanh số lượng bánh tồn kho đầu mỗi ca làm
    @PatchMapping("/{id}/stock")
    public ResponseEntity<?> updateStock(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        Integer stockQuantity = null;
        if (body != null && body.containsKey("stockQuantity") && body.get("stockQuantity") != null) {
            stockQuantity = Integer.valueOf(body.get("stockQuantity").toString());
        }
        ProductVariant updated = productService.updateVariantStock(id, stockQuantity);
        return ResponseEntity.ok(updated);
    }
}
