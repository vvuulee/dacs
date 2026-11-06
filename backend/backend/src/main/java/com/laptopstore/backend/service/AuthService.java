package com.laptopstore.backend.service;

import com.laptopstore.backend.dto.LoginRequest;
import com.laptopstore.backend.dto.SignupRequest;
import com.laptopstore.backend.entity.User;
import com.laptopstore.backend.repository.UserRepository;
import com.laptopstore.backend.security.JwtUtils;
import com.laptopstore.backend.security.UserDetailsImpl;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtUtils jwtUtils;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthService(AuthenticationManager authenticationManager,
                       JwtUtils jwtUtils,
                       UserRepository userRepository,
                       PasswordEncoder passwordEncoder) {
        this.authenticationManager = authenticationManager;
        this.jwtUtils = jwtUtils;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public static Map<String, Object> formatUser(User u) {
        if (u == null) return null;
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", u.getId().toString());
        map.put("name", u.getFullName() != null ? u.getFullName() : u.getUsername());
        map.put("fullName", u.getFullName());
        map.put("username", u.getUsername());
        map.put("email", u.getEmail());
        map.put("phone", u.getPhone() != null ? u.getPhone() : "");
        map.put("address", u.getAddress());
        map.put("role", u.getRole());
        map.put("order_count", u.getOrderCount());
        map.put("orderCount", u.getOrderCount());
        return map;
    }

    @Transactional
    public Map<String, Object> registerCustomer(SignupRequest request) {
        if (request.getEmail() == null || request.getEmail().isBlank()) {
            throw new IllegalArgumentException("Email không được để trống!");
        }
        if (request.getPassword() == null || request.getPassword().length() < 6) {
            throw new IllegalArgumentException("Mật khẩu phải từ 6 ký tự trở lên!");
        }

        String email = request.getEmail().trim().toLowerCase();
        if (userRepository.existsByEmail(email)) {
            throw new IllegalStateException("Email này đã được sử dụng!");
        }

        String username = request.getUsername();
        if (username == null || username.isBlank() || userRepository.existsByUsername(username)) {
            username = email.split("@")[0] + "_" + (System.currentTimeMillis() % 1000);
        }

        User user;
        // Kiểm tra nếu SĐT này đã từng mua hàng tại quán POS trước đây
        if (request.getPhone() != null && !request.getPhone().isBlank() && userRepository.existsByPhone(request.getPhone().trim())) {
            user = userRepository.findByPhone(request.getPhone().trim()).get();
            user.setEmail(email);
            user.setUsername(username);
            user.setPassword(passwordEncoder.encode(request.getPassword()));
            if (request.getName() != null) user.setFullName(request.getName());
        } else {
            user = new User();
            user.setUsername(username);
            user.setEmail(email);
            user.setPassword(passwordEncoder.encode(request.getPassword()));
            user.setFullName(request.getName() != null ? request.getName() : username);
            user.setPhone(request.getPhone() != null ? request.getPhone().trim() : null);
            user.setRole("ROLE_CUSTOMER");
            user.setOrderCount(0);
        }

        User saved = userRepository.save(user);

        // Sinh token đăng nhập tự động
        String jwt = jwtUtils.generateToken(saved.getUsername());
        String expiresAt = Instant.now().plus(7, ChronoUnit.DAYS).toString();

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("token", jwt);
        res.put("expires_at", expiresAt);
        res.put("user", formatUser(saved));
        res.put("role", saved.getRole());
        return res;
    }

    public Map<String, Object> authenticateUser(LoginRequest loginRequest) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(loginRequest.getUsername(), loginRequest.getPassword())
        );
        SecurityContextHolder.getContext().setAuthentication(authentication);
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        String jwt = jwtUtils.generateToken(userDetails.getUsername());

        User user = userRepository.findByUsernameOrEmail(userDetails.getUsername(), userDetails.getUsername()).orElse(null);
        String role = userDetails.getAuthorities().iterator().next().getAuthority();
        String expiresAt = Instant.now().plus(7, ChronoUnit.DAYS).toString();

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("token", jwt);
        res.put("expires_at", expiresAt);
        res.put("role", role);
        res.put("id", userDetails.getId());
        res.put("username", userDetails.getUsername());
        res.put("user", formatUser(user));
        return res;
    }
}
