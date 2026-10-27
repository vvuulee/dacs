package com.laptopstore.backend.dto;

import java.util.ArrayList;
import java.util.List;

public class PosOrderItemRequest {
    private Long variantId;
    private Integer quantity;
    private String note; // Ví dụ: "70% đường, ít đá"
    private List<Long> toppingIds = new ArrayList<>(); // Danh sách ID các topping chọn thêm cho ly này

    public PosOrderItemRequest() {
    }

    public PosOrderItemRequest(Long variantId, Integer quantity, String note) {
        this.variantId = variantId;
        this.quantity = quantity;
        this.note = note;
    }

    public PosOrderItemRequest(Long variantId, Integer quantity, String note, List<Long> toppingIds) {
        this.variantId = variantId;
        this.quantity = quantity;
        this.note = note;
        this.toppingIds = toppingIds;
    }

    public Long getVariantId() {
        return variantId;
    }

    public void setVariantId(Long variantId) {
        this.variantId = variantId;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
    }

    public String getNote() {
        return note;
    }

    public void setNote(String note) {
        this.note = note;
    }

    public List<Long> getToppingIds() {
        return toppingIds;
    }

    public void setToppingIds(List<Long> toppingIds) {
        this.toppingIds = toppingIds;
    }
}
