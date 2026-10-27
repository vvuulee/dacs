package com.laptopstore.backend.repository;

import com.laptopstore.backend.entity.OrderDetailTopping;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrderDetailToppingRepository extends JpaRepository<OrderDetailTopping, Long> {
    List<OrderDetailTopping> findByOrderDetailId(Long orderDetailId);
}

