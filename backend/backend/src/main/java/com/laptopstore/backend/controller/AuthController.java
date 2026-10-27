package com.laptopstore.backend.controller;

import com.laptopstore.backend.dto.JwtResponse;
import com.laptopstore.backend.dto.LoginRequest;
import com.laptopstore.backend.dto.SignupRequest;
import com.laptopstore.backend.service.AuthService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.annotation.*;

@CrossOrigin("*")
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    /**
     * Chặn đăng ký tài khoản tự do trên web
     * Vì ứng dụng đã chuyển thành phần mềm POS quản lý quán Cà phê nội bộ,
     * chỉ dành riêng cho Admin (Chủ quán) và Staff (Nhân viên).
     */
    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@RequestBody SignupRequest signUpRequest) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body("Hệ thống chỉ dành cho nội bộ nhân viên và quản lý quán cà phê. Vui lòng liên hệ Quản trị viên để được cấp tài khoản!");
    }

    /**
     * Đăng nhập hệ thống POS dành cho Quản lý & Nhân viên
     */
    @PostMapping("/login")
    public ResponseEntity<?> authenticateUser(@RequestBody LoginRequest loginRequest) {
        try {
            JwtResponse response = authService.authenticateUser(loginRequest);
            return ResponseEntity.ok(response);
        } catch (BadCredentialsException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Sai tên đăng nhập hoặc mật khẩu!");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Đăng nhập thất bại: " + e.getMessage());
        }
    }
}
