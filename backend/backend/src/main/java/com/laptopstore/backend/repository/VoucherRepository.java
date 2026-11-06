package com.laptopstore.backend.repository;

import com.laptopstore.backend.entity.Voucher;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface VoucherRepository extends JpaRepository<Voucher, Long> {
    Optional<Voucher> findByCodeIgnoreCaseAndIsActiveTrue(String code);
    Optional<Voucher> findByCodeIgnoreCase(String code);
    List<Voucher> findByIsActiveTrue();
}
