package com.laptopstore.backend.service;

import com.laptopstore.backend.dto.PosOrderItemRequest;
import com.laptopstore.backend.dto.PosOrderRequest;
import com.laptopstore.backend.entity.Order;
import com.laptopstore.backend.entity.OrderDetail;
import com.laptopstore.backend.entity.OrderDetailTopping;
import com.laptopstore.backend.entity.ProductVariant;
import com.laptopstore.backend.entity.Topping;
import com.laptopstore.backend.entity.User;
import com.laptopstore.backend.repository.OrderDetailRepository;
import com.laptopstore.backend.repository.OrderRepository;
import com.laptopstore.backend.repository.ProductVariantRepository;
import com.laptopstore.backend.repository.ToppingRepository;
import com.laptopstore.backend.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;

@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final OrderDetailRepository orderDetailRepository;
    private final ProductVariantRepository productVariantRepository;
    private final UserRepository userRepository;
    private final ToppingRepository toppingRepository;

    public OrderService(OrderRepository orderRepository,
                        OrderDetailRepository orderDetailRepository,
                        ProductVariantRepository productVariantRepository,
                        UserRepository userRepository,
                        ToppingRepository toppingRepository) {
        this.orderRepository = orderRepository;
        this.orderDetailRepository = orderDetailRepository;
        this.productVariantRepository = productVariantRepository;
        this.userRepository = userRepository;
        this.toppingRepository = toppingRepository;
    }

    // 1. Tạo hóa đơn bán hàng tại quầy (POS Order)
    @Transactional
    public Order createPosOrder(Long staffUserId, PosOrderRequest request) {
        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new IllegalArgumentException("Hóa đơn phải có ít nhất 1 món đồ uống / bánh ngọt!");
        }

        User staff = null;
        if (staffUserId != null) {
            staff = userRepository.findById(staffUserId).orElse(null);
        }

        Order order = new Order();
        order.setStaff(staff);
        order.setOrderType(request.getOrderType() != null && !request.getOrderType().isBlank() ? request.getOrderType() : "DINE_IN");
        order.setTableName(request.getTableName());

        String status = (request.getStatus() != null && !request.getStatus().isBlank())
                ? request.getStatus().trim().toUpperCase()
                : "PAID";
        order.setStatus(status);

        order.setPaymentMethod(request.getPaymentMethod() != null && !request.getPaymentMethod().isBlank() ? request.getPaymentMethod() : "CASH");
        order.setNote(request.getNote());

        BigDecimal totalAmount = BigDecimal.ZERO;
        List<OrderDetail> detailList = new ArrayList<>();

        for (PosOrderItemRequest itemReq : request.getItems()) {
            if (itemReq.getVariantId() == null) {
                throw new IllegalArgumentException("Món không hợp lệ (thiếu mã biến thể)!");
            }
            int qty = (itemReq.getQuantity() != null && itemReq.getQuantity() > 0) ? itemReq.getQuantity() : 1;

            ProductVariant variant = productVariantRepository.findById(itemReq.getVariantId())
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy món với mã biến thể: " + itemReq.getVariantId()));

            // Trừ tồn kho nếu có quản lý (chỉ dành cho bánh ngọt / món có quản lý stockQuantity)
            if (variant.getStockQuantity() != null) {
                if (variant.getStockQuantity() < qty) {
                    String itemName = (variant.getProduct() != null) ? variant.getProduct().getName() : "Món";
                    throw new IllegalStateException("Món '" + itemName + "' (" + variant.getSize() + ") chỉ còn "
                            + variant.getStockQuantity() + " phần trong tủ, không đủ để phục vụ số lượng " + qty + "!");
                }
                variant.setStockQuantity(variant.getStockQuantity() - qty);
                productVariantRepository.save(variant);
            }

            BigDecimal unitPrice = variant.getPrice() != null ? variant.getPrice() : BigDecimal.ZERO;
            BigDecimal itemTotal = unitPrice.multiply(BigDecimal.valueOf(qty));

            OrderDetail detail = new OrderDetail();
            detail.setOrder(order);
            detail.setProductVariant(variant);
            detail.setProductName(variant.getProduct() != null ? variant.getProduct().getName() : "Đồ uống");
            detail.setSize(variant.getSize() != null ? variant.getSize() : "Size M");
            detail.setQuantity(qty);
            detail.setPrice(unitPrice);
            detail.setNote(itemReq.getNote());

            // Xử lý các topping đi kèm
            if (itemReq.getToppingIds() != null && !itemReq.getToppingIds().isEmpty()) {
                for (Long toppingId : itemReq.getToppingIds()) {
                    if (toppingId != null) {
                        Optional<Topping> toppingOpt = toppingRepository.findById(toppingId);
                        if (toppingOpt.isPresent()) {
                            Topping t = toppingOpt.get();
                            BigDecimal toppingPrice = BigDecimal.valueOf(t.getPrice() != null ? t.getPrice() : 0.0);

                            OrderDetailTopping detailTopping = new OrderDetailTopping(
                                    detail,
                                    t,
                                    t.getName(),
                                    toppingPrice,
                                    1
                            );
                            detail.getToppings().add(detailTopping);
                            itemTotal = itemTotal.add(toppingPrice.multiply(BigDecimal.valueOf(qty)));
                        }
                    }
                }
            }

            totalAmount = totalAmount.add(itemTotal);
            detailList.add(detail);
        }

        order.setTotalAmount(totalAmount);
        order.setOrderDetails(detailList);

        return orderRepository.save(order);
    }

    // 2. Lấy danh sách hóa đơn
    public List<Order> getAllOrders(String status) {
        if (status != null && !status.isBlank()) {
            return orderRepository.findByStatusOrderByIdDesc(status.trim().toUpperCase());
        }
        return orderRepository.findAllByOrderByIdDesc();
    }

    // 3. Lấy chi tiết 1 hóa đơn
    public Optional<Order> getOrderById(Long id) {
        return orderRepository.findWithDetailsById(id);
    }

    // 4. Khách gọi thêm món vào bàn đang ngồi
    @Transactional
    public Order addItemsToOrder(Long id, List<PosOrderItemRequest> newItems) {
        if (newItems == null || newItems.isEmpty()) {
            throw new IllegalArgumentException("Danh sách món gọi thêm không được để trống!");
        }

        Order order = orderRepository.findWithDetailsById(id)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy bàn/hóa đơn với mã: " + id));

        BigDecimal addedAmount = BigDecimal.ZERO;

        for (PosOrderItemRequest itemReq : newItems) {
            if (itemReq.getVariantId() == null) continue;
            int qty = (itemReq.getQuantity() != null && itemReq.getQuantity() > 0) ? itemReq.getQuantity() : 1;

            ProductVariant variant = productVariantRepository.findById(itemReq.getVariantId())
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy món với mã biến thể: " + itemReq.getVariantId()));

            if (variant.getStockQuantity() != null) {
                if (variant.getStockQuantity() < qty) {
                    String itemName = (variant.getProduct() != null) ? variant.getProduct().getName() : "Món";
                    throw new IllegalStateException("Món '" + itemName + "' (" + variant.getSize() + ") chỉ còn "
                            + variant.getStockQuantity() + " phần trong tủ, không đủ để phục vụ số lượng " + qty + "!");
                }
                variant.setStockQuantity(variant.getStockQuantity() - qty);
                productVariantRepository.save(variant);
            }

            BigDecimal unitPrice = variant.getPrice() != null ? variant.getPrice() : BigDecimal.ZERO;
            BigDecimal itemTotal = unitPrice.multiply(BigDecimal.valueOf(qty));

            OrderDetail detail = new OrderDetail();
            detail.setOrder(order);
            detail.setProductVariant(variant);
            detail.setProductName(variant.getProduct() != null ? variant.getProduct().getName() : "Đồ uống");
            detail.setSize(variant.getSize() != null ? variant.getSize() : "Size M");
            detail.setQuantity(qty);
            detail.setPrice(unitPrice);
            detail.setNote(itemReq.getNote());

            if (itemReq.getToppingIds() != null && !itemReq.getToppingIds().isEmpty()) {
                for (Long toppingId : itemReq.getToppingIds()) {
                    if (toppingId != null) {
                        Optional<Topping> toppingOpt = toppingRepository.findById(toppingId);
                        if (toppingOpt.isPresent()) {
                            Topping t = toppingOpt.get();
                            BigDecimal toppingPrice = BigDecimal.valueOf(t.getPrice() != null ? t.getPrice() : 0.0);

                            OrderDetailTopping detailTopping = new OrderDetailTopping(
                                    detail,
                                    t,
                                    t.getName(),
                                    toppingPrice,
                                    1
                            );
                            detail.getToppings().add(detailTopping);
                            itemTotal = itemTotal.add(toppingPrice.multiply(BigDecimal.valueOf(qty)));
                        }
                    }
                }
            }

            addedAmount = addedAmount.add(itemTotal);
            order.getOrderDetails().add(detail);
        }

        order.setTotalAmount(order.getTotalAmount().add(addedAmount));
        return orderRepository.save(order);
    }

    // 5. Thanh toán chốt hóa đơn cho bàn
    @Transactional
    public Order payOrder(Long id, String paymentMethod) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy hóa đơn với mã: " + id));

        if ("PAID".equalsIgnoreCase(order.getStatus())) {
            throw new IllegalStateException("Hóa đơn này đã được thanh toán trước đó rồi!");
        }

        order.setStatus("PAID");
        if (paymentMethod != null && !paymentMethod.isBlank()) {
            order.setPaymentMethod(paymentMethod.trim().toUpperCase());
        }

        return orderRepository.save(order);
    }

    // 6. Báo cáo nhanh bán hàng trong ngày hôm nay
    public Map<String, Object> getTodayReport() {
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        LocalDateTime endOfDay = LocalDate.now().atTime(LocalTime.MAX);

        List<Order> todayOrders = orderRepository.findByCreateAtBetweenOrderByIdDesc(startOfDay, endOfDay);

        BigDecimal totalRevenue = BigDecimal.ZERO;
        BigDecimal unpaidAmount = BigDecimal.ZERO;
        BigDecimal cashRevenue = BigDecimal.ZERO;
        BigDecimal transferRevenue = BigDecimal.ZERO;

        int paidOrdersCount = 0;
        int unpaidOrdersCount = 0;
        int totalItemsSold = 0;

        for (Order order : todayOrders) {
            BigDecimal amount = order.getTotalAmount() != null ? order.getTotalAmount() : BigDecimal.ZERO;

            if ("PAID".equalsIgnoreCase(order.getStatus())) {
                paidOrdersCount++;
                totalRevenue = totalRevenue.add(amount);

                if ("TRANSFER".equalsIgnoreCase(order.getPaymentMethod())) {
                    transferRevenue = transferRevenue.add(amount);
                } else {
                    cashRevenue = cashRevenue.add(amount);
                }

                if (order.getOrderDetails() != null) {
                    for (OrderDetail d : order.getOrderDetails()) {
                        totalItemsSold += (d.getQuantity() != null ? d.getQuantity() : 0);
                    }
                }
            } else {
                unpaidOrdersCount++;
                unpaidAmount = unpaidAmount.add(amount);
            }
        }

        Map<String, Object> report = new LinkedHashMap<>();
        report.put("todayDate", LocalDate.now().toString());
        report.put("totalOrdersCount", todayOrders.size());
        report.put("paidOrdersCount", paidOrdersCount);
        report.put("unpaidOrdersCount", unpaidOrdersCount);
        report.put("totalRevenue", totalRevenue);
        report.put("unpaidAmount", unpaidAmount);
        report.put("cashRevenue", cashRevenue);
        report.put("transferRevenue", transferRevenue);
        report.put("totalItemsSold", totalItemsSold);

        return report;
    }
}

