package com.laptopstore.backend.controller;

import com.laptopstore.backend.entity.Topping;
import com.laptopstore.backend.service.ToppingService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/toppings")
@CrossOrigin(origins = "http://localhost:3000")
public class ToppingController {

    private final ToppingService toppingService;

    public ToppingController(ToppingService toppingService) {
        this.toppingService = toppingService;
    }

    // Lấy danh sách topping cho khách chọn khi đặt đồ uống
    @GetMapping
    public List<Topping> getAllToppings() {
        return toppingService.getAllToppings();
    }

    // Lấy chi tiết 1 topping
    @GetMapping("/{id}")
    public ResponseEntity<Topping> getToppingById(@PathVariable Long id) {
        return toppingService.getToppingById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // Thêm topping mới (dành cho Admin)
    @PostMapping
    public ResponseEntity<?> createTopping(@RequestBody Topping topping) {
        try {
            Topping saved = toppingService.createTopping(topping);
            return ResponseEntity.ok(saved);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // Sửa giá / tên topping (dành cho Admin)
    @PutMapping("/{id}")
    public ResponseEntity<Topping> updateTopping(@PathVariable Long id, @RequestBody Topping details) {
        return toppingService.updateTopping(id, details)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // Xóa topping
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTopping(@PathVariable Long id) {
        if (!toppingService.deleteTopping(id)) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.noContent().build();
    }
}
