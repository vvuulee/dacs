package com.laptopstore.backend.service;

import com.laptopstore.backend.entity.Topping;
import com.laptopstore.backend.repository.ToppingRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class ToppingService {

    private final ToppingRepository toppingRepository;

    public ToppingService(ToppingRepository toppingRepository) {
        this.toppingRepository = toppingRepository;
    }

    public List<Topping> getAllToppings() {
        return toppingRepository.findAll();
    }

    public List<Topping> getAvailableToppings() {
        return toppingRepository.findByIsAvailableTrue();
    }

    public Optional<Topping> getToppingById(Long id) {
        return toppingRepository.findById(id);
    }

    @Transactional
    public Topping createTopping(Topping topping) {
        if (topping.getName() == null || topping.getName().trim().isEmpty()) {
            throw new IllegalArgumentException("Tên topping không được để trống!");
        }
        if (topping.getPrice() == null || topping.getPrice() < 0) {
            topping.setPrice(0.0);
        }
        if (topping.getIsAvailable() == null) {
            topping.setIsAvailable(true);
        }
        return toppingRepository.save(topping);
    }

    @Transactional
    public Optional<Topping> updateTopping(Long id, Topping details) {
        return toppingRepository.findById(id).map(topping -> {
            if (details.getName() != null && !details.getName().trim().isEmpty()) {
                topping.setName(details.getName().trim());
            }
            if (details.getPrice() != null) {
                topping.setPrice(details.getPrice());
            }
            if (details.getIsAvailable() != null) {
                topping.setIsAvailable(details.getIsAvailable());
            }
            return toppingRepository.save(topping);
        });
    }

    @Transactional
    public boolean deleteTopping(Long id) {
        if (!toppingRepository.existsById(id)) {
            return false;
        }
        toppingRepository.deleteById(id);
        return true;
    }
}
