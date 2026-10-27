package com.laptopstore.backend.repository;

import com.laptopstore.backend.entity.Order;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
    @EntityGraph(attributePaths = {
            "orderDetails",
            "orderDetails.productVariant",
            "orderDetails.productVariant.product",
            "orderDetails.productVariant.product.category",
            "staff"
    })
    List<Order> findAllByOrderByIdDesc();

    @EntityGraph(attributePaths = {
            "orderDetails",
            "orderDetails.productVariant",
            "orderDetails.productVariant.product",
            "orderDetails.productVariant.product.category",
            "staff"
    })
    Optional<Order> findWithDetailsById(Long id);

    List<Order> findByCreateAtBetweenOrderByIdDesc(LocalDateTime start, LocalDateTime end);
}
