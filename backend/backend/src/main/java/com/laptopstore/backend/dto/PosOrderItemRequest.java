package com.laptopstore.backend.dto;

public class PosOrderItemRequest {
    private Long variantId;
    private Integer quantity;
    private String note; // Ví dụ: "70% đường, ít đá, kèm kem cheese"

    public PosOrderItemRequest() {
    }

    public PosOrderItemRequest(Long variantId, Integer quantity, String note) {
        this.variantId = variantId;
        this.quantity = quantity;
        this.note = note;
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
}

