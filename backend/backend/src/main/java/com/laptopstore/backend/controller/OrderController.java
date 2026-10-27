package com.laptopstore.backend.controller;

import com.laptopstore.backend.dto.PosOrderItemRequest;
import com.laptopstore.backend.dto.PosOrderRequest;
import com.laptopstore.backend.entity.Order;
import com.laptopstore.backend.security.UserDetailsImpl;
import com.laptopstore.backend.service.OrderService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.NoSuchElementException;

/**
 * Controller xử lý Bán hàng tại quầy (Coffee Shop POS Controller)
 * Đã refactor chuyển toàn bộ logic nghiệp vụ và transaction sang OrderService
 */
@CrossOrigin("*")
@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    // 1. Tạo hóa đơn bán hàng tại quầy (POS Order)
    @PostMapping
    public ResponseEntity<?> createPosOrder(@AuthenticationPrincipal UserDetailsImpl userDetails,
                                            @RequestBody PosOrderRequest request) {
        try {
            Long staffId = (userDetails != null) ? userDetails.getId() : null;
            Order savedOrder = orderService.createPosOrder(staffId, request);
            return new ResponseEntity<>(savedOrder, HttpStatus.CREATED);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(e.getMessage());
        }
    }

    // 2. Lấy danh sách hóa đơn (Có thể lọc theo status: UNPAID hoặc PAID)
    @GetMapping
    public List<Order> getAllOrders(@RequestParam(required = false) String status) {
        return orderService.getAllOrders(status);
    }

    // 3. Lấy chi tiết 1 hóa đơn (để xem hoặc in lại bill)
    @GetMapping("/{id}")
    public ResponseEntity<?> getOrderById(@PathVariable Long id) {
        return orderService.getOrderById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // 4. Khách gọi thêm món vào bàn đang ngồi (chưa thanh toán)
    @PostMapping("/{id}/items")
    public ResponseEntity<?> addItemsToOrder(@PathVariable Long id,
                                             @RequestBody List<PosOrderItemRequest> newItems) {
        try {
            Order updated = orderService.addItemsToOrder(id, newItems);
            return ResponseEntity.ok(updated);
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(e.getMessage());
        }
    }

    // 5. Thanh toán chốt hóa đơn cho bàn (Chuyển trạng thái sang PAID)
    @PutMapping("/{id}/pay")
    public ResponseEntity<?> payOrder(@PathVariable Long id,
                                      @RequestParam(required = false) String paymentMethod) {
        try {
            Order paidOrder = orderService.payOrder(id, paymentMethod);
            return ResponseEntity.ok(paidOrder);
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(e.getMessage());
        }
    }

    // 6. Báo cáo nhanh bán hàng trong ngày hôm nay
    @GetMapping("/today-report")
    public ResponseEntity<?> getTodayReport() {
        return ResponseEntity.ok(orderService.getTodayReport());
    }
}
