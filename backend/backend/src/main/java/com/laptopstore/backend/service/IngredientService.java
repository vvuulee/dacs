package com.laptopstore.backend.service;

import com.laptopstore.backend.entity.Ingredient;
import com.laptopstore.backend.repository.IngredientRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class IngredientService {

    private final IngredientRepository ingredientRepository;

    public IngredientService(IngredientRepository ingredientRepository) {
        this.ingredientRepository = ingredientRepository;
    }

    public List<Ingredient> getAllIngredients() {
        return ingredientRepository.findAllByOrderByIdAsc();
    }

    public Optional<Ingredient> getIngredientById(Long id) {
        return ingredientRepository.findById(id);
    }

    @Transactional
    public Ingredient createIngredient(Ingredient ingredient) {
        if (ingredient.getName() == null || ingredient.getName().trim().isEmpty()) {
            throw new IllegalArgumentException("Tên nguyên vật liệu không được để trống!");
        }
        if (ingredient.getUnit() == null || ingredient.getUnit().trim().isEmpty()) {
            throw new IllegalArgumentException("Đơn vị tính không được để trống!");
        }
        if (ingredient.getQuantity() == null) {
            ingredient.setQuantity(0.0);
        }
        if (ingredient.getMinQuantity() == null) {
            ingredient.setMinQuantity(0.0);
        }
        if (ingredient.getLastCheckedAt() == null) {
            ingredient.setLastCheckedAt(LocalDateTime.now());
        }
        return ingredientRepository.save(ingredient);
    }

    @Transactional
    public Optional<Ingredient> updateIngredient(Long id, Ingredient details) {
        return ingredientRepository.findById(id).map(ingredient -> {
            if (details.getName() != null && !details.getName().trim().isEmpty()) {
                ingredient.setName(details.getName().trim());
            }
            if (details.getUnit() != null && !details.getUnit().trim().isEmpty()) {
                ingredient.setUnit(details.getUnit().trim());
            }
            if (details.getQuantity() != null) {
                ingredient.setQuantity(details.getQuantity());
            }
            if (details.getMinQuantity() != null) {
                ingredient.setMinQuantity(details.getMinQuantity());
            }
            if (details.getNote() != null) {
                ingredient.setNote(details.getNote().trim());
            }
            if (details.getLastCheckedBy() != null) {
                ingredient.setLastCheckedBy(details.getLastCheckedBy().trim());
            }
            ingredient.setLastCheckedAt(LocalDateTime.now());
            return ingredientRepository.save(ingredient);
        });
    }

    @Transactional
    public Optional<Ingredient> quickShiftCheck(Long id, Map<String, Object> body) {
        return ingredientRepository.findById(id).map(ingredient -> {
            if (body.containsKey("quantity") && body.get("quantity") != null) {
                ingredient.setQuantity(Double.valueOf(body.get("quantity").toString()));
            }
            if (body.containsKey("note") && body.get("note") != null) {
                ingredient.setNote(body.get("note").toString());
            }
            if (body.containsKey("lastCheckedBy") && body.get("lastCheckedBy") != null) {
                ingredient.setLastCheckedBy(body.get("lastCheckedBy").toString());
            }
            ingredient.setLastCheckedAt(LocalDateTime.now());
            return ingredientRepository.save(ingredient);
        });
    }

    @Transactional
    public boolean deleteIngredient(Long id) {
        if (!ingredientRepository.existsById(id)) {
            return false;
        }
        ingredientRepository.deleteById(id);
        return true;
    }
}
