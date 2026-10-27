package com.laptopstore.backend.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "toppings")
public class Topping {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private Double price;

    @Column(name = "is_available")
    private Boolean isAvailable = true;

    public Topping() {
    }

    public Topping(String name, Double price, Boolean isAvailable) {
        this.name = name;
        this.price = price;
        this.isAvailable = isAvailable != null ? isAvailable : true;
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

    public Double getPrice() {
        return price;
    }

    public void setPrice(Double price) {
        this.price = price;
    }

    public Boolean getIsAvailable() {
        return isAvailable;
    }

    public void setIsAvailable(Boolean isAvailable) {
        this.isAvailable = isAvailable;
    }
}
