package com.laptopstore.backend.dto;

import java.util.List;

public class PosOrderRequest {
    private String orderType;     // DINE_IN (Tại quán) hoặc TAKE_AWAY (Mang về)
    private String tableName;     // Bàn 01, Bàn 02...
    private String status;        // PAID (Đã thanh toán) hoặc UNPAID (Chưa thanh toán / Phục vụ trước)
    private String paymentMethod; // CASH, TRANSFER, CARD
    private String note;          // Ghi chú đơn
    private List<PosOrderItemRequest> items;

    public PosOrderRequest() {
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

    public List<PosOrderItemRequest> getItems() {
        return items;
    }

    public void setItems(List<PosOrderItemRequest> items) {
        this.items = items;
    }
}
