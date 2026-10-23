package com.laptopstore.backend.controller;

import com.laptopstore.backend.dto.CheckoutCartRequest;
import com.laptopstore.backend.dto.OrderRequest;
import com.laptopstore.backend.dto.ReviewRequest;
import com.laptopstore.backend.dto.UpdateOrderStatusRequest;
import com.laptopstore.backend.entity.*;
import com.laptopstore.backend.repository.*;
import com.laptopstore.backend.security.UserDetailsImpl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/orders")
public class OrderController {
    private final OrderRepository orderRepository;
    private final OrderDetailRepository orderDetailRepository;
    private final UserRepository userRepository;
    private final ProductVariantRepository productVariantRepository;
    private final CartRepository cartRepository;
    private final OrderReviewRepository orderReviewRepository;

    public OrderController(OrderRepository orderRepository,
                           OrderDetailRepository orderDetailRepository,
                           UserRepository userRepository,
                           ProductVariantRepository productVariantRepository,
                           CartRepository cartRepository,
                           OrderReviewRepository orderReviewRepository) {
        this.orderRepository = orderRepository;
        this.orderDetailRepository = orderDetailRepository;
        this.userRepository = userRepository;
        this.productVariantRepository = productVariantRepository;
        this.cartRepository = cartRepository;
        this.orderReviewRepository = orderReviewRepository;
    }

    private boolean isAdmin(UserDetailsImpl userDetails) {
        if (userDetails == null) return false;
        return userDetails.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
    }

    // 1. Lấy danh sách lịch sử đơn hàng của người dùng hiện tại
    @GetMapping("/my-orders")
    public ResponseEntity<?> getMyOrders(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Chưa xác thực người dùng!");
        }
        List<Order> orders = orderRepository.findByUserIdOrderByIdDesc(userDetails.getId());
        return ResponseEntity.ok(orders);
    }

    // 2. Đặt hàng toàn bộ giỏ hàng (Checkout Cart)
    @PostMapping("/checkout-cart")
    @Transactional
    public ResponseEntity<?> checkoutCart(@AuthenticationPrincipal UserDetailsImpl userDetails,
                                         @RequestBody CheckoutCartRequest request) {
        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Chưa xác thực người dùng!");
        }

        if (request.getReceiverName() == null || request.getReceiverName().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Vui lòng nhập tên người nhận!");
        }
        if (request.getReceiverPhone() == null || request.getReceiverPhone().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Vui lòng nhập số điện thoại người nhận!");
        }
        if (request.getShippingAddress() == null || request.getShippingAddress().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Vui lòng nhập địa chỉ nhận hàng!");
        }

        User user = userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy thông tin người dùng!"));

        Cart cart = cartRepository.findByUserId(user.getId()).orElse(null);
        if (cart == null || cart.getCartItems() == null || cart.getCartItems().isEmpty()) {
            return ResponseEntity.badRequest().body("Giỏ hàng của bạn đang trống!");
        }

        // Kiểm tra tồn kho từng sản phẩm
        for (CartItem item : cart.getCartItems()) {
            ProductVariant variant = item.getProductVariant();
            if (variant.getStockQuantity() == null || variant.getStockQuantity() < item.getQuantity()) {
                String pName = (variant.getProduct() != null) ? variant.getProduct().getName() : "Sản phẩm";
                return ResponseEntity.badRequest().body(
                        "Sản phẩm '" + pName + " (" + variant.getColor() + ")' không đủ hàng trong kho (Còn: " +
                        (variant.getStockQuantity() != null ? variant.getStockQuantity() : 0) + ")!"
                );
            }
        }

        // Tạo đơn hàng
        Order order = new Order();
        order.setUser(user);
        order.setReceiverName(request.getReceiverName().trim());
        order.setReceiverPhone(request.getReceiverPhone().trim());
        order.setShippingAddress(request.getShippingAddress().trim());
        order.setStatus("PENDING");

        BigDecimal totalAmount = BigDecimal.ZERO;
        List<OrderDetail> details = new ArrayList<>();

        for (CartItem item : cart.getCartItems()) {
            ProductVariant variant = item.getProductVariant();
            BigDecimal itemPrice = variant.getPrice();
            BigDecimal lineTotal = itemPrice.multiply(BigDecimal.valueOf(item.getQuantity()));
            totalAmount = totalAmount.add(lineTotal);

            OrderDetail detail = new OrderDetail();
            detail.setOrder(order);
            detail.setProductVariant(variant);
            detail.setQuantity(item.getQuantity());
            detail.setPrice(itemPrice);
            details.add(detail);

            // Trừ tồn kho
            variant.setStockQuantity(variant.getStockQuantity() - item.getQuantity());
            productVariantRepository.save(variant);
        }

        order.setTotalAmount(totalAmount);
        order.setOrderDetails(details);

        Order savedOrder = orderRepository.save(order);

        // Làm rỗng giỏ hàng sau khi đặt thành công
        cart.getCartItems().clear();
        cartRepository.save(cart);

        return ResponseEntity.ok(savedOrder);
    }

    // 3. Đặt hàng 1 sản phẩm nhanh (Direct Single Variant Checkout)
    @PostMapping("/checkout")
    @Transactional
    public ResponseEntity<?> placeOrder(@AuthenticationPrincipal UserDetailsImpl userDetails,
                                        @RequestBody OrderRequest request) {
        Long userId = (userDetails != null) ? userDetails.getId() : request.getUserId();
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Chưa xác thực người dùng!");
        }

        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) return ResponseEntity.badRequest().body("Không tìm thấy người dùng!");

        Optional<ProductVariant> variantOpt = productVariantRepository.findById(request.getVariantId());
        if (variantOpt.isEmpty()) return ResponseEntity.badRequest().body("Sản phẩm không tồn tại!");

        ProductVariant variant = variantOpt.get();

        if (variant.getStockQuantity() == null || variant.getStockQuantity() < request.getQuantity()) {
            return ResponseEntity.badRequest().body("Không đủ hàng trong kho!");
        }

        Order order = new Order();
        order.setUser(userOpt.get());
        order.setReceiverName(request.getReceiverName());
        order.setReceiverPhone(request.getReceiverPhone());
        order.setShippingAddress(request.getShippingAddress());
        order.setStatus("PENDING");

        BigDecimal total = variant.getPrice().multiply(BigDecimal.valueOf(request.getQuantity()));
        order.setTotalAmount(total);

        List<OrderDetail> details = new ArrayList<>();
        OrderDetail detail = new OrderDetail();
        detail.setOrder(order);
        detail.setProductVariant(variant);
        detail.setQuantity(request.getQuantity());
        detail.setPrice(variant.getPrice());
        details.add(detail);

        order.setOrderDetails(details);

        Order savedOrder = orderRepository.save(order);

        variant.setStockQuantity(variant.getStockQuantity() - request.getQuantity());
        productVariantRepository.save(variant);

        return ResponseEntity.ok(savedOrder);
    }

    // 4. Hủy đơn hàng (khi ở trạng thái PENDING)
    @PutMapping("/{id}/cancel")
    @Transactional
    public ResponseEntity<?> cancelOrder(@AuthenticationPrincipal UserDetailsImpl userDetails,
                                         @PathVariable Long id) {
        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Chưa xác thực người dùng!");
        }

        Optional<Order> orderOpt = orderRepository.findById(id);
        if (orderOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("Đơn hàng không tồn tại!");
        }

        Order order = orderOpt.get();
        if (!order.getUser().getId().equals(userDetails.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Bạn không có quyền thao tác trên đơn hàng này!");
        }

        if (!"PENDING".equalsIgnoreCase(order.getStatus())) {
            return ResponseEntity.badRequest().body("Chỉ có thể hủy đơn hàng khi đang ở trạng thái Chờ xử lý!");
        }

        order.setStatus("CANCELLED");

        // Hoàn lại số lượng tồn kho
        if (order.getOrderDetails() != null) {
            for (OrderDetail detail : order.getOrderDetails()) {
                ProductVariant variant = detail.getProductVariant();
                if (variant != null && detail.getQuantity() != null) {
                    int currentStock = (variant.getStockQuantity() != null) ? variant.getStockQuantity() : 0;
                    variant.setStockQuantity(currentStock + detail.getQuantity());
                    productVariantRepository.save(variant);
                }
            }
        }

        orderRepository.save(order);
        return ResponseEntity.ok("Đã hủy đơn hàng thành công!");
    }

    // 5. Admin: Lấy toàn bộ đơn hàng trong hệ thống
    @GetMapping
    public ResponseEntity<?> getAllOrders(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (!isAdmin(userDetails)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Chỉ quản trị viên mới có quyền xem toàn bộ đơn hàng!");
        }
        List<Order> orders = orderRepository.findAllByOrderByIdDesc();
        return ResponseEntity.ok(orders);
    }

    // 6. Admin: Cập nhật trạng thái đơn hàng (PENDING, CONFIRMED, SHIPPING, DELIVERED, CANCELLED)
    @PutMapping("/{id}/status")
    @Transactional
    public ResponseEntity<?> updateOrderStatus(@AuthenticationPrincipal UserDetailsImpl userDetails,
                                               @PathVariable Long id,
                                               @RequestBody UpdateOrderStatusRequest request) {
        if (!isAdmin(userDetails)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Chỉ quản trị viên mới có quyền đổi trạng thái đơn hàng!");
        }
        if (request == null || request.getStatus() == null || request.getStatus().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Vui lòng cung cấp trạng thái mới!");
        }

        String newStatus = request.getStatus().trim().toUpperCase();
        List<String> validStatuses = List.of("PENDING", "CONFIRMED", "SHIPPING", "DELIVERED", "CANCELLED");
        if (!validStatuses.contains(newStatus)) {
            return ResponseEntity.badRequest().body("Trạng thái không hợp lệ: " + newStatus);
        }

        Optional<Order> orderOpt = orderRepository.findWithDetailsById(id);
        if (orderOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("Đơn hàng không tồn tại!");
        }

        Order order = orderOpt.get();
        String currentStatus = order.getStatus();

        // Nếu chuyển sang CANCELLED mà trước đó chưa hủy -> hoàn lại tồn kho
        if ("CANCELLED".equals(newStatus) && !"CANCELLED".equals(currentStatus)) {
            if (order.getOrderDetails() != null) {
                for (OrderDetail detail : order.getOrderDetails()) {
                    ProductVariant variant = detail.getProductVariant();
                    if (variant != null && detail.getQuantity() != null) {
                        int currentStock = (variant.getStockQuantity() != null) ? variant.getStockQuantity() : 0;
                        variant.setStockQuantity(currentStock + detail.getQuantity());
                        productVariantRepository.save(variant);
                    }
                }
            }
        }

        order.setStatus(newStatus);
        Order saved = orderRepository.save(order);
        return ResponseEntity.ok(saved);
    }

    // 7. Khách hàng: Xác nhận đã nhận được hàng (Mark as DELIVERED)
    @PutMapping("/{id}/received")
    @Transactional
    public ResponseEntity<?> markAsReceived(@AuthenticationPrincipal UserDetailsImpl userDetails,
                                            @PathVariable Long id) {
        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Chưa xác thực người dùng!");
        }

        Optional<Order> orderOpt = orderRepository.findWithDetailsById(id);
        if (orderOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("Đơn hàng không tồn tại!");
        }

        Order order = orderOpt.get();
        if (!order.getUser().getId().equals(userDetails.getId()) && !isAdmin(userDetails)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Bạn không có quyền thao tác trên đơn hàng này!");
        }

        if ("CANCELLED".equalsIgnoreCase(order.getStatus())) {
            return ResponseEntity.badRequest().body("Không thể xác nhận đơn hàng đã bị hủy!");
        }

        order.setStatus("DELIVERED");
        Order saved = orderRepository.save(order);
        return ResponseEntity.ok(saved);
    }

    // 8. Khách hàng: Đánh giá đơn hàng (Rating 1-5 sao & Comment)
    @PostMapping("/{id}/review")
    @Transactional
    public ResponseEntity<?> reviewOrder(@AuthenticationPrincipal UserDetailsImpl userDetails,
                                        @PathVariable Long id,
                                        @RequestBody ReviewRequest request) {
        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Chưa xác thực người dùng!");
        }

        if (request == null || request.getRating() == null || request.getRating() < 1 || request.getRating() > 5) {
            return ResponseEntity.badRequest().body("Vui lòng chọn đánh giá từ 1 đến 5 sao!");
        }

        Optional<Order> orderOpt = orderRepository.findWithDetailsById(id);
        if (orderOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("Đơn hàng không tồn tại!");
        }

        Order order = orderOpt.get();
        if (!order.getUser().getId().equals(userDetails.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Bạn chỉ có thể đánh giá đơn hàng của chính mình!");
        }

        if (!"DELIVERED".equalsIgnoreCase(order.getStatus())) {
            return ResponseEntity.badRequest().body("Bạn chỉ có thể đánh giá sau khi đơn hàng đã giao thành công!");
        }

        // Kiểm tra xem đơn hàng đã được đánh giá trước đó chưa
        Optional<OrderReview> existingReviewOpt = orderReviewRepository.findByOrderId(order.getId());
        OrderReview review;
        if (existingReviewOpt.isPresent()) {
            review = existingReviewOpt.get();
            review.setRating(request.getRating());
            review.setComment(request.getComment() != null ? request.getComment().trim() : "");
        } else {
            User user = userRepository.findById(userDetails.getId())
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy thông tin người dùng!"));
            review = new OrderReview(order, user, request.getRating(), request.getComment() != null ? request.getComment().trim() : "");
        }

        OrderReview savedReview = orderReviewRepository.save(review);
        order.setReview(savedReview);
        return ResponseEntity.ok(savedReview);
    }

    // 9. Lấy chi tiết 1 đơn hàng theo ID
    @GetMapping("/{id}")
    public ResponseEntity<?> getOrderById(@AuthenticationPrincipal UserDetailsImpl userDetails,
                                          @PathVariable Long id) {
        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Chưa xác thực người dùng!");
        }
        Optional<Order> orderOpt = orderRepository.findWithDetailsById(id);
        if (orderOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("Đơn hàng không tồn tại!");
        }
        Order order = orderOpt.get();
        if (!order.getUser().getId().equals(userDetails.getId()) && !isAdmin(userDetails)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Bạn không có quyền xem đơn hàng này!");
        }
        return ResponseEntity.ok(order);
    }
}
