package com.laptopstore.backend.repository;

import com.laptopstore.backend.entity.Store;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StoreRepository extends JpaRepository<Store, Long> {
    List<Store> findByProvinceNameContainingIgnoreCase(String province);
    List<Store> findByNameContainingIgnoreCaseOrStreetContainingIgnoreCase(String name, String street);
}
