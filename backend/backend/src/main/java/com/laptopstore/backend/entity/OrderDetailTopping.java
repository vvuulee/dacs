package com.laptopstore.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.math.BigDecimal;

/**
 * Thực thể lưu trữ các Topping được chọn cho từng ly nước trong hóa đơn
 */
@Entity
@Table(name = "order_detail_toppings")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class OrderDetailTopping {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Thuộc về ly nước nào
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_detail_id", nullable = false)
    @JsonIgnore
    private OrderDetail orderDetail;

    // Tham chiếu đến loại topping trong thực đơn
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "topping_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Topping topping;

    // Snapshot tên topping tại thời điểm bán (để in bill)
    private String toppingName;

    // Giá tiền của phần topping tại thời điểm bán
    @Column(nullable = false)
    private BigDecimal price;

    // Số lượng phần topping (mặc định 1)
    @Column(nullable = false)
    private Integer quantity = 1;

    public OrderDetailTopping() {
    }

    public OrderDetailTopping(OrderDetail orderDetail, Topping topping, String toppingName, BigDecimal price, Integer quantity) {
        this.orderDetail = orderDetail;
        this.topping = topping;
        this.toppingName = toppingName;
        this.price = price;
        this.quantity = quantity != null ? quantity : 1;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public OrderDetail getOrderDetail() {
        return orderDetail;
    }

    public void setOrderDetail(OrderDetail orderDetail) {
        this.orderDetail = orderDetail;
    }

    public Topping getTopping() {
        return topping;
    }

    public void setTopping(Topping topping) {
        this.topping = topping;
    }

    public String getToppingName() {
        return toppingName;
    }

    public void setToppingName(String toppingName) {
        this.toppingName = toppingName;
    }

    public BigDecimal getPrice() {
        return price;
    }

    public void setPrice(BigDecimal price) {
        this.price = price;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
    }
}

