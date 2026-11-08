package com.laptopstore.backend.controller;

import com.laptopstore.backend.dto.PosOrderItemRequest;
import com.laptopstore.backend.dto.PosOrderRequest;
import com.laptopstore.backend.entity.Order;
import com.laptopstore.backend.entity.OrderDetail;
import com.laptopstore.backend.security.UserDetailsImpl;
import com.laptopstore.backend.service.OrderService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Controller xử lý Hóa đơn Đa Kênh (POS Quầy & Coffee Web Online)
 */
@CrossOrigin("*")
@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    public static Map<String, Object> formatOrder(Order order) {
        if (order == null) return null;
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("id", order.getId().toString());

        // Chuẩn hóa status cho frontend (placed, preparing, delivering, delivered, cancelled, completed)
        String rawStatus = order.getStatus() != null ? order.getStatus().toLowerCase() : "placed";
        if ("paid".equals(rawStatus) || "success".equals(rawStatus)) rawStatus = "completed";
        if ("unpaid".equals(rawStatus)) rawStatus = "placed";
        res.put("status", rawStatus);

        // Chuẩn hóa source và service_type
        String rawType = order.getOrderType() != null ? order.getOrderType().toLowerCase() : "delivery";
        if ("take_away".equals(rawType)) rawType = "takeaway";
        boolean isCounter = "dine_in".equals(rawType) || "takeaway".equals(rawType);
        res.put("source", isCounter ? "counter" : "online");
        res.put("service_type", isCounter ? rawType : "delivery");
        res.put("order_type", order.getOrderType());
        res.put("orderType", order.getOrderType());

        String table = order.getTableName() != null ? order.getTableName() : null;
        res.put("table", table);
        res.put("table_name", table);
        res.put("tableName", table);

        // Chuẩn hóa payment_method (cash, bank_transfer, wallet)
        String pMethod = order.getPaymentMethod() != null ? order.getPaymentMethod().toLowerCase() : "cash";
        if ("transfer".equals(pMethod) || "qr".equals(pMethod)) pMethod = "bank_transfer";
        res.put("payment_method", pMethod);
        res.put("paymentMethod", pMethod);

        // Chuẩn hóa payment_status (unpaid, pending, paid, expired)
        String pStatus = order.getPaymentStatus() != null ? order.getPaymentStatus().toLowerCase() : "unpaid";
        if ("completed".equals(rawStatus)) pStatus = "paid";
        res.put("payment_status", pStatus);
        res.put("paymentStatus", pStatus);

        String custName = (order.getCustomerName() != null && !order.getCustomerName().isBlank()) ? order.getCustomerName() : "Khách hàng";
        String custPhone = (order.getCustomerPhone() != null && !order.getCustomerPhone().isBlank()) ? order.getCustomerPhone() : "0901234567";
        Map<String, String> custMap = new LinkedHashMap<>();
        custMap.put("name", custName);
        custMap.put("phone", custPhone);
        res.put("customer", isCounter ? null : custMap);
        res.put("customer_name", custName);
        res.put("customerName", custName);
        res.put("customer_phone", custPhone);
        res.put("customerPhone", custPhone);

        String street = (order.getDeliveryAddress() != null && !order.getDeliveryAddress().isBlank()) ? order.getDeliveryAddress() : "Tại quán";
        Map<String, String> addrMap = new LinkedHashMap<>();
        addrMap.put("street", street);
        addrMap.put("ward_name", "Phường Bến Nghé");
        addrMap.put("province_name", "TP. Hồ Chí Minh");
        res.put("address", isCounter ? null : addrMap);
        res.put("delivery_address", street);
        res.put("deliveryAddress", street);

        int totalAmount = order.getTotalAmount() != null ? order.getTotalAmount().intValue() : 0;
        res.put("cash_received", isCounter ? totalAmount : null);
        res.put("change", isCounter ? 0 : null);

        res.put("note", order.getNote() != null ? order.getNote() : "");
        res.put("subtotal", order.getSubtotal() != null ? order.getSubtotal().intValue() : totalAmount);
        res.put("delivery_fee", order.getDeliveryFee() != null ? order.getDeliveryFee().intValue() : 0);
        res.put("deliveryFee", order.getDeliveryFee());
        res.put("discount", order.getDiscount() != null ? order.getDiscount().intValue() : 0);
        res.put("voucher_code", order.getVoucherCode());
        res.put("voucherCode", order.getVoucherCode());
        res.put("total", totalAmount);
        res.put("total_amount", order.getTotalAmount());
        res.put("totalAmount", order.getTotalAmount());

        String createdIso = order.getCreateAt() != null ? order.getCreateAt().toString() : LocalDateTime.now().toString();
        res.put("created_at", createdIso);
        res.put("createAt", order.getCreateAt());
        res.put("payment", null);

        List<Map<String, Object>> itemsList = new ArrayList<>();
        if (order.getOrderDetails() != null) {
            for (OrderDetail d : order.getOrderDetails()) {
                Map<String, Object> it = new LinkedHashMap<>();
                String pId = (d.getProductVariant() != null && d.getProductVariant().getProduct() != null)
                        ? d.getProductVariant().getProduct().getId().toString()
                        : "1";
                it.put("product_id", pId);
                it.put("productId", pId);
                it.put("name", d.getProductName() != null ? d.getProductName() : "Đồ uống");
                it.put("summary", d.getSize() != null ? d.getSize() : "Size M");
                it.put("note", d.getNote() != null ? d.getNote() : "");
                it.put("quantity", d.getQuantity() != null ? d.getQuantity() : 1);
                it.put("unit_price", d.getPrice() != null ? d.getPrice().intValue() : 0);
                it.put("price", d.getPrice());
                itemsList.add(it);
            }
        }
        res.put("items", itemsList);
        res.put("orderDetails", order.getOrderDetails());

        return res;
    }

    // 1. Tạo đơn hàng (POS quầy hoặc Đặt online giao hàng)
    @PostMapping
    public ResponseEntity<?> createOrder(@AuthenticationPrincipal UserDetailsImpl userDetails,
                                         @RequestBody PosOrderRequest request) {
        try {
            Long staffId = (userDetails != null) ? userDetails.getId() : null;
            Order savedOrder = orderService.createPosOrder(staffId, request);
            return new ResponseEntity<>(formatOrder(savedOrder), HttpStatus.CREATED);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(Map.of("message", e.getMessage(), "code", "voucher_invalid"));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", e.getMessage()));
        }
    }

    // 2. Lấy danh sách hóa đơn (lọc theo status)
    @GetMapping
    public List<Map<String, Object>> getAllOrders(@RequestParam(required = false) String status) {
        return orderService.getAllOrders(status).stream()
                .map(OrderController::formatOrder)
                .collect(Collectors.toList());
    }

    // 3. Lấy chi tiết 1 hóa đơn (hỗ trợ kiểm tra SĐT khi tra cứu online)
    @GetMapping("/{id}")
    public ResponseEntity<?> getOrderById(@PathVariable Long id,
                                          @RequestParam(required = false) String phone) {
        return orderService.getOrderById(id, phone)
                .map(order -> ResponseEntity.ok(formatOrder(order)))
                .orElse(ResponseEntity.notFound().build());
    }

    // 4. Khách gọi thêm món vào bàn đang ngồi
    @PostMapping("/{id}/items")
    public ResponseEntity<?> addItemsToOrder(@PathVariable Long id,
                                             @RequestBody List<PosOrderItemRequest> newItems) {
        try {
            Order updated = orderService.addItemsToOrder(id, newItems);
            return ResponseEntity.ok(formatOrder(updated));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", e.getMessage()));
        }
    }

    // 5. Thanh toán chốt hóa đơn (PAID)
    @PutMapping("/{id}/pay")
    public ResponseEntity<?> payOrder(@PathVariable Long id,
                                      @RequestParam(required = false) String paymentMethod) {
        try {
            Order paidOrder = orderService.payOrder(id, paymentMethod);
            return ResponseEntity.ok(formatOrder(paidOrder));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", e.getMessage()));
        }
    }

    // 6. Cập nhật trạng thái đơn (placed -> preparing -> delivering -> delivered)
    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(@PathVariable Long id,
                                          @RequestParam String status) {
        try {
            Order updated = orderService.updateOrderStatus(id, status);
            return ResponseEntity.ok(formatOrder(updated));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", e.getMessage()));
        }
    }

    // 7. Báo cáo nhanh bán hàng trong ngày hôm nay
    @GetMapping("/today-report")
    public ResponseEntity<?> getTodayReport() {
        return ResponseEntity.ok(orderService.getTodayReport());
    }
}
