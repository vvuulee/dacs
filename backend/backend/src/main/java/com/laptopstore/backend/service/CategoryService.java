package com.laptopstore.backend.service;

import com.laptopstore.backend.entity.Category;
import com.laptopstore.backend.repository.CategoryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class CategoryService {

    private final CategoryRepository categoryRepository;

    public CategoryService(CategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
    }

    public List<Category> getAllCategories() {
        return categoryRepository.findAll();
    }

    public Optional<Category> getCategoryById(Long id) {
        return categoryRepository.findById(id);
    }

    @Transactional
    public Category createCategory(Category category) {
        if (category.getName() == null || category.getName().trim().isEmpty()) {
            throw new IllegalArgumentException("Tên danh mục không được để trống!");
        }
        return categoryRepository.save(category);
    }

    @Transactional
    public Optional<Category> updateCategory(Long id, Category details) {
        return categoryRepository.findById(id).map(existing -> {
            if (details.getName() != null && !details.getName().trim().isEmpty()) {
                existing.setName(details.getName().trim());
            }
            if (details.getDescription() != null) {
                existing.setDescription(details.getDescription());
            }
            return categoryRepository.save(existing);
        });
    }

    @Transactional
    public boolean deleteCategory(Long id) {
        if (!categoryRepository.existsById(id)) {
            return false;
        }
        categoryRepository.deleteById(id);
        return true;
    }
}
