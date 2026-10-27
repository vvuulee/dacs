package com.laptopstore.backend.controller;

import com.laptopstore.backend.entity.Ingredient;
import com.laptopstore.backend.service.IngredientService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ingredients")
@CrossOrigin(origins = "http://localhost:3000")
public class IngredientController {

    private final IngredientService ingredientService;

    public IngredientController(IngredientService ingredientService) {
        this.ingredientService = ingredientService;
    }

    // 1. Lấy toàn bộ danh sách nguyên nhiên liệu để kiểm kê cuối ca
    @GetMapping
    public List<Ingredient> getAllIngredients() {
        return ingredientService.getAllIngredients();
    }

    // 2. Lấy thông tin chi tiết 1 nguyên liệu
    @GetMapping("/{id}")
    public ResponseEntity<Ingredient> getIngredientById(@PathVariable Long id) {
        return ingredientService.getIngredientById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // 3. Thêm mới nguyên nhiên liệu vào danh mục quản lý
    @PostMapping
    public ResponseEntity<?> createIngredient(@RequestBody Ingredient ingredient) {
        try {
            Ingredient saved = ingredientService.createIngredient(ingredient);
            return ResponseEntity.ok(saved);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // 4. Cập nhật thông tin / kiểm kho cuối ca
    @PutMapping("/{id}")
    public ResponseEntity<Ingredient> updateIngredient(@PathVariable Long id, @RequestBody Ingredient details) {
        return ingredientService.updateIngredient(id, details)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // 5. Endpoint nhanh dành riêng cho nhân viên chốt số lượng kiểm hàng cuối ca
    @PatchMapping("/{id}/check")
    public ResponseEntity<Ingredient> quickShiftCheck(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        return ingredientService.quickShiftCheck(id, body)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // 6. Xóa nguyên nhiên liệu khỏi hệ thống
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteIngredient(@PathVariable Long id) {
        if (!ingredientService.deleteIngredient(id)) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.noContent().build();
    }
}
