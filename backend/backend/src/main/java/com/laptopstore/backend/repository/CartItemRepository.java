package com.laptopstore.backend.repository;
import com.laptopstore.backend.entity.Cart;
import com.laptopstore.backend.entity.CartItem;
import com.laptopstore.backend.entity.ProductVariant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

public interface CartItemRepository extends JpaRepository<CartItem,Long> {
    Optional<CartItem> findByCartAndProductVariant(Cart cart, ProductVariant productVariant);
}
