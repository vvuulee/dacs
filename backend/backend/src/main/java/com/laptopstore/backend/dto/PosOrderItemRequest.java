package com.laptopstore.backend.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import java.util.ArrayList;
import java.util.List;

public class PosOrderItemRequest {

    @JsonAlias({"variantId", "variant_id", "size_id", "sizeId"})
    private Long variantId;

    @JsonAlias({"productId", "product_id"})
    private Long productId;

    private Integer quantity;
    private String note; // Ví dụ: "70% đường, ít đá"

    @JsonAlias({"toppingIds", "topping_ids"})
    private List<Long> toppingIds = new ArrayList<>();

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

    public Long getProductId() {
        return productId;
    }

    public void setProductId(Long productId) {
        this.productId = productId;
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
