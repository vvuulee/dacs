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
                // 1. Mở cổng CORS cho Frontend (React/Vue/Vite: 3000 & 5173)
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))

                // 2. Tắt CSRF (vì dùng Token Stateless)
                .csrf(AbstractHttpConfigurer::disable)

                // 3. Cài đặt không lưu phiên làm việc (Stateless)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                // 4. Phân quyền đường dẫn
                .authorizeHttpRequests(auth -> auth
                        // Khu vực Công khai: Đăng ký, Đăng nhập, kiểm tra lỗi
                        .requestMatchers("/api/auth/**", "/error").permitAll()

                        // Công khai menu, chi nhánh cửa hàng, voucher ưu đãi, danh mục, kích cỡ và địa chỉ giao hàng
                        .requestMatchers(org.springframework.http.HttpMethod.GET,
                                "/api/products/**",
                                "/api/toppings/**",
                                "/api/categories/**",
                                "/api/stores/**",
                                "/api/offers/**",
                                "/api/provinces/**").permitAll()

                        .requestMatchers("/api/variants/**").permitAll()
                        .requestMatchers("/api/vouchers/validate").permitAll()
                        .requestMatchers("/api/vouchers/customer/**").permitAll()

                        // Cho phép toàn bộ hoạt động POS Bán hàng & Đặt hàng Online
                        .requestMatchers("/api/orders/**").permitAll()

                        // Cho phép hoạt động của phân hệ Nhân viên / Quầy Staff
                        .requestMatchers("/api/staff/**").permitAll()

                        // Cho phép kiểm kê nguyên nhiên liệu cuối ca tại quầy POS
                        .requestMatchers("/api/ingredients/**").permitAll()

                        // Các API còn lại (Trang cá nhân /api/me, Quản trị /api/users, Tạo voucher /api/vouchers...): Yêu cầu Token
                        .anyRequest().authenticated());

        // 5. Bộ lọc JWT
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
        configuration.setAllowedOriginPatterns(List.of("http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:*"));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization", "Cache-Control", "Content-Type"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
