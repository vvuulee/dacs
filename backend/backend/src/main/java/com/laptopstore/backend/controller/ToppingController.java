package com.laptopstore.backend.controller;

import com.laptopstore.backend.entity.Topping;
import com.laptopstore.backend.repository.ToppingRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/toppings")
@CrossOrigin(origins = "http://localhost:3000")
public class ToppingController {

    private final ToppingRepository toppingRepository;

    public ToppingController(ToppingRepository toppingRepository) {
        this.toppingRepository = toppingRepository;
    }

    // Lấy danh sách topping cho khách chọn khi đặt đồ uống
    @GetMapping
    public List<Topping> getAllToppings() {
        return toppingRepository.findAll();
    }

    // Thêm topping mới (dành cho Admin)
    @PostMapping
    public Topping createTopping(@RequestBody Topping topping) {
        return toppingRepository.save(topping);
    }

    // Sửa giá / tên topping (dành cho Admin)
    @PutMapping("/{id}")
    public Topping updateTopping(@PathVariable Long id, @RequestBody Topping details) {
        Topping topping = toppingRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy topping"));
        topping.setName(details.getName());
        topping.setPrice(details.getPrice());
        if (details.getIsAvailable() != null) {
            topping.setIsAvailable(details.getIsAvailable());
        }
        return toppingRepository.save(topping);
    }

    // Xóa topping
    @DeleteMapping("/{id}")
    public void deleteTopping(@PathVariable Long id) {
        toppingRepository.deleteById(id);
    }
}