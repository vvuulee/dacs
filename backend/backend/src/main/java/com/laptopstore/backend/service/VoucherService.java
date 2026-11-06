package com.laptopstore.backend.service;

import com.laptopstore.backend.entity.CustomerVoucher;
import com.laptopstore.backend.entity.Voucher;
import com.laptopstore.backend.repository.CustomerVoucherRepository;
import com.laptopstore.backend.repository.VoucherRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class VoucherService {

    private final VoucherRepository voucherRepository;
    private final CustomerVoucherRepository customerVoucherRepository;

    public VoucherService(VoucherRepository voucherRepository,
                          CustomerVoucherRepository customerVoucherRepository) {
        this.voucherRepository = voucherRepository;
        this.customerVoucherRepository = customerVoucherRepository;
    }

    public List<Voucher> getPublicOffers() {
        return voucherRepository.findByIsActiveTrue();
    }

    public List<Voucher> getAllVouchers() {
        return voucherRepository.findAll();
    }

    public List<CustomerVoucher> getCustomerVouchers(String phone) {
        if (phone == null || phone.isBlank()) return Collections.emptyList();
        return customerVoucherRepository.findByCustomerPhoneAndIsUsedFalse(phone.trim());
    }

    /**
     * Xác thực mã giảm giá (Áp dụng cho cả Voucher toàn hệ thống & Voucher tích điểm theo SĐT)
     */
    public Map<String, Object> validateVoucher(String code, BigDecimal subtotal, String customerPhone) {
        Map<String, Object> response = new LinkedHashMap<>();
        if (code == null || code.isBlank()) {
            response.put("valid", false);
            response.put("reason", "Vui lòng nhập mã giảm giá.");
            return response;
        }

        String cleanCode = code.trim().toUpperCase();
        if (subtotal == null) subtotal = BigDecimal.ZERO;

        // 1. Kiểm tra trong kho Voucher toàn hệ thống
        Optional<Voucher> voucherOpt = voucherRepository.findByCodeIgnoreCaseAndIsActiveTrue(cleanCode);
        if (voucherOpt.isPresent()) {
            Voucher voucher = voucherOpt.get();

            if (voucher.getExpiresAt() != null && voucher.getExpiresAt().isBefore(LocalDateTime.now())) {
                response.put("valid", false);
                response.put("reason", "Mã giảm giá này đã hết hạn sử dụng.");
                return response;
            }

            if (voucher.getMinOrder() != null && subtotal.compareTo(voucher.getMinOrder()) < 0) {
                response.put("valid", false);
                response.put("reason", "Đơn hàng tối thiểu phải từ " + voucher.getMinOrder().intValue() + " ₫ để dùng mã này.");
                return response;
            }

            BigDecimal discount = BigDecimal.ZERO;
            if ("percent".equalsIgnoreCase(voucher.getType())) {
                discount = subtotal.multiply(voucher.getValue())
                        .divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP);
                if (voucher.getMaxDiscount() != null && discount.compareTo(voucher.getMaxDiscount()) > 0) {
                    discount = voucher.getMaxDiscount();
                }
            } else if ("fixed".equalsIgnoreCase(voucher.getType())) {
                discount = voucher.getValue();
            } else if ("freeship".equalsIgnoreCase(voucher.getType())) {
                discount = BigDecimal.valueOf(15000); // Mức giảm tương ứng phí ship mẫu
            }

            if (discount.compareTo(subtotal) > 0) {
                discount = subtotal;
            }

            response.put("valid", true);
            response.put("code", voucher.getCode());
            response.put("title", voucher.getTitle());
            response.put("discount", discount.intValue());
            return response;
        }

        // 2. Kiểm tra trong kho Voucher quà tặng cá nhân tích điểm (customer_vouchers)
        Optional<CustomerVoucher> custVoucherOpt = customerVoucherRepository.findByVoucherCodeIgnoreCaseAndIsUsedFalse(cleanCode);
        if (custVoucherOpt.isPresent()) {
            CustomerVoucher cv = custVoucherOpt.get();

            if (customerPhone != null && !customerPhone.isBlank() && !cv.getCustomerPhone().equals(customerPhone.trim())) {
                response.put("valid", false);
                response.put("reason", "Mã voucher tri ân này thuộc về số điện thoại khác.");
                return response;
            }

            if (cv.getExpiresAt() != null && cv.getExpiresAt().isBefore(LocalDateTime.now())) {
                response.put("valid", false);
                response.put("reason", "Voucher tri ân tích điểm này đã hết hạn.");
                return response;
            }

            BigDecimal discount = cv.getDiscountAmount();
            if (discount.compareTo(subtotal) > 0) {
                discount = subtotal;
            }

            response.put("valid", true);
            response.put("code", cv.getVoucherCode());
            response.put("title", cv.getTitle());
            response.put("discount", discount.intValue());
            return response;
        }

        response.put("valid", false);
        response.put("reason", "Mã giảm giá không tồn tại hoặc đã được sử dụng.");
        return response;
    }

    @Transactional
    public Voucher createVoucher(Voucher voucher) {
        if (voucher.getCode() == null || voucher.getCode().isBlank()) {
            throw new IllegalArgumentException("Mã voucher không được để trống!");
        }
        voucher.setCode(voucher.getCode().trim().toUpperCase());
        return voucherRepository.save(voucher);
    }

    @Transactional
    public void markCustomerVoucherUsed(String voucherCode, String customerPhone) {
        if (voucherCode == null || voucherCode.isBlank()) return;
        customerVoucherRepository.findByVoucherCodeIgnoreCaseAndIsUsedFalse(voucherCode.trim())
                .ifPresent(cv -> {
                    cv.setIsUsed(true);
                    customerVoucherRepository.save(cv);
                });
    }

    @Transactional
    public boolean deleteVoucher(Long id) {
        if (!voucherRepository.existsById(id)) return false;
        voucherRepository.deleteById(id);
        return true;
    }
}

