package com.laptopstore.backend.service;

import com.laptopstore.backend.entity.Store;
import com.laptopstore.backend.repository.StoreRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class StoreService {

    private final StoreRepository storeRepository;

    public StoreService(StoreRepository storeRepository) {
        this.storeRepository = storeRepository;
    }

    public List<Store> getAllStores(String province, String q) {
        if (province != null && !province.isBlank()) {
            return storeRepository.findByProvinceNameContainingIgnoreCase(province.trim());
        }
        if (q != null && !q.isBlank()) {
            return storeRepository.findByNameContainingIgnoreCaseOrStreetContainingIgnoreCase(q.trim(), q.trim());
        }
        return storeRepository.findAll();
    }

    public Optional<Store> getStoreById(Long id) {
        return storeRepository.findById(id);
    }

    @Transactional
    public Store createStore(Store store) {
        if (store.getName() == null || store.getName().isBlank()) {
            throw new IllegalArgumentException("Tên cửa hàng không được để trống!");
        }
        return storeRepository.save(store);
    }

    @Transactional
    public Optional<Store> updateStore(Long id, Store details) {
        return storeRepository.findById(id).map(existing -> {
            if (details.getName() != null) existing.setName(details.getName());
            if (details.getProvinceName() != null) existing.setProvinceName(details.getProvinceName());
            if (details.getWardName() != null) existing.setWardName(details.getWardName());
            if (details.getStreet() != null) existing.setStreet(details.getStreet());
            if (details.getPhone() != null) existing.setPhone(details.getPhone());
            if (details.getOpeningHours() != null) existing.setOpeningHours(details.getOpeningHours());
            return storeRepository.save(existing);
        });
    }

    @Transactional
    public boolean deleteStore(Long id) {
        if (!storeRepository.existsById(id)) return false;
        storeRepository.deleteById(id);
        return true;
    }
}
