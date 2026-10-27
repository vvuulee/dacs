package com.laptopstore.backend.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "product_variants")
@com.fasterxml.jackson.annotation.JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class ProductVariant {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "product_id")
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties({"variants", "hibernateLazyInitializer", "handler"})
    private Product product;

    // Lưu kích cỡ đồ uống: Size S, Size M, Size L
    private String size;

    @Column(nullable = false)
    private String color;

    @Column(nullable = false)
    private BigDecimal price;

    private Integer stockQuantity;
    private String imageUrl;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Product getProduct() {
        return product;
    }

    public void setProduct(Product product) {
        this.product = product;
    }

    public String getSize() {
        return size != null ? size : color;
    }

    public void setSize(String size) {
        this.size = size;
        if (this.color == null || this.color.isBlank()) {
            this.color = size;
        }
    }

    public String getColor() {
        return color != null ? color : size;
    }

    public void setColor(String color) {
        this.color = color;
        if (this.size == null || this.size.isBlank()) {
            this.size = color;
        }
    }

    public BigDecimal getPrice() {
        return price;
    }

    public void setPrice(BigDecimal price) {
        this.price = price;
    }

    public Integer getStockQuantity() {
        return stockQuantity;
    }

    public void setStockQuantity(Integer stockQuantity) {
        this.stockQuantity = stockQuantity;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }
}