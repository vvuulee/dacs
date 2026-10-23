package com.laptopstore.backend.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {
    private final JwtAuthFilter jwtAuthFilter;

    public SecurityConfig(JwtAuthFilter jwtAuthFilter) {
        this.jwtAuthFilter = jwtAuthFilter;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                // 1. Mở cổng CORS cho Frontend (React/Vue)
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))

                // 2. Tắt CSRF (vì dùng Token nên không cần bảo vệ CSRF kiểu cũ)
                .csrf(AbstractHttpConfigurer::disable)

                // 3. Cài đặt không lưu phiên làm việc (Stateless) - Server sẽ không nhớ ai cả,
                // chỉ nhìn Token
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                // 4. Phân quyền đường dẫn (Thiết quân luật)
                .authorizeHttpRequests(auth -> auth
                        // Khu vực Lễ tân: Ai cũng có thể vào Đăng ký, Đăng nhập, và trang báo lỗi hệ thống
                        .requestMatchers("/api/auth/**", "/error").permitAll()

                        // Cho phép khách vãng lai xem danh sách sản phẩm, biến thể và chat với AI tư vấn mà không cần đăng nhập
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/products/**", "/api/variants/**", "/api/chat/**").permitAll()
                        .requestMatchers("/api/chat/**").permitAll()

                        // Khu vực còn lại (Giỏ hàng, Thanh toán...): Bắt buộc phải có thẻ Token hợp lệ
                        .anyRequest().authenticated());

        // 5. Đặt ông bảo vệ (JwtAuthFilter) đứng ngay trước cửa kiểm tra mật khẩu mặc
        // định của Spring
        http.addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManagr(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(List.of("http://localhost:3000"));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization", "Cache-Control", "Content-Type"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration); // Áp dụng cấu hình này cho mọi API
        return source;
    }
}
