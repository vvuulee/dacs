package com.laptopstore.backend.controller;

import com.laptopstore.backend.dto.PosOrderItemRequest;
import com.laptopstore.backend.dto.PosOrderRequest;
import com.laptopstore.backend.entity.Order;
import com.laptopstore.backend.entity.OrderDetail;
import com.laptopstore.backend.entity.OrderDetailTopping;
import com.laptopstore.backend.entity.ProductVariant;
import com.laptopstore.backend.entity.Topping;
import com.laptopstore.backend.entity.User;
import com.laptopstore.backend.repository.OrderDetailRepository;
import com.laptopstore.backend.repository.OrderRepository;
import com.laptopstore.backend.repository.ProductVariantRepository;
import com.laptopstore.backend.repository.ToppingRepository;
import com.laptopstore.backend.repository.UserRepository;
import com.laptopstore.backend.security.UserDetailsImpl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;

/**
 * Controller xử lý Bán hàng tại quầy (Coffee Shop POS Controller)
 * - Quản lý trạng thái: PAID (Đã thanh toán) / UNPAID (Chưa thanh toán - Bàn đang phục vụ)
 * - Hỗ trợ gọi thêm món cho bàn đang ngồi và thanh toán chốt bill sau
 */
@CrossOrigin("*")
@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderRepository orderRepository;
    private final OrderDetailRepository orderDetailRepository;
    private final ProductVariantRepository productVariantRepository;
    private final UserRepository userRepository;
    private final ToppingRepository toppingRepository;

    public OrderController(OrderRepository orderRepository,
                           OrderDetailRepository orderDetailRepository,
                           ProductVariantRepository productVariantRepository,
                           UserRepository userRepository,
                           ToppingRepository toppingRepository) {
        this.orderRepository = orderRepository;
        this.orderDetailRepository = orderDetailRepository;
        this.productVariantRepository = productVariantRepository;
        this.userRepository = userRepository;
        this.toppingRepository = toppingRepository;
    }

    // 1. Tạo hóa đơn bán hàng tại quầy (POS Order)
    @PostMapping
    @Transactional
    public ResponseEntity<?> createPosOrder(@AuthenticationPrincipal UserDetailsImpl userDetails,
                                            @RequestBody PosOrderRequest request) {
        if (request.getItems() == null || request.getItems().isEmpty()) {
            return ResponseEntity.badRequest().body("Hóa đơn phải có ít nhất 1 món đồ uống / bánh ngọt!");
        }

        // Lấy nhân viên / thu ngân đang đăng nhập
        User staff = null;
        if (userDetails != null && userDetails.getId() != null) {
            staff = userRepository.findById(userDetails.getId()).orElse(null);
        }

        Order order = new Order();
        order.setStaff(staff);
        order.setOrderType(request.getOrderType() != null && !request.getOrderType().isBlank() ? request.getOrderType() : "DINE_IN");
        order.setTableName(request.getTableName());

        // Thiết lập trạng thái: Mặc định là PAID (đã thanh toán), hoặc UNPAID nếu là bàn gọi trước trả sau
        String status = (request.getStatus() != null && !request.getStatus().isBlank())
                ? request.getStatus().trim().toUpperCase()
                : "PAID";
        order.setStatus(status);

        order.setPaymentMethod(request.getPaymentMethod() != null && !request.getPaymentMethod().isBlank() ? request.getPaymentMethod() : "CASH");
        order.setNote(request.getNote());

        BigDecimal totalAmount = BigDecimal.ZERO;
        List<OrderDetail> detailList = new ArrayList<>();

        for (PosOrderItemRequest itemReq : request.getItems()) {
            if (itemReq.getVariantId() == null) {
                return ResponseEntity.badRequest().body("Món không hợp lệ (thiếu mã biến thể)!");
            }
            int qty = (itemReq.getQuantity() != null && itemReq.getQuantity() > 0) ? itemReq.getQuantity() : 1;

            ProductVariant variant = productVariantRepository.findById(itemReq.getVariantId())
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy món với mã biến thể: " + itemReq.getVariantId()));

            // Trừ tồn kho nếu có quản lý
            if (variant.getStockQuantity() != null) {
                int remaining = Math.max(0, variant.getStockQuantity() - qty);
                variant.setStockQuantity(remaining);
                productVariantRepository.save(variant);
            }

            BigDecimal unitPrice = variant.getPrice() != null ? variant.getPrice() : BigDecimal.ZERO;
            BigDecimal itemTotal = unitPrice.multiply(BigDecimal.valueOf(qty));

            OrderDetail detail = new OrderDetail();
            detail.setOrder(order);
            detail.setProductVariant(variant);
            detail.setProductName(variant.getProduct() != null ? variant.getProduct().getName() : "Đồ uống");
            detail.setSize(variant.getSize() != null ? variant.getSize() : "Size M");
            detail.setQuantity(qty);
            detail.setPrice(unitPrice);
            detail.setNote(itemReq.getNote());

            // Xử lý các topping đi kèm của ly này
            if (itemReq.getToppingIds() != null && !itemReq.getToppingIds().isEmpty()) {
                for (Long toppingId : itemReq.getToppingIds()) {
                    if (toppingId != null) {
                        Optional<Topping> toppingOpt = toppingRepository.findById(toppingId);
                        if (toppingOpt.isPresent()) {
                            Topping t = toppingOpt.get();
                            BigDecimal toppingPrice = BigDecimal.valueOf(t.getPrice() != null ? t.getPrice() : 0.0);

                            OrderDetailTopping detailTopping = new OrderDetailTopping(
                                    detail,
                                    t,
                                    t.getName(),
                                    toppingPrice,
                                    1
                            );
                            detail.getToppings().add(detailTopping);
                            itemTotal = itemTotal.add(toppingPrice.multiply(BigDecimal.valueOf(qty)));
                        }
                    }
                }
            }

            totalAmount = totalAmount.add(itemTotal);
            detailList.add(detail);
        }

        order.setTotalAmount(totalAmount);
        order.setOrderDetails(detailList);

        Order savedOrder = orderRepository.save(order);
        return new ResponseEntity<>(savedOrder, HttpStatus.CREATED);
    }

    // 2. Lấy danh sách hóa đơn (Có thể lọc theo status: UNPAID hoặc PAID)
    @GetMapping
    public List<Order> getAllOrders(@RequestParam(required = false) String status) {
        if (status != null && !status.isBlank()) {
            return orderRepository.findByStatusOrderByIdDesc(status.trim().toUpperCase());
        }
        return orderRepository.findAllByOrderByIdDesc();
    }

    // 3. Lấy chi tiết 1 hóa đơn (để xem hoặc in lại bill)
    @GetMapping("/{id}")
    public ResponseEntity<?> getOrderById(@PathVariable Long id) {
        return orderRepository.findWithDetailsById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // 4. Khách gọi thêm món vào bàn đang ngồi (chưa thanh toán)
    @PostMapping("/{id}/items")
    @Transactional
    public ResponseEntity<?> addItemsToOrder(@PathVariable Long id,
                                             @RequestBody List<PosOrderItemRequest> newItems) {
        if (newItems == null || newItems.isEmpty()) {
            return ResponseEntity.badRequest().body("Danh sách món gọi thêm không được để trống!");
        }

        Optional<Order> orderOpt = orderRepository.findWithDetailsById(id);
        if (orderOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Không tìm thấy bàn/hóa đơn với mã: " + id);
        }

        Order order = orderOpt.get();
        BigDecimal addedAmount = BigDecimal.ZERO;

        for (PosOrderItemRequest itemReq : newItems) {
            if (itemReq.getVariantId() == null) continue;
            int qty = (itemReq.getQuantity() != null && itemReq.getQuantity() > 0) ? itemReq.getQuantity() : 1;

            ProductVariant variant = productVariantRepository.findById(itemReq.getVariantId())
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy món với mã biến thể: " + itemReq.getVariantId()));

            // Trừ tồn kho nếu có quản lý
            if (variant.getStockQuantity() != null) {
                int remaining = Math.max(0, variant.getStockQuantity() - qty);
                variant.setStockQuantity(remaining);
                productVariantRepository.save(variant);
            }

            BigDecimal unitPrice = variant.getPrice() != null ? variant.getPrice() : BigDecimal.ZERO;
            BigDecimal itemTotal = unitPrice.multiply(BigDecimal.valueOf(qty));

            OrderDetail detail = new OrderDetail();
            detail.setOrder(order);
            detail.setProductVariant(variant);
            detail.setProductName(variant.getProduct() != null ? variant.getProduct().getName() : "Đồ uống");
            detail.setSize(variant.getSize() != null ? variant.getSize() : "Size M");
            detail.setQuantity(qty);
            detail.setPrice(unitPrice);
            detail.setNote(itemReq.getNote());

            if (itemReq.getToppingIds() != null && !itemReq.getToppingIds().isEmpty()) {
                for (Long toppingId : itemReq.getToppingIds()) {
                    if (toppingId != null) {
                        Optional<Topping> toppingOpt = toppingRepository.findById(toppingId);
                        if (toppingOpt.isPresent()) {
                            Topping t = toppingOpt.get();
                            BigDecimal toppingPrice = BigDecimal.valueOf(t.getPrice() != null ? t.getPrice() : 0.0);

                            OrderDetailTopping detailTopping = new OrderDetailTopping(
                                    detail,
                                    t,
                                    t.getName(),
                                    toppingPrice,
                                    1
                            );
                            detail.getToppings().add(detailTopping);
                            itemTotal = itemTotal.add(toppingPrice.multiply(BigDecimal.valueOf(qty)));
                        }
                    }
                }
            }

            addedAmount = addedAmount.add(itemTotal);
            order.getOrderDetails().add(detail);
        }

        order.setTotalAmount(order.getTotalAmount().add(addedAmount));
        Order updated = orderRepository.save(order);
        return ResponseEntity.ok(updated);
    }

    // 5. Thanh toán chốt hóa đơn cho bàn (Chuyển trạng thái sang PAID)
    @PutMapping("/{id}/pay")
    @Transactional
    public ResponseEntity<?> payOrder(@PathVariable Long id,
                                      @RequestParam(required = false) String paymentMethod) {
        Optional<Order> orderOpt = orderRepository.findById(id);
        if (orderOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Không tìm thấy hóa đơn với mã: " + id);
        }

        Order order = orderOpt.get();
        if ("PAID".equalsIgnoreCase(order.getStatus())) {
            return ResponseEntity.badRequest().body("Hóa đơn này đã được thanh toán trước đó rồi!");
        }

        order.setStatus("PAID");
        if (paymentMethod != null && !paymentMethod.isBlank()) {
            order.setPaymentMethod(paymentMethod.trim().toUpperCase());
        }

        Order paidOrder = orderRepository.save(order);
        return ResponseEntity.ok(paidOrder);
    }

    // 6. Báo cáo nhanh bán hàng trong ngày hôm nay
    @GetMapping("/today-report")
    public ResponseEntity<?> getTodayReport() {
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        LocalDateTime endOfDay = LocalDate.now().atTime(LocalTime.MAX);

        List<Order> todayOrders = orderRepository.findByCreateAtBetweenOrderByIdDesc(startOfDay, endOfDay);

        BigDecimal totalRevenue = BigDecimal.ZERO;      // Doanh thu từ đơn đã thanh toán
        BigDecimal unpaidAmount = BigDecimal.ZERO;      // Tiền chưa thu từ bàn đang ngồi
        BigDecimal cashRevenue = BigDecimal.ZERO;
        BigDecimal transferRevenue = BigDecimal.ZERO;

        int paidOrdersCount = 0;
        int unpaidOrdersCount = 0;
        int totalItemsSold = 0;

        for (Order order : todayOrders) {
            BigDecimal amount = order.getTotalAmount() != null ? order.getTotalAmount() : BigDecimal.ZERO;

            if ("PAID".equalsIgnoreCase(order.getStatus())) {
                paidOrdersCount++;
                totalRevenue = totalRevenue.add(amount);

                if ("TRANSFER".equalsIgnoreCase(order.getPaymentMethod())) {
                    transferRevenue = transferRevenue.add(amount);
                } else {
                    cashRevenue = cashRevenue.add(amount);
                }

                if (order.getOrderDetails() != null) {
                    for (OrderDetail d : order.getOrderDetails()) {
                        totalItemsSold += (d.getQuantity() != null ? d.getQuantity() : 0);
                    }
                }
            } else {
                unpaidOrdersCount++;
                unpaidAmount = unpaidAmount.add(amount);
            }
        }

        Map<String, Object> report = new LinkedHashMap<>();
        report.put("todayDate", LocalDate.now().toString());
        report.put("totalOrdersCount", todayOrders.size());
        report.put("paidOrdersCount", paidOrdersCount);
        report.put("unpaidOrdersCount", unpaidOrdersCount);
        report.put("totalRevenue", totalRevenue);
        report.put("unpaidAmount", unpaidAmount);
        report.put("cashRevenue", cashRevenue);
        report.put("transferRevenue", transferRevenue);
        report.put("totalItemsSold", totalItemsSold);

        return ResponseEntity.ok(report);
    }
}
