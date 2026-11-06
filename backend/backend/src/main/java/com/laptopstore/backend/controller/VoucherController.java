package com.laptopstore.backend.controller;

import com.laptopstore.backend.entity.CustomerVoucher;
import com.laptopstore.backend.entity.Voucher;
import com.laptopstore.backend.service.VoucherService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@CrossOrigin("*")
@RestController
public class VoucherController {

    private final VoucherService voucherService;

    public VoucherController(VoucherService voucherService) {
        this.voucherService = voucherService;
    }

    private Map<String, Object> formatOffer(Voucher v) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", v.getId().toString());
        map.put("title", v.getTitle());
        map.put("description", v.getDescription() != null ? v.getDescription() : "");
        map.put("code", v.getCode());
        map.put("min_order", v.getMinOrder() != null ? v.getMinOrder().intValue() : 0);
        map.put("expires_at", v.getExpiresAt() != null ? v.getExpiresAt().toString() : null);
        return map;
    }

    // 1. Cho trang /offers trên web (Ưu đãi công khai)
    @GetMapping("/api/offers")
    public List<Map<String, Object>> getPublicOffers() {
        return voucherService.getPublicOffers().stream()
                .map(this::formatOffer)
                .collect(Collectors.toList());
    }

    // 2. Xác thực mã giảm giá khi thanh toán giỏ hàng (Áp dụng được cho cả POS và Web)
    @PostMapping("/api/vouchers/validate")
    public ResponseEntity<?> validateVoucher(@RequestBody Map<String, Object> body) {
        String code = (String) body.get("code");
        String phone = (String) body.get("customer_phone");
        if (phone == null) phone = (String) body.get("customerPhone");

        BigDecimal subtotal = BigDecimal.ZERO;
        if (body.containsKey("subtotal") && body.get("subtotal") != null) {
            subtotal = new BigDecimal(body.get("subtotal").toString());
        }

        Map<String, Object> result = voucherService.validateVoucher(code, subtotal, phone);
        return ResponseEntity.ok(result);
    }

    // 3. Tra cứu voucher quà tặng riêng của khách hàng tích đủ 50 đơn
    @GetMapping("/api/vouchers/customer/{phone}")
    public List<CustomerVoucher> getCustomerVouchers(@PathVariable String phone) {
        return voucherService.getCustomerVouchers(phone);
    }

    // 4. Admin quản lý toàn bộ voucher
    @GetMapping("/api/vouchers")
    @PreAuthorize("hasRole('ADMIN')")
    public List<Voucher> getAllVouchers() {
        return voucherService.getAllVouchers();
    }

    @PostMapping("/api/vouchers")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Voucher> createVoucher(@RequestBody Voucher voucher) {
        return new ResponseEntity<>(voucherService.createVoucher(voucher), HttpStatus.CREATED);
    }

    @DeleteMapping("/api/vouchers/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteVoucher(@PathVariable Long id) {
        if (!voucherService.deleteVoucher(id)) return ResponseEntity.notFound().build();
        return ResponseEntity.noContent().build();
    }
}

