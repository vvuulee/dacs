package com.laptopstore.backend.controller;

import com.laptopstore.backend.dto.PosOrderRequest;
import com.laptopstore.backend.entity.Order;
import com.laptopstore.backend.entity.Product;
import com.laptopstore.backend.entity.Topping;
import com.laptopstore.backend.entity.User;
import com.laptopstore.backend.entity.Voucher;
import com.laptopstore.backend.repository.OrderRepository;
import com.laptopstore.backend.repository.ProductRepository;
import com.laptopstore.backend.repository.ToppingRepository;
import com.laptopstore.backend.repository.UserRepository;
import com.laptopstore.backend.repository.VoucherRepository;
import com.laptopstore.backend.security.JwtUtils;
import com.laptopstore.backend.security.UserDetailsImpl;
import com.laptopstore.backend.service.OrderService;
import com.laptopstore.backend.service.ProductService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Controller phục vụ toàn bộ phân hệ Nhân viên / Quầy POS (/staff)
 */
@CrossOrigin("*")
@RestController
@RequestMapping("/api/staff")
public class StaffController {

    private final UserRepository userRepository;
    private final OrderRepository orderRepository;
    private final VoucherRepository voucherRepository;
    private final ProductRepository productRepository;
    private final ToppingRepository toppingRepository;
    private final OrderService orderService;
    private final ProductService productService;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;

    public StaffController(UserRepository userRepository,
                           OrderRepository orderRepository,
                           VoucherRepository voucherRepository,
                           ProductRepository productRepository,
                           ToppingRepository toppingRepository,
                           OrderService orderService,
                           ProductService productService,
                           PasswordEncoder passwordEncoder,
                           JwtUtils jwtUtils) {
        this.userRepository = userRepository;
        this.orderRepository = orderRepository;
        this.voucherRepository = voucherRepository;
        this.productRepository = productRepository;
        this.toppingRepository = toppingRepository;
        this.orderService = orderService;
        this.productService = productService;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtils = jwtUtils;
    }

    private Map<String, Object> formatStaff(User u) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", u.getId().toString());
        map.put("name", u.getFullName() != null ? u.getFullName() : u.getUsername());
        map.put("email", u.getEmail() != null ? u.getEmail() : "nhanvien@caphe.test");
        map.put("role", "staff");
        return map;
    }

    private Map<String, Object> formatStaffVoucher(Voucher v) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", v.getId().toString());
        map.put("code", v.getCode());
        map.put("title", v.getTitle());
        map.put("description", v.getDescription() != null ? v.getDescription() : "");
        String type = v.getType() != null ? v.getType().toLowerCase() : "fixed";
        if (!List.of("percent", "fixed", "freeship").contains(type)) type = "fixed";
        map.put("type", type);
        map.put("value", v.getValue() != null ? v.getValue().intValue() : 0);
        map.put("max_discount", v.getMaxDiscount() != null ? v.getMaxDiscount().intValue() : null);
        map.put("min_order", v.getMinOrder() != null ? v.getMinOrder().intValue() : 0);
        map.put("expires_at", v.getExpiresAt() != null ? v.getExpiresAt().toString() : LocalDateTime.now().plusMonths(1).toString());
        map.put("listed", v.getIsActive() != null ? v.getIsActive() : true);
        return map;
    }

    // 1. Đăng nhập nhân viên
    @PostMapping("/login")
    public ResponseEntity<?> staffLogin(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String password = body.get("password");

        if (email == null || password == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Vui lòng nhập email và mật khẩu"));
        }

        // Tìm tài khoản theo email hoặc username
        Optional<User> userOpt = userRepository.findByEmail(email.trim());
        if (userOpt.isEmpty()) {
            userOpt = userRepository.findByUsername(email.trim());
        }

        // Hỗ trợ cả tài khoản demo 'nhanvien@caphe.test' nếu chưa có trong DB
        User staffUser;
        if (userOpt.isEmpty()) {
            if ("nhanvien@caphe.test".equalsIgnoreCase(email.trim()) && "nhanvien123".equals(password)) {
                staffUser = new User();
                staffUser.setId(99L);
                staffUser.setUsername("nhanvien_demo");
                staffUser.setFullName("Nhân viên Mẫu");
                staffUser.setEmail("nhanvien@caphe.test");
                staffUser.setRole("ROLE_STAFF");
            } else {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Email hoặc mật khẩu không đúng"));
            }
        } else {
            staffUser = userOpt.get();
            if (!passwordEncoder.matches(password, staffUser.getPassword()) && !password.equals(staffUser.getPassword())) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Email hoặc mật khẩu không đúng"));
            }
        }

        String token = jwtUtils.generateToken(staffUser.getUsername());
        String expiresAt = LocalDateTime.now().plusHours(24).toString();

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("token", token);
        res.put("expires_at", expiresAt);
        res.put("staff", formatStaff(staffUser));

        return ResponseEntity.ok(res);
    }

    // 2. Đăng xuất
    @PostMapping("/logout")
    public ResponseEntity<?> staffLogout() {
        return ResponseEntity.ok(Map.of("message", "Đã đăng xuất thành công"));
    }

    // 3. Thông tin nhân viên hiện tại
    @GetMapping("/me")
    public ResponseEntity<?> staffGetMe(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (userDetails != null) {
            Optional<User> uOpt = userRepository.findById(userDetails.getId());
            if (uOpt.isPresent()) {
                return ResponseEntity.ok(formatStaff(uOpt.get()));
            }
        }
        // Trả về nhân viên đầu tiên hoặc demo nếu chưa đăng nhập
        List<User> staffList = userRepository.findAll().stream()
                .filter(u -> "ROLE_STAFF".equalsIgnoreCase(u.getRole()) || "ROLE_ADMIN".equalsIgnoreCase(u.getRole()))
                .toList();
        if (!staffList.isEmpty()) {
            return ResponseEntity.ok(formatStaff(staffList.get(0)));
        }
        User demo = new User();
        demo.setId(1L);
        demo.setFullName("Nhân viên Ca Làm");
        demo.setEmail("nhanvien@caphe.test");
        return ResponseEntity.ok(formatStaff(demo));
    }

    // 4. Đổi mật khẩu nhân viên
    @PostMapping("/me/password")
    public ResponseEntity<?> staffChangePassword(@AuthenticationPrincipal UserDetailsImpl userDetails,
                                                 @RequestBody Map<String, String> body) {
        String currentPassword = body.get("current_password");
        String newPassword = body.get("new_password");

        if (userDetails == null) {
            return ResponseEntity.ok(Map.of("message", "Đã cập nhật mật khẩu"));
        }

        User user = userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy nhân viên"));

        if (!passwordEncoder.matches(currentPassword, user.getPassword()) && !currentPassword.equals(user.getPassword())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Mật khẩu hiện tại không chính xác"));
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        return ResponseEntity.ok(Map.of("message", "Đổi mật khẩu thành công"));
    }

    // 5. Bán hàng tại quầy POS (/staff/orders)
    @PostMapping("/orders")
    public ResponseEntity<?> staffCreateOrder(@AuthenticationPrincipal UserDetailsImpl userDetails,
                                              @RequestBody PosOrderRequest request) {
        Long staffId = (userDetails != null) ? userDetails.getId() : 1L;
        Order savedOrder = orderService.createPosOrder(staffId, request);
        return new ResponseEntity<>(OrderController.formatOrder(savedOrder), HttpStatus.CREATED);
    }

    // 6. Danh sách đơn Online dành cho Staff (/staff/orders/online)
    @GetMapping("/orders/online")
    public List<Map<String, Object>> staffGetOnlineOrders(@RequestParam(required = false) String status) {
        return orderService.getAllOrders(status).stream()
                .filter(o -> {
                    String rawType = o.getOrderType() != null ? o.getOrderType().toLowerCase() : "delivery";
                    return !"dine_in".equals(rawType) && !"takeaway".equals(rawType) && !"take_away".equals(rawType);
                })
                .map(OrderController::formatOrder)
                .collect(Collectors.toList());
    }

    // 7. Cập nhật trạng thái đơn (Chờ xác nhận -> Đang pha chế -> Đang giao -> Đã giao)
    @PatchMapping("/orders/{id}/status")
    public ResponseEntity<?> staffUpdateOrderStatus(@PathVariable Long id,
                                                    @RequestBody Map<String, Object> body) {
        String status = (String) body.get("status");
        Order updated = orderService.updateOrderStatus(id, status);
        return ResponseEntity.ok(OrderController.formatOrder(updated));
    }

    // 8. Đơn hàng hôm nay (/staff/orders/today)
    @GetMapping("/orders/today")
    public List<Map<String, Object>> staffGetTodayOrders() {
        LocalDate today = LocalDate.now();
        return orderRepository.findAll().stream()
                .filter(o -> o.getCreateAt() != null && o.getCreateAt().toLocalDate().isEqual(today))
                .sorted(Comparator.comparing(Order::getId).reversed())
                .map(OrderController::formatOrder)
                .collect(Collectors.toList());
    }

    // 9. Báo cáo doanh thu & đơn hàng hôm nay (/staff/reports/today)
    @GetMapping("/reports/today")
    public ResponseEntity<?> staffGetTodayReport() {
        LocalDate today = LocalDate.now();
        List<Order> allOrders = orderRepository.findAll();
        List<Order> todayOrders = allOrders.stream()
                .filter(o -> o.getCreateAt() != null && o.getCreateAt().toLocalDate().isEqual(today))
                .toList();

        int totalRevenue = 0;
        int counterCount = 0;
        int counterRevenue = 0;
        int onlineCount = 0;
        int onlineRevenue = 0;
        int cash = 0;
        int bankTransfer = 0;
        int wallet = 0;
        int cancelled = 0;

        for (Order o : todayOrders) {
            int amount = o.getTotalAmount() != null ? o.getTotalAmount().intValue() : 0;
            if ("cancelled".equalsIgnoreCase(o.getStatus())) {
                cancelled++;
                continue;
            }
            totalRevenue += amount;
            String rawType = o.getOrderType() != null ? o.getOrderType().toLowerCase() : "delivery";
            if ("dine_in".equals(rawType) || "take_away".equals(rawType) || "takeaway".equals(rawType)) {
                counterCount++;
                counterRevenue += amount;
            } else {
                onlineCount++;
                onlineRevenue += amount;
            }

            String method = o.getPaymentMethod() != null ? o.getPaymentMethod().toLowerCase() : "cash";
            if (method.contains("cash")) cash += amount;
            else if (method.contains("bank") || method.contains("transfer") || method.contains("qr")) bankTransfer += amount;
            else wallet += amount;
        }

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("date", today.toString());
        res.put("order_count", todayOrders.size() - cancelled);
        res.put("revenue", totalRevenue);
        res.put("cancelled_count", cancelled);

        Map<String, Object> bySource = new LinkedHashMap<>();
        bySource.put("counter", Map.of("count", counterCount, "revenue", counterRevenue));
        bySource.put("online", Map.of("count", onlineCount, "revenue", onlineRevenue));
        res.put("by_source", bySource);

        Map<String, Object> byPayment = new LinkedHashMap<>();
        byPayment.put("cash", cash);
        byPayment.put("bank_transfer", bankTransfer);
        byPayment.put("wallet", wallet);
        res.put("by_payment", byPayment);

        return ResponseEntity.ok(res);
    }

    // 10. Danh sách Voucher quản lý (/staff/vouchers)
    @GetMapping("/vouchers")
    public List<Map<String, Object>> staffGetVouchers() {
        return voucherRepository.findAll().stream()
                .map(this::formatStaffVoucher)
                .collect(Collectors.toList());
    }

    // 11. Tạo Voucher mới (/staff/vouchers)
    @PostMapping("/vouchers")
    public ResponseEntity<?> staffCreateVoucher(@RequestBody Map<String, Object> body) {
        Voucher v = new Voucher();
        v.setCode(((String) body.get("code")).trim().toUpperCase());
        v.setTitle((String) body.get("title"));
        v.setDescription((String) body.getOrDefault("description", ""));
        v.setType((String) body.getOrDefault("type", "fixed"));

        Number val = (Number) body.getOrDefault("value", 0);
        v.setValue(BigDecimal.valueOf(val.doubleValue()));

        if (body.get("max_discount") != null) {
            Number maxD = (Number) body.get("max_discount");
            v.setMaxDiscount(BigDecimal.valueOf(maxD.doubleValue()));
        }

        Number minO = (Number) body.getOrDefault("min_order", 0);
        v.setMinOrder(BigDecimal.valueOf(minO.doubleValue()));

        if (body.get("expires_at") != null) {
            v.setExpiresAt(LocalDateTime.parse((String) body.get("expires_at")));
        } else {
            v.setExpiresAt(LocalDateTime.now().plusMonths(1));
        }

        v.setIsActive(body.get("listed") == null || Boolean.TRUE.equals(body.get("listed")));
        Voucher saved = voucherRepository.save(v);
        return new ResponseEntity<>(formatStaffVoucher(saved), HttpStatus.CREATED);
    }

    // 12. Xóa Voucher (/staff/vouchers/{id})
    @DeleteMapping("/vouchers/{id}")
    public ResponseEntity<?> staffDeleteVoucher(@PathVariable Long id) {
        voucherRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // 13. Danh sách món cho Staff (/staff/products)
    @GetMapping("/products")
    public List<Map<String, Object>> staffGetProducts() {
        List<Topping> toppings = toppingRepository.findAll();
        return productService.getAllProducts().stream()
                .map(p -> {
                    Map<String, Object> map = new LinkedHashMap<>();
                    map.put("id", p.getId().toString());
                    map.put("name", p.getName());
                    map.put("description", p.getDescription() != null ? p.getDescription() : "");
                    map.put("image", p.getImageUrl() != null ? p.getImageUrl() : "");
                    map.put("category_id", p.getCategory() != null ? p.getCategory().getId().toString() : "1");
                    int basePrice = p.getPrice() != null ? p.getPrice().intValue() : 0;
                    map.put("base_price", basePrice);
                    map.put("is_available", p.getIsAvailable() != null ? p.getIsAvailable() : true);

                    List<Map<String, Object>> sizeList = new ArrayList<>();
                    if (p.getVariants() != null) {
                        for (var v : p.getVariants()) {
                            Map<String, Object> sm = new LinkedHashMap<>();
                            sm.put("id", v.getId().toString());
                            sm.put("label", v.getSize() != null ? v.getSize() : "Size M");
                            sm.put("extra_price", v.getPrice() != null ? v.getPrice().intValue() : 0);
                            sizeList.add(sm);
                        }
                    }
                    map.put("sizes", sizeList);

                    List<Map<String, Object>> topList = new ArrayList<>();
                    for (Topping t : toppings) {
                        Map<String, Object> tm = new LinkedHashMap<>();
                        tm.put("id", t.getId().toString());
                        tm.put("name", t.getName());
                        tm.put("price", t.getPrice() != null ? t.getPrice().intValue() : 0);
                        topList.add(tm);
                    }
                    map.put("toppings", topList);
                    return map;
                })
                .collect(Collectors.toList());
    }

    // 14. Bật/Tắt còn hàng món (/staff/products/{id})
    @PatchMapping("/products/{id}")
    public ResponseEntity<?> staffSetAvailability(@PathVariable Long id,
                                                  @RequestBody Map<String, Object> body) {
        Product p = productRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy món với ID: " + id));

        if (body.containsKey("is_available")) {
            p.setIsAvailable((Boolean) body.get("is_available"));
            productRepository.save(p);
        }

        List<Topping> toppings = toppingRepository.findAll();
        p.setVariants(productService.getProductById(id).getVariants());

        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", p.getId().toString());
        map.put("name", p.getName());
        map.put("description", p.getDescription() != null ? p.getDescription() : "");
        map.put("image", p.getImageUrl() != null ? p.getImageUrl() : "");
        map.put("category_id", p.getCategory() != null ? p.getCategory().getId().toString() : "1");
        int basePrice = p.getPrice() != null ? p.getPrice().intValue() : 0;
        map.put("base_price", basePrice);
        map.put("is_available", p.getIsAvailable() != null ? p.getIsAvailable() : true);
        map.put("sizes", Collections.emptyList());
        map.put("toppings", Collections.emptyList());
        return ResponseEntity.ok(map);
    }
}
