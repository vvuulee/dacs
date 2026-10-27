package com.laptopstore.backend.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "ingredients")
public class Ingredient {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, length = 50)
    private String unit;

    @Column(nullable = false)
    private Double quantity = 0.0;

    @Column(name = "min_quantity")
    private Double minQuantity = 0.0;

    @Column(length = 255)
    private String note;

    @Column(name = "last_checked_at")
    private LocalDateTime lastCheckedAt;

    @Column(name = "last_checked_by", length = 100)
    private String lastCheckedBy;

    public Ingredient() {
    }

    public Ingredient(String name, String unit, Double quantity, Double minQuantity, String note, String lastCheckedBy) {
        this.name = name;
        this.unit = unit;
        this.quantity = quantity != null ? quantity : 0.0;
        this.minQuantity = minQuantity != null ? minQuantity : 0.0;
        this.note = note;
        this.lastCheckedBy = lastCheckedBy;
        this.lastCheckedAt = LocalDateTime.now();
    }

    @PrePersist
    @PreUpdate
    public void onUpdate() {
        if (this.lastCheckedAt == null) {
            this.lastCheckedAt = LocalDateTime.now();
        }
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getUnit() {
        return unit;
    }

    public void setUnit(String unit) {
        this.unit = unit;
    }

    public Double getQuantity() {
        return quantity;
    }

    public void setQuantity(Double quantity) {
        this.quantity = quantity;
    }

    public Double getMinQuantity() {
        return minQuantity;
    }

    public void setMinQuantity(Double minQuantity) {
        this.minQuantity = minQuantity;
    }

    public String getNote() {
        return note;
    }

    public void setNote(String note) {
        this.note = note;
    }

    public LocalDateTime getLastCheckedAt() {
        return lastCheckedAt;
    }

    public void setLastCheckedAt(LocalDateTime lastCheckedAt) {
        this.lastCheckedAt = lastCheckedAt;
    }

    public String getLastCheckedBy() {
        return lastCheckedBy;
    }

    public void setLastCheckedBy(String lastCheckedBy) {
        this.lastCheckedBy = lastCheckedBy;
    }
}
