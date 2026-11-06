package com.laptopstore.backend.controller;

import com.laptopstore.backend.entity.Order;
import com.laptopstore.backend.entity.User;
import com.laptopstore.backend.repository.UserRepository;
import com.laptopstore.backend.security.UserDetailsImpl;
import com.laptopstore.backend.service.AuthService;
import com.laptopstore.backend.service.OrderService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@CrossOrigin("*")
@RestController
public class CustomerAccountController {

    private final UserRepository userRepository;
    private final OrderService orderService;
    private final PasswordEncoder passwordEncoder;

    public CustomerAccountController(UserRepository userRepository,
                                     OrderService orderService,
                                     PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.orderService = orderService;
        this.passwordEncoder = passwordEncoder;
    }

    // 1. Lấy thông tin cá nhân hiện tại (/api/me)
    @GetMapping("/api/me")
    public ResponseEntity<?> getMe(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Chưa đăng nhập!"));
        }
        User user = userRepository.findById(userDetails.getId()).orElse(null);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Không tìm thấy tài khoản!"));
        }
        return ResponseEntity.ok(AuthService.formatUser(user));
    }

    // 2. Cập nhật hồ sơ cá nhân (/api/me)
    @PatchMapping("/api/me")
    public ResponseEntity<?> updateMe(@AuthenticationPrincipal UserDetailsImpl userDetails,
                                      @RequestBody Map<String, Object> body) {
        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Chưa đăng nhập!"));
        }
        User user = userRepository.findById(userDetails.getId()).orElse(null);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Không tìm thấy tài khoản!"));
        }

        if (body.containsKey("name") && body.get("name") != null) {
            user.setFullName(body.get("name").toString().trim());
        }
        if (body.containsKey("phone") && body.get("phone") != null) {
            user.setPhone(body.get("phone").toString().trim());
        }
        if (body.containsKey("address") && body.get("address") != null) {
            Object addr = body.get("address");
            if (addr instanceof String) {
                user.setAddress((String) addr);
            } else if (addr instanceof Map) {
                Map<?, ?> m = (Map<?, ?>) addr;
                user.setAddress(m.get("street") != null ? m.get("street").toString() : "");
            }
        }

        User saved = userRepository.save(user);
        return ResponseEntity.ok(AuthService.formatUser(saved));
    }

    // 3. Đổi mật khẩu tài khoản (/api/auth/change-password)
    @PostMapping("/api/auth/change-password")
    public ResponseEntity<?> changePassword(@AuthenticationPrincipal UserDetailsImpl userDetails,
                                            @RequestBody Map<String, String> body) {
        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Chưa đăng nhập!"));
        }
        User user = userRepository.findById(userDetails.getId()).orElse(null);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Không tìm thấy tài khoản!"));
        }

        String currentPassword = body.get("current_password");
        String newPassword = body.get("new_password");

        if (currentPassword == null || !passwordEncoder.matches(currentPassword, user.getPassword())) {
            return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                    .body(Map.of("message", "Mật khẩu hiện tại không chính xác!"));
        }
        if (newPassword == null || newPassword.length() < 6) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Mật khẩu mới phải từ 6 ký tự trở lên!"));
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        return ResponseEntity.noContent().build();
    }

    // 4. Lấy lịch sử đơn hàng của tôi (/api/me/orders)
    @GetMapping("/api/me/orders")
    public ResponseEntity<?> getMyOrders(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Chưa đăng nhập!"));
        }
        List<Order> orders = orderService.getOrdersByUserId(userDetails.getId());
        List<Map<String, Object>> response = orders.stream()
                .map(OrderController::formatOrder)
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    // 5. Cung cấp danh sách Tỉnh/Thành cho dropdown giao hàng (/api/provinces)
    @GetMapping("/api/provinces")
    public List<Map<String, String>> getProvinces() {
        return List.of(
                Map.of("id", "hcm", "name", "TP. Hồ Chí Minh"),
                Map.of("id", "hn", "name", "Hà Nội"),
                Map.of("id", "dn", "name", "Đà Nẵng")
        );
    }

    // 6. Cung cấp danh sách Phường/Xã cho dropdown giao hàng (/api/provinces/{id}/wards)
    @GetMapping("/api/provinces/{id}/wards")
    public List<Map<String, String>> getWards(@PathVariable String id) {
        if ("hcm".equalsIgnoreCase(id)) {
            return List.of(
                    Map.of("id", "hcm-1", "name", "Phường Bến Nghé (Quận 1)"),
                    Map.of("id", "hcm-2", "name", "Phường Võ Thị Sáu (Quận 3)"),
                    Map.of("id", "hcm-3", "name", "Phường Thảo Điền (TP. Thủ Đức)"),
                    Map.of("id", "hcm-4", "name", "Phường Tân Phong (Quận 7)")
            );
        } else if ("hn".equalsIgnoreCase(id)) {
            return List.of(
                    Map.of("id", "hn-1", "name", "Phường Hàng Trống (Quận Hoàn Kiếm)"),
                    Map.of("id", "hn-2", "name", "Phường Tràng Tiền (Quận Hoàn Kiếm)"),
                    Map.of("id", "hn-3", "name", "Phường Cống Vị (Quận Ba Đình)"),
                    Map.of("id", "hn-4", "name", "Phường Ô Chợ Dừa (Quận Đống Đa)")
            );
        } else {
            return List.of(
                    Map.of("id", "dn-1", "name", "Phường Hải Châu 1 (Quận Hải Châu)"),
                    Map.of("id", "dn-2", "name", "Phường Thạch Thang (Quận Hải Châu)"),
                    Map.of("id", "dn-3", "name", "Phường An Hải Bắc (Quận Sơn Trà)"),
                    Map.of("id", "dn-4", "name", "Phường Mỹ An (Quận Ngũ Hành Sơn)")
            );
        }
    }
}

