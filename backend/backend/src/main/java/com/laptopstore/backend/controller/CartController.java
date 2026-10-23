package com.laptopstore.backend.controller;

import com.laptopstore.backend.dto.AddToCartRequest;
import com.laptopstore.backend.entity.*;
import com.laptopstore.backend.repository.*;
import com.laptopstore.backend.security.UserDetailsImpl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.Optional;

@RestController
@RequestMapping("/api/carts")
public class CartController {

    private final CartRepository cartRepository;
    private final CartItemRepository cartItemRepository;
    private final UserRepository userRepository;
    private final ProductVariantRepository productVariantRepository;

    public CartController(CartRepository cartRepository, CartItemRepository cartItemRepository,
            UserRepository userRepository, ProductVariantRepository productVariantRepository) {
        this.cartRepository = cartRepository;
        this.cartItemRepository = cartItemRepository;
        this.userRepository = userRepository;
        this.productVariantRepository = productVariantRepository;
    }

    // 1. Thêm sản phẩm vào giỏ hàng (Create)
    @PostMapping("/add")
    @Transactional
    public ResponseEntity<?> addToCart(@AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestBody AddToCartRequest request) {
        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Chưa xác thực người dùng!");
        }

        if (request.getQuantity() == null || request.getQuantity() <= 0) {
            return ResponseEntity.badRequest().body("Số lượng phải lớn hơn 0!");
        }

        if (request.getVariantId() == null) {
            return ResponseEntity.badRequest().body("Vui lòng chọn biến thể sản phẩm!");
        }

        // Tìm người dùng
        User user = userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new RuntimeException("Lỗi: Không tìm thấy người dùng!"));

        // Tìm sản phẩm biến thể
        Optional<ProductVariant> variantOpt = productVariantRepository.findById(request.getVariantId());
        if (variantOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("Sản phẩm không tồn tại!");
        }
        ProductVariant variant = variantOpt.get();

        // Tìm giỏ hàng hoặc tạo mới nếu chưa có
        Cart cart = cartRepository.findByUserId(user.getId()).orElseGet(() -> {
            Cart newCart = new Cart();
            newCart.setUser(user);
            newCart.setCartItems(new ArrayList<>());
            return cartRepository.save(newCart);
        });

        // Kiểm tra sản phẩm đã có trong giỏ chưa
        Optional<CartItem> cartItemOpt = cartItemRepository.findByCartAndProductVariant(cart, variant);

        int targetQuantity = request.getQuantity();
        if (cartItemOpt.isPresent()) {
            targetQuantity += cartItemOpt.get().getQuantity();
        }

        // Kiểm tra tồn kho
        if (variant.getStockQuantity() != null && variant.getStockQuantity() < targetQuantity) {
            return ResponseEntity.badRequest()
                    .body("Số lượng yêu cầu vượt quá tồn kho (Còn lại: " + variant.getStockQuantity() + ")");
        }

        if (cartItemOpt.isPresent()) {
            CartItem existingItem = cartItemOpt.get();
            existingItem.setQuantity(targetQuantity);
            cartItemRepository.save(existingItem);
        } else {
            CartItem newItem = new CartItem();
            newItem.setCart(cart);
            newItem.setProductVariant(variant);
            newItem.setQuantity(request.getQuantity());
            cartItemRepository.save(newItem);
        }

        return ResponseEntity.ok("Thêm vào giỏ hàng thành công!");
    }

    // 2. Lấy giỏ hàng của chính mình (Read - Khuyên dùng, không lộ userId qua URL)
    @GetMapping("/my-cart")
    public ResponseEntity<?> getMyCart(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Chưa xác thực người dùng!");
        }

        Cart cart = cartRepository.findByUserId(userDetails.getId()).orElseGet(() -> {
            Cart emptyCart = new Cart();
            emptyCart.setCartItems(new ArrayList<>());
            return emptyCart;
        });

        if (cart.getCartItems() == null) {
            cart.setCartItems(new ArrayList<>());
        }

        return ResponseEntity.ok(cart);
    }

    // 2b. Lấy giỏ hàng theo userId (Read - Giữ lại tương thích, nhưng chặn xem trộm
    // của nhau)
    @GetMapping("/{userId}")
    public ResponseEntity<?> getCart(@AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable Long userId) {
        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Chưa xác thực người dùng!");
        }

        // Kiểm tra quyền: Chỉ được xem giỏ của chính mình (hoặc ADMIN)
        boolean isAdmin = userDetails.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        if (!userDetails.getId().equals(userId) && !isAdmin) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Bạn không có quyền xem giỏ hàng của người khác!");
        }

        Cart cart = cartRepository.findByUserId(userId).orElseGet(() -> {
            Cart emptyCart = new Cart();
            emptyCart.setCartItems(new ArrayList<>());
            return emptyCart;
        });

        if (cart.getCartItems() == null) {
            cart.setCartItems(new ArrayList<>());
        }

        return ResponseEntity.ok(cart);
    }

    // 3. Cập nhật số lượng của một món hàng trong giỏ (Update)
    @PutMapping("/items/{cartItemId}")
    @Transactional
    public ResponseEntity<?> updateItemQuantity(@AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable Long cartItemId,
            @RequestParam Integer quantity) {
        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Chưa xác thực người dùng!");
        }

        if (quantity == null || quantity <= 0) {
            return ResponseEntity.badRequest().body("Số lượng cập nhật phải lớn hơn 0!");
        }

        Optional<CartItem> itemOpt = cartItemRepository.findById(cartItemId);
        if (itemOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("Món hàng không tồn tại!");
        }

        CartItem item = itemOpt.get();

        // Kiểm tra quyền sở hữu (Chống IDOR)
        if (!item.getCart().getUser().getId().equals(userDetails.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Bạn không có quyền sửa món hàng này!");
        }

        // Kiểm tra tồn kho
        ProductVariant variant = item.getProductVariant();
        if (variant.getStockQuantity() != null && variant.getStockQuantity() < quantity) {
            return ResponseEntity.badRequest()
                    .body("Số lượng vượt quá tồn kho (Còn lại: " + variant.getStockQuantity() + ")");
        }

        item.setQuantity(quantity);
        cartItemRepository.save(item);
        return ResponseEntity.ok("Cập nhật số lượng thành công!");
    }

    // 4. Xóa một món hàng khỏi giỏ (Delete)
    @DeleteMapping("/remove/{cartItemId}")
    @Transactional
    public ResponseEntity<String> removeItem(@AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable Long cartItemId) {
        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Chưa xác thực người dùng!");
        }

        Optional<CartItem> itemOpt = cartItemRepository.findById(cartItemId);
        if (itemOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("Món đồ này không tồn tại trong giỏ hàng");
        }

        CartItem item = itemOpt.get();

        // Kiểm tra quyền sở hữu (Chống IDOR)
        if (!item.getCart().getUser().getId().equals(userDetails.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Bạn không có quyền xóa món hàng này!");
        }

        cartItemRepository.delete(item);
        return ResponseEntity.ok("Đã xóa thành công khỏi giỏ hàng");
    }

    // 5. Làm rỗng giỏ hàng (Clear Cart)
    @DeleteMapping("/clear")
    @Transactional
    public ResponseEntity<String> clearCart(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Chưa xác thực người dùng!");
        }

        Optional<Cart> cartOpt = cartRepository.findByUserId(userDetails.getId());
        if (cartOpt.isPresent()) {
            Cart cart = cartOpt.get();
            cart.getCartItems().clear();
            cartRepository.save(cart);
        }

        return ResponseEntity.ok("Đã làm rỗng giỏ hàng thành công!");
    }
}
