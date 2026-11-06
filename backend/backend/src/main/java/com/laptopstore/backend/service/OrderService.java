package com.laptopstore.backend.service;

import com.laptopstore.backend.dto.PosOrderItemRequest;
import com.laptopstore.backend.dto.PosOrderRequest;
import com.laptopstore.backend.entity.CustomerVoucher;
import com.laptopstore.backend.entity.Order;
import com.laptopstore.backend.entity.OrderDetail;
import com.laptopstore.backend.entity.OrderDetailTopping;
import com.laptopstore.backend.entity.ProductVariant;
import com.laptopstore.backend.entity.Topping;
import com.laptopstore.backend.entity.User;
import com.laptopstore.backend.repository.CustomerVoucherRepository;
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
    private final VoucherService voucherService;
    private final CustomerVoucherRepository customerVoucherRepository;

    public OrderService(OrderRepository orderRepository,
                        OrderDetailRepository orderDetailRepository,
                        ProductVariantRepository productVariantRepository,
                        UserRepository userRepository,
                        ToppingRepository toppingRepository,
                        VoucherService voucherService,
                        CustomerVoucherRepository customerVoucherRepository) {
        this.orderRepository = orderRepository;
        this.orderDetailRepository = orderDetailRepository;
        this.productVariantRepository = productVariantRepository;
        this.userRepository = userRepository;
        this.toppingRepository = toppingRepository;
        this.voucherService = voucherService;
        this.customerVoucherRepository = customerVoucherRepository;
    }

    // 1. Tạo đơn hàng Đa Kênh (Bán tại quầy POS & Đặt Online giao tận nhà)
    @Transactional
    public Order createPosOrder(Long staffUserId, PosOrderRequest request) {
        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new IllegalArgumentException("Hóa đơn phải có ít nhất 1 món đồ uống / bánh ngọt!");
        }

        // Kiểm tra client_request_id để tránh tạo đơn trùng khi bấm đặt 2 lần trên web
        if (request.getClientRequestId() != null && !request.getClientRequestId().isBlank()) {
            Optional<Order> existingOrder = orderRepository.findByClientRequestId(request.getClientRequestId().trim());
            if (existingOrder.isPresent()) {
                return existingOrder.get();
            }
        }

        User staffOrCustomer = null;
        if (staffUserId != null) {
            staffOrCustomer = userRepository.findById(staffUserId).orElse(null);
        }

        Order order = new Order();
        order.setClientRequestId(request.getClientRequestId());
        order.setStaff(staffOrCustomer);
        order.setCustomerName(request.getCustomerName());
        order.setCustomerPhone(request.getCustomerPhone());
        order.setDeliveryAddress(request.getDeliveryAddress());

        String orderType = request.getOrderType() != null && !request.getOrderType().isBlank()
                ? request.getOrderType().toUpperCase()
                : (request.getDeliveryAddress() != null ? "DELIVERY" : "DINE_IN");
        order.setOrderType(orderType);
        order.setTableName(request.getTableName());

        String status = (request.getStatus() != null && !request.getStatus().isBlank())
                ? request.getStatus().trim()
                : ("DELIVERY".equalsIgnoreCase(orderType) ? "placed" : "PAID");
        order.setStatus(status);

        String paymentMethod = (request.getPaymentMethod() != null && !request.getPaymentMethod().isBlank())
                ? request.getPaymentMethod().trim()
                : "cash";
        order.setPaymentMethod(paymentMethod);

        String paymentStatus = (request.getPaymentStatus() != null && !request.getPaymentStatus().isBlank())
                ? request.getPaymentStatus().trim()
                : ("PAID".equalsIgnoreCase(status) ? "paid" : "unpaid");
        order.setPaymentStatus(paymentStatus);

        order.setNote(request.getNote());

        BigDecimal subtotal = BigDecimal.ZERO;
        List<OrderDetail> detailList = new ArrayList<>();

        for (PosOrderItemRequest itemReq : request.getItems()) {
            if (itemReq.getVariantId() == null) {
                throw new IllegalArgumentException("Món không hợp lệ (thiếu mã biến thể)!");
            }
            int qty = (itemReq.getQuantity() != null && itemReq.getQuantity() > 0) ? itemReq.getQuantity() : 1;

            ProductVariant variant = productVariantRepository.findById(itemReq.getVariantId())
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy món với mã biến thể: " + itemReq.getVariantId()));

            // Kiểm tra tồn kho nếu là Bánh ngọt
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

            subtotal = subtotal.add(itemTotal);
            detailList.add(detail);
        }

        // Phí giao hàng (nếu là giao hàng online thì tính 15.000đ)
        BigDecimal deliveryFee = "DELIVERY".equalsIgnoreCase(orderType) ? BigDecimal.valueOf(15000) : BigDecimal.ZERO;

        // Xử lý Voucher giảm giá
        BigDecimal discount = BigDecimal.ZERO;
        String voucherCode = request.getVoucherCode();
        if (voucherCode != null && !voucherCode.isBlank()) {
            Map<String, Object> vResult = voucherService.validateVoucher(voucherCode, subtotal, request.getCustomerPhone());
            if (Boolean.TRUE.equals(vResult.get("valid"))) {
                Integer discInt = (Integer) vResult.get("discount");
                discount = BigDecimal.valueOf(discInt != null ? discInt : 0);
                voucherService.markCustomerVoucherUsed(voucherCode, request.getCustomerPhone());
                order.setVoucherCode(voucherCode.trim().toUpperCase());
            }
        }

        BigDecimal totalAmount = subtotal.add(deliveryFee).subtract(discount);
        if (totalAmount.compareTo(BigDecimal.ZERO) < 0) {
            totalAmount = BigDecimal.ZERO;
        }

        order.setSubtotal(subtotal);
        order.setDeliveryFee(deliveryFee);
        order.setDiscount(discount);
        order.setTotalAmount(totalAmount);
        order.setOrderDetails(detailList);

        Order savedOrder = orderRepository.save(order);

        // Nếu đơn đã thanh toán hoặc đã giao -> Tự động tích lũy điểm theo SĐT
        if ("PAID".equalsIgnoreCase(status) || "delivered".equalsIgnoreCase(status)) {
            processLoyaltyPoints(order.getCustomerPhone());
        }

        return savedOrder;
    }

    // 2. Lấy danh sách hóa đơn
    public List<Order> getAllOrders(String status) {
        if (status != null && !status.isBlank()) {
            return orderRepository.findByStatusOrderByIdDesc(status.trim());
        }
        return orderRepository.findAllByOrderByIdDesc();
    }

    // 3. Lấy chi tiết 1 hóa đơn (Có hỗ trợ bảo mật SĐT cho tra cứu trên web)
    public Optional<Order> getOrderById(Long id, String phone) {
        if (phone != null && !phone.isBlank()) {
            return orderRepository.findByIdAndCustomerPhone(id, phone.trim());
        }
        return orderRepository.findWithDetailsById(id);
    }

    // 4. Lấy lịch sử đơn hàng của tài khoản khách
    public List<Order> getOrdersByUserId(Long userId) {
        return orderRepository.findByStaffIdOrderByIdDesc(userId);
    }

    // 5. Khách gọi thêm món vào bàn đang ngồi
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

        order.setSubtotal(order.getSubtotal().add(addedAmount));
        order.setTotalAmount(order.getTotalAmount().add(addedAmount));
        return orderRepository.save(order);
    }

    // 6. Thanh toán chốt hóa đơn cho bàn
    @Transactional
    public Order payOrder(Long id, String paymentMethod) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy hóa đơn với mã: " + id));

        if ("PAID".equalsIgnoreCase(order.getStatus())) {
            throw new IllegalStateException("Hóa đơn này đã được thanh toán trước đó rồi!");
        }

        order.setStatus("PAID");
        order.setPaymentStatus("paid");
        if (paymentMethod != null && !paymentMethod.isBlank()) {
            order.setPaymentMethod(paymentMethod.trim());
        }

        Order saved = orderRepository.save(order);
        processLoyaltyPoints(saved.getCustomerPhone());
        return saved;
    }

    // 7. Cập nhật trạng thái đơn hàng (Dành cho Online Order: placed -> preparing -> delivering -> delivered)
    @Transactional
    public Order updateOrderStatus(Long id, String newStatus) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy hóa đơn với mã: " + id));

        order.setStatus(newStatus.trim());
        if ("delivered".equalsIgnoreCase(newStatus)) {
            order.setPaymentStatus("paid");
        }

        Order saved = orderRepository.save(order);

        if ("delivered".equalsIgnoreCase(newStatus) || "PAID".equalsIgnoreCase(newStatus)) {
            processLoyaltyPoints(saved.getCustomerPhone());
        }

        return saved;
    }

    // 8. Cơ chế tích điểm hợp nhất qua Số Điện Thoại (Bất kể mua On hay Off, cứ đủ 50 đơn tặng 1 Voucher)
    @Transactional
    public void processLoyaltyPoints(String customerPhone) {
        if (customerPhone == null || customerPhone.isBlank()) return;
        String phone = customerPhone.trim();

        // Tìm tài khoản theo SĐT, nếu chưa có thì tự động tạo tài khoản thành viên cho SĐT này
        User user = userRepository.findByPhone(phone).orElseGet(() -> {
            User newUser = new User();
            newUser.setUsername("kh_" + phone);
            newUser.setPassword("$2a$10$BM/pG5g9tDuWvREVkVzz5ujM3dH21xW20is6GNyDd0uelQ5Cq.Lna"); // pass: 123456
            newUser.setEmail(phone + "@customer.internal");
            newUser.setFullName("Khách hàng " + phone);
            newUser.setPhone(phone);
            newUser.setRole("ROLE_CUSTOMER");
            newUser.setOrderCount(0);
            return userRepository.save(newUser);
        });

        int newOrderCount = user.getOrderCount() + 1;

        // Nếu chạm mốc 50 đơn -> Tặng ngay 1 Voucher tri ân trị giá 50.000đ
        if (newOrderCount >= 50) {
            newOrderCount -= 50;
            String voucherCode = "VIP50_" + phone.substring(Math.max(0, phone.length() - 4)) + "_" + (System.currentTimeMillis() % 10000);
            CustomerVoucher reward = new CustomerVoucher(
                    phone,
                    voucherCode,
                    "Tri ân 50 đơn hàng - Giảm 50.000 ₫",
                    BigDecimal.valueOf(50000),
                    LocalDateTime.now().plusDays(30)
            );
            customerVoucherRepository.save(reward);
        }

        user.setOrderCount(newOrderCount);
        userRepository.save(user);
    }

    // 9. Báo cáo nhanh bán hàng trong ngày hôm nay
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

            if ("PAID".equalsIgnoreCase(order.getStatus()) || "delivered".equalsIgnoreCase(order.getStatus()) || "paid".equalsIgnoreCase(order.getPaymentStatus())) {
                paidOrdersCount++;
                totalRevenue = totalRevenue.add(amount);

                if ("bank_transfer".equalsIgnoreCase(order.getPaymentMethod()) || "TRANSFER".equalsIgnoreCase(order.getPaymentMethod())) {
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
