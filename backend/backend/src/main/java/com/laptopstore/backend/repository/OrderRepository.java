package com.laptopstore.backend.repository;

import com.laptopstore.backend.entity.Order;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
    @EntityGraph(attributePaths = {
            "orderDetails",
            "orderDetails.productVariant",
            "orderDetails.productVariant.product",
            "orderDetails.productVariant.product.category",
            "review",
            "user"
    })
    List<Order> findAllByOrderByIdDesc();

    @EntityGraph(attributePaths = {
            "orderDetails",
            "orderDetails.productVariant",
            "orderDetails.productVariant.product",
            "orderDetails.productVariant.product.category",
            "review",
            "user"
    })
    List<Order> findByUserIdOrderByIdDesc(Long userId);

    @EntityGraph(attributePaths = {
            "orderDetails",
            "orderDetails.productVariant",
            "orderDetails.productVariant.product",
            "orderDetails.productVariant.product.category",
            "review",
            "user"
    })
    java.util.Optional<Order> findWithDetailsById(Long id);
}
