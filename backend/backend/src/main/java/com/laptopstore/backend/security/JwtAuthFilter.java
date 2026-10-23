package com.laptopstore.backend.security;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class JwtAuthFilter extends OncePerRequestFilter{
    private final JwtUtils jwtUtils;
    private final   UserDetailsServiceImpl userDetailsService;

    public JwtAuthFilter(JwtUtils jwtUtils, UserDetailsServiceImpl userDetailsService) {
        this.jwtUtils = jwtUtils;
        this.userDetailsService = userDetailsService;
    }
    // Hàm phụ: Bóc tách chuỗi Token từ Header của Request
    private String parseJwt(HttpServletRequest request) {
        String headerAuth = request.getHeader("Authorization");

        // Token tiêu chuẩn luôn bắt đầu bằng chữ "Bearer "
        if (StringUtils.hasText(headerAuth) && headerAuth.startsWith("Bearer ")) {
            return headerAuth.substring(7); // Cắt bỏ 7 ký tự "Bearer " để lấy đúng chuỗi mã thật
        }
        return null;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        try {
            // 1. Lấy Token từ khách hàng gửi lên
            String jwt = parseJwt(request);

            // 2. Nếu có thẻ Token và thẻ này hợp lệ (không bị làm giả, chưa hết hạn)
            if (jwt != null && jwtUtils.validateJwtToken(jwt)) {

                // 3. Đọc tên tài khoản từ thẻ
                String username = jwtUtils.getUserNameFromJwtToken(jwt);

                // 4. Tìm hồ sơ khách hàng dưới Database
                UserDetails userDetails = userDetailsService.loadUserByUsername(username);

                // 5. Cấp giấy thông hành (Authentication) và báo cho Spring Security biết khách này đã hợp lệ
                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(
                                userDetails,
                                null,
                                userDetails.getAuthorities());
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        } catch (Exception e) {
            System.out.println("Không thể xác thực người dùng: " + e.getMessage());
        }

        // 6. Cho phép đi tiếp vào Controller (API)
        filterChain.doFilter(request, response);
    }

    // Hàm phụ: Bóc tách chuỗi Token từ Header của Request

}

