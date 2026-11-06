package com.laptopstore.backend.repository;

import com.laptopstore.backend.entity.CustomerVoucher;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CustomerVoucherRepository extends JpaRepository<CustomerVoucher, Long> {
    List<CustomerVoucher> findByCustomerPhoneAndIsUsedFalse(String customerPhone);
    Optional<CustomerVoucher> findByCustomerPhoneAndVoucherCodeIgnoreCaseAndIsUsedFalse(String customerPhone, String voucherCode);
    Optional<CustomerVoucher> findByVoucherCodeIgnoreCaseAndIsUsedFalse(String voucherCode);
}
