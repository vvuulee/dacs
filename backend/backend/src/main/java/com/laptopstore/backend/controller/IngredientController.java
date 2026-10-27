package com.laptopstore.backend.controller;

import com.laptopstore.backend.entity.Ingredient;
import com.laptopstore.backend.repository.IngredientRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ingredients")
@CrossOrigin(origins = "http://localhost:3000")
public class IngredientController {

    private final IngredientRepository ingredientRepository;

    public IngredientController(IngredientRepository ingredientRepository) {
        this.ingredientRepository = ingredientRepository;
    }

    // 1. Lấy toàn bộ danh sách nguyên nhiên liệu để kiểm kê cuối ca
    @GetMapping
    public List<Ingredient> getAllIngredients() {
        return ingredientRepository.findAllByOrderByIdAsc();
    }

    // 2. Lấy thông tin chi tiết 1 nguyên liệu
    @GetMapping("/{id}")
    public ResponseEntity<Ingredient> getIngredientById(@PathVariable Long id) {
        return ingredientRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // 3. Thêm mới nguyên nhiên liệu vào danh mục quản lý
    @PostMapping
    public Ingredient createIngredient(@RequestBody Ingredient ingredient) {
        if (ingredient.getLastCheckedAt() == null) {
            ingredient.setLastCheckedAt(LocalDateTime.now());
        }
        return ingredientRepository.save(ingredient);
    }

    // 4. Cập nhật thông tin / kiểm kho cuối ca
    @PutMapping("/{id}")
    public ResponseEntity<Ingredient> updateIngredient(@PathVariable Long id, @RequestBody Ingredient details) {
        return ingredientRepository.findById(id).map(ingredient -> {
            if (details.getName() != null) ingredient.setName(details.getName());
            if (details.getUnit() != null) ingredient.setUnit(details.getUnit());
            if (details.getQuantity() != null) ingredient.setQuantity(details.getQuantity());
            if (details.getMinQuantity() != null) ingredient.setMinQuantity(details.getMinQuantity());
            if (details.getNote() != null) ingredient.setNote(details.getNote());
            if (details.getLastCheckedBy() != null) ingredient.setLastCheckedBy(details.getLastCheckedBy());
            ingredient.setLastCheckedAt(LocalDateTime.now());
            return ResponseEntity.ok(ingredientRepository.save(ingredient));
        }).orElse(ResponseEntity.notFound().build());
    }

    // 5. Endpoint nhanh dành riêng cho nhân viên chốt số lượng kiểm hàng cuối ca
    @PatchMapping("/{id}/check")
    public ResponseEntity<Ingredient> quickShiftCheck(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        return ingredientRepository.findById(id).map(ingredient -> {
            if (body.containsKey("quantity")) {
                ingredient.setQuantity(Double.valueOf(body.get("quantity").toString()));
            }
            if (body.containsKey("note")) {
                ingredient.setNote((String) body.get("note"));
            }
            if (body.containsKey("lastCheckedBy")) {
                ingredient.setLastCheckedBy((String) body.get("lastCheckedBy"));
            }
            ingredient.setLastCheckedAt(LocalDateTime.now());
            return ResponseEntity.ok(ingredientRepository.save(ingredient));
        }).orElse(ResponseEntity.notFound().build());
    }

    // 6. Xóa nguyên nhiên liệu khỏi hệ thống
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteIngredient(@PathVariable Long id) {
        if (!ingredientRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        ingredientRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
