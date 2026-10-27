package com.laptopstore.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import org.hibernate.annotations.CreationTimestamp;

/**
 * Hóa đơn bán hàng tại quầy (Coffee POS Invoice)
 * - Quản lý trạng thái: PAID (Đã thanh toán) hoặc UNPAID (Chưa thanh toán / Bàn đang phục vụ)
 * - Cho phép khách ngồi tại bàn gọi thêm món trước khi thanh toán chốt bill
 */
@Entity
@Table(name = "orders")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Nhân viên / Thu ngân tạo hóa đơn
    @ManyToOne
    @JoinColumn(name = "user_id")
    @JsonIgnoreProperties({"password", "hibernateLazyInitializer", "handler"})
    private User staff;

    // Hình thức: DINE_IN (Dùng tại quán) hoặc TAKE_AWAY (Mang về)
    @Column(nullable = false)
    private String orderType = "DINE_IN";

    // Số bàn nếu dùng tại quán (Ví dụ: "Bàn 01", "Bàn 02"...)
    private String tableName;

    // Trạng thái hóa đơn: "PAID" (Đã thanh toán) hoặc "UNPAID" (Chưa thanh toán / Đang phục vụ)
    @Column(nullable = false)
    private String status = "PAID";

    // Hình thức thanh toán: CASH (Tiền mặt), TRANSFER (Chuyển khoản QR), CARD (Thẻ)
    @Column(nullable = false)
    private String paymentMethod = "CASH";

    // Ghi chú hóa đơn (Ví dụ: "Khách mang về, cho ly giấy...")
    private String note;

    // Tổng tiền thanh toán
    @Column(nullable = false)
    private BigDecimal totalAmount = BigDecimal.ZERO;

    // Thời gian xuất hóa đơn
    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createAt;

    // Danh sách món trong hóa đơn
    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderDetail> orderDetails = new ArrayList<>();

    public Order() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public User getStaff() {
        return staff;
    }

    public void setStaff(User staff) {
        this.staff = staff;
    }

    public String getOrderType() {
        return orderType;
    }

    public void setOrderType(String orderType) {
        this.orderType = orderType;
    }

    public String getTableName() {
        return tableName;
    }

    public void setTableName(String tableName) {
        this.tableName = tableName;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getPaymentMethod() {
        return paymentMethod;
    }

    public void setPaymentMethod(String paymentMethod) {
        this.paymentMethod = paymentMethod;
    }

    public String getNote() {
        return note;
    }

    public void setNote(String note) {
        this.note = note;
    }

    public BigDecimal getTotalAmount() {
        return totalAmount;
    }

    public void setTotalAmount(BigDecimal totalAmount) {
        this.totalAmount = totalAmount;
    }

    public LocalDateTime getCreateAt() {
        return createAt;
    }

    public void setCreateAt(LocalDateTime createAt) {
        this.createAt = createAt;
    }

    public List<OrderDetail> getOrderDetails() {
        return orderDetails;
    }

    public void setOrderDetails(List<OrderDetail> orderDetails) {
        this.orderDetails = orderDetails;
    }
}
