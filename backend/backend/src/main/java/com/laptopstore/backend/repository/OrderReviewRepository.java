package com.laptopstore.backend.repository;

import com.laptopstore.backend.entity.OrderReview;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface OrderReviewRepository extends JpaRepository<OrderReview, Long> {
    Optional<OrderReview> findByOrderId(Long orderId);
    List<OrderReview> findByUserId(Long userId);
}
