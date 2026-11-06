package com.laptopstore.backend.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import java.util.List;
import java.util.Map;

public class PosOrderRequest {

    @JsonAlias({"clientRequestId", "client_request_id"})
    private String clientRequestId;

    @JsonAlias({"customerName", "customer_name"})
    private String customerName;

    @JsonAlias({"customerPhone", "customer_phone"})
    private String customerPhone;

    // Hỗ trợ cấu trúc customer: { name, phone } từ coffee-web
    private Map<String, Object> customer;

    @JsonAlias({"deliveryAddress", "delivery_address"})
    private String deliveryAddress;

    // Hỗ trợ cấu trúc address: { street, ward_name, province_name } từ coffee-web
    private Object address;

    @JsonAlias({"orderType", "order_type"})
    private String orderType;     // DINE_IN (Tại quán), TAKE_AWAY (Mang về), DELIVERY (Giao hàng)

    @JsonAlias({"tableName", "table_name"})
    private String tableName;     // Bàn 01, Bàn 02...

    private String status;        // placed, preparing, delivering, delivered, cancelled, PAID, UNPAID

    @JsonAlias({"paymentMethod", "payment_method"})
    private String paymentMethod; // cash, bank_transfer, wallet, CASH, TRANSFER

    @JsonAlias({"paymentStatus", "payment_status"})
    private String paymentStatus;

    @JsonAlias({"voucherCode", "voucher_code"})
    private String voucherCode;

    private String note;
    private List<PosOrderItemRequest> items;

    public PosOrderRequest() {
    }

    public String getClientRequestId() {
        return clientRequestId;
    }

    public void setClientRequestId(String clientRequestId) {
        this.clientRequestId = clientRequestId;
    }

    public String getCustomerName() {
        if (customerName != null && !customerName.isBlank()) return customerName;
        if (customer != null && customer.get("name") != null) return customer.get("name").toString();
        return null;
    }

    public void setCustomerName(String customerName) {
        this.customerName = customerName;
    }

    public String getCustomerPhone() {
        if (customerPhone != null && !customerPhone.isBlank()) return customerPhone;
        if (customer != null && customer.get("phone") != null) return customer.get("phone").toString();
        return null;
    }

    public void setCustomerPhone(String customerPhone) {
        this.customerPhone = customerPhone;
    }

    public Map<String, Object> getCustomer() {
        return customer;
    }

    public void setCustomer(Map<String, Object> customer) {
        this.customer = customer;
    }

    public String getDeliveryAddress() {
        if (deliveryAddress != null && !deliveryAddress.isBlank()) return deliveryAddress;
        if (address instanceof String) return (String) address;
        if (address instanceof Map) {
            Map<?, ?> map = (Map<?, ?>) address;
            StringBuilder sb = new StringBuilder();
            if (map.get("street") != null) sb.append(map.get("street"));
            if (map.get("ward_name") != null) {
                if (!sb.isEmpty()) sb.append(", ");
                sb.append(map.get("ward_name"));
            }
            if (map.get("province_name") != null) {
                if (!sb.isEmpty()) sb.append(", ");
                sb.append(map.get("province_name"));
            }
            return sb.toString();
        }
        return null;
    }

    public void setDeliveryAddress(String deliveryAddress) {
        this.deliveryAddress = deliveryAddress;
    }

    public Object getAddress() {
        return address;
    }

    public void setAddress(Object address) {
        this.address = address;
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

    public String getPaymentStatus() {
        return paymentStatus;
    }

    public void setPaymentStatus(String paymentStatus) {
        this.paymentStatus = paymentStatus;
    }

    public String getVoucherCode() {
        return voucherCode;
    }

    public void setVoucherCode(String voucherCode) {
        this.voucherCode = voucherCode;
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
