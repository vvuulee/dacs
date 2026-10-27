package com.laptopstore.backend.controller;

import com.laptopstore.backend.dto.JwtResponse;
import com.laptopstore.backend.dto.LoginRequest;
import com.laptopstore.backend.dto.SignupRequest;
import com.laptopstore.backend.repository.UserRepository;
import com.laptopstore.backend.security.JwtUtils;
import com.laptopstore.backend.security.UserDetailsImpl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@CrossOrigin("*")
@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtUtils jwtUtils;

    public AuthController(UserRepository userRepository, PasswordEncoder passwordEncoder,
                          AuthenticationManager authenticationManager, JwtUtils jwtUtils) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtUtils = jwtUtils;
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
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(loginRequest.getUsername(), loginRequest.getPassword())
            );
            SecurityContextHolder.getContext().setAuthentication(authentication);
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            String jwt = jwtUtils.generateToken(userDetails.getUsername());
            String role = userDetails.getAuthorities().iterator().next().getAuthority();
            return ResponseEntity.ok(new JwtResponse(jwt, userDetails.getId(), userDetails.getUsername(), role));
        } catch (org.springframework.security.authentication.BadCredentialsException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Sai tên đăng nhập hoặc mật khẩu!");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Đăng nhập thất bại: " + e.getMessage());
        }
    }
}
