package com.laptopstore.backend.dto;

public class UpdateOrderStatusRequest {
    private String status;

    public UpdateOrderStatusRequest() {
    }

    public UpdateOrderStatusRequest(String status) {
        this.status = status;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
