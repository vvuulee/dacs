package com.laptopstore.backend.controller;

import com.laptopstore.backend.entity.Store;
import com.laptopstore.backend.service.StoreService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@CrossOrigin("*")
@RestController
@RequestMapping("/api/stores")
public class StoreController {

    private final StoreService storeService;

    public StoreController(StoreService storeService) {
        this.storeService = storeService;
    }

    private Map<String, Object> formatStore(Store s) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", s.getId().toString());
        map.put("name", s.getName());
        map.put("street", s.getStreet() != null ? s.getStreet() : "");
        map.put("ward_name", s.getWardName() != null ? s.getWardName() : "");
        map.put("province_id", "");
        map.put("province_name", s.getProvinceName() != null ? s.getProvinceName() : "");
        map.put("phone", s.getPhone() != null ? s.getPhone() : "");
        map.put("opening_hours", s.getOpeningHours() != null ? s.getOpeningHours() : "");
        return map;
    }

    @GetMapping
    public List<Map<String, Object>> getAllStores(@RequestParam(required = false) String province,
                                                  @RequestParam(required = false) String q) {
        return storeService.getAllStores(province, q).stream()
                .map(this::formatStore)
                .collect(Collectors.toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getStoreById(@PathVariable Long id) {
        return storeService.getStoreById(id)
                .map(s -> ResponseEntity.ok(formatStore(s)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Store> createStore(@RequestBody Store store) {
        return new ResponseEntity<>(storeService.createStore(store), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Store> updateStore(@PathVariable Long id, @RequestBody Store details) {
        return storeService.updateStore(id, details)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteStore(@PathVariable Long id) {
        if (!storeService.deleteStore(id)) return ResponseEntity.notFound().build();
        return ResponseEntity.noContent().build();
    }
}
