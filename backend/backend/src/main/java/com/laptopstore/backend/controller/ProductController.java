package com.laptopstore.backend.controller;

import com.laptopstore.backend.entity.Product;
import com.laptopstore.backend.entity.ProductVariant;
import com.laptopstore.backend.entity.Topping;
import com.laptopstore.backend.repository.ToppingRepository;
import com.laptopstore.backend.service.ProductService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@CrossOrigin("*")
@RestController
@RequestMapping("/api/products")
public class ProductController {

    private final ProductService productService;
    private final ToppingRepository toppingRepository;

    public ProductController(ProductService productService, ToppingRepository toppingRepository) {
        this.productService = productService;
        this.toppingRepository = toppingRepository;
    }

    private Map<String, Object> formatProduct(Product p, List<Topping> allToppings) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", p.getId().toString());
        map.put("name", p.getName());
        map.put("description", p.getDescription() != null ? p.getDescription() : "");
        map.put("image", p.getImageUrl() != null ? p.getImageUrl() : "");
        map.put("imageUrl", p.getImageUrl());
        map.put("category_id", p.getCategory() != null ? p.getCategory().getId().toString() : "1");
        map.put("category", p.getCategory());

        int basePrice = p.getPrice() != null ? p.getPrice().intValue() : 0;
        map.put("base_price", basePrice);
        map.put("basePrice", basePrice);
        map.put("price", p.getPrice());

        boolean isAvailable = p.getIsAvailable() != null ? p.getIsAvailable() : true;
        map.put("is_available", isAvailable);
        map.put("isAvailable", isAvailable);

        // Danh sách Size biến thể
        List<Map<String, Object>> sizeList = new ArrayList<>();
        if (p.getVariants() != null) {
            for (ProductVariant v : p.getVariants()) {
                Map<String, Object> s = new LinkedHashMap<>();
                s.put("id", v.getId().toString());
                s.put("label", v.getSize());
                int extra = 0;
                if (v.getPrice() != null) {
                    extra = Math.max(0, v.getPrice().intValue() - basePrice);
                }
                s.put("extra_price", extra);
                s.put("extraPrice", extra);
                s.put("price", v.getPrice());
                s.put("stock_quantity", v.getStockQuantity());
                s.put("stockQuantity", v.getStockQuantity());
                sizeList.add(s);
            }
        }
        map.put("sizes", sizeList);
        map.put("variants", p.getVariants());

        // Danh sách Topping
        List<Map<String, Object>> topList = new ArrayList<>();
        if (allToppings != null) {
            for (Topping t : allToppings) {
                Map<String, Object> top = new LinkedHashMap<>();
                top.put("id", t.getId().toString());
                top.put("name", t.getName());
                top.put("price", t.getPrice() != null ? t.getPrice().intValue() : 0);
                topList.add(top);
            }
        }
        map.put("toppings", topList);

        return map;
    }

    // ---------------- KHU VỰC CÔNG KHAI (USER & KHÁCH) ----------------

    @GetMapping
    public List<Map<String, Object>> getAllProducts(@RequestParam(required = false) String category,
                                                    @RequestParam(required = false) String q) {
        List<Product> products = productService.getAllProducts();
        List<Topping> toppings = toppingRepository.findByIsAvailableTrue();

        return products.stream()
                .filter(p -> {
                    if (category != null && !category.isBlank()) {
                        if (p.getCategory() == null || !category.equalsIgnoreCase(p.getCategory().getId().toString())) {
                            return false;
                        }
                    }
                    if (q != null && !q.isBlank()) {
                        return p.getName().toLowerCase().contains(q.trim().toLowerCase());
                    }
                    return true;
                })
                .map(p -> formatProduct(p, toppings))
                .collect(Collectors.toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getProductById(@PathVariable Long id) {
        try {
            Product p = productService.getProductById(id);
            List<Topping> toppings = toppingRepository.findByIsAvailableTrue();
            return ResponseEntity.ok(formatProduct(p, toppings));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    // ---------------- KHU VỰC BẢO MẬT (CHỈ ADMIN MỚI ĐƯỢC VÀO) ----------------

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Product> createProduct(@RequestBody Product product) {
        Product savedProduct = productService.createProduct(product);
        return new ResponseEntity<>(savedProduct, HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Product> updateProduct(@PathVariable Long id, @RequestBody Product product) {
        try {
            Product updatedProduct = productService.updateProduct(id, product);
            return ResponseEntity.ok(updatedProduct);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteProduct(@PathVariable Long id) {
        productService.deleteProduct(id);
        return ResponseEntity.noContent().build();
    }
}
