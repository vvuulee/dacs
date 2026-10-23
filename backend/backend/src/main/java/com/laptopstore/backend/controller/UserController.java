package com.laptopstore.backend.controller;

import com.laptopstore.backend.dto.AdminRoleRequest;
import com.laptopstore.backend.dto.UpdateProfileRequest;
import com.laptopstore.backend.dto.UserProfileResponse;
import com.laptopstore.backend.entity.User;
import com.laptopstore.backend.repository.UserRepository;
import com.laptopstore.backend.security.UserDetailsImpl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserController(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    private boolean isAdmin(UserDetailsImpl userDetails) {
        if (userDetails == null) return false;
        return userDetails.getAuthorities().stream().anyMatch(a ->
                "ROLE_ADMIN".equals(a.getAuthority()) || "ADMIN".equals(a.getAuthority())
        );
    }

    // 1. Lấy thông tin cá nhân của người dùng đang đăng nhập
    @GetMapping("/profile")
    public ResponseEntity<?> getProfile(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Chưa xác thực người dùng!");
        }

        User user = userRepository.findById(userDetails.getId()).orElse(null);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Không tìm thấy thông tin tài khoản!");
        }

        UserProfileResponse response = new UserProfileResponse(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getFullName(),
                user.getPhone(),
                user.getAddress(),
                user.getRole(),
                user.getCreateAt()
        );

        return ResponseEntity.ok(response);
    }

    // 2. Cập nhật thông tin cá nhân và mật khẩu
    @PutMapping("/profile")
    @Transactional
    public ResponseEntity<?> updateProfile(@AuthenticationPrincipal UserDetailsImpl userDetails,
                                           @RequestBody UpdateProfileRequest request) {
        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Chưa xác thực người dùng!");
        }

        User user = userRepository.findById(userDetails.getId()).orElse(null);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Không tìm thấy thông tin tài khoản!");
        }

        // 1. Kiểm tra và cập nhật Email
        if (request.getEmail() != null && !request.getEmail().trim().isEmpty()) {
            String newEmail = request.getEmail().trim();
            if (!newEmail.equalsIgnoreCase(user.getEmail())) {
                Optional<User> existingEmailUser = userRepository.findByEmail(newEmail);
                if (existingEmailUser.isPresent() && !existingEmailUser.get().getId().equals(user.getId())) {
                    return ResponseEntity.badRequest().body("Email này đã được sử dụng bởi một tài khoản khác!");
                }
                user.setEmail(newEmail);
            }
        }

        // 2. Cập nhật thông tin cơ bản: Tên, Số điện thoại, Địa chỉ
        if (request.getFullName() != null) {
            user.setFullName(request.getFullName().trim());
        }
        if (request.getPhone() != null) {
            user.setPhone(request.getPhone().trim());
        }
        if (request.getAddress() != null) {
            user.setAddress(request.getAddress().trim());
        }

        // 3. Xử lý đổi mật khẩu (nếu người dùng có nhập mật khẩu mới)
        if (request.getNewPassword() != null && !request.getNewPassword().trim().isEmpty()) {
            String newPass = request.getNewPassword().trim();
            if (newPass.length() < 6) {
                return ResponseEntity.badRequest().body("Mật khẩu mới phải có ít nhất 6 ký tự!");
            }

            if (request.getCurrentPassword() == null || request.getCurrentPassword().trim().isEmpty()) {
                return ResponseEntity.badRequest().body("Vui lòng nhập mật khẩu hiện tại để xác nhận đổi mật khẩu!");
            }

            if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
                return ResponseEntity.badRequest().body("Mật khẩu hiện tại không chính xác!");
            }

            user.setPassword(passwordEncoder.encode(newPass));
        }

        userRepository.save(user);

        UserProfileResponse response = new UserProfileResponse(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getFullName(),
                user.getPhone(),
                user.getAddress(),
                user.getRole(),
                user.getCreateAt()
        );

        return ResponseEntity.ok(response);
    }

    // 3. Lấy danh sách Quản trị viên (Chỉ Admin)
    @GetMapping("/admins")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<?> getAdminUsers(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (!isAdmin(userDetails)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Từ chối truy cập: Chỉ Quản trị viên mới có quyền xem danh sách này!");
        }

        List<User> admins = userRepository.findByRoleInOrderByIdDesc(List.of("ROLE_ADMIN", "ADMIN"));
        List<UserProfileResponse> responses = admins.stream()
                .map(u -> new UserProfileResponse(
                        u.getId(),
                        u.getUsername(),
                        u.getEmail(),
                        u.getFullName(),
                        u.getPhone(),
                        u.getAddress(),
                        u.getRole(),
                        u.getCreateAt()
                ))
                .collect(Collectors.toList());

        return ResponseEntity.ok(responses);
    }

    // 4. Trao quyền Quản trị viên cho người dùng bằng Email và Tên
    @PostMapping("/grant-admin")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('ROLE_ADMIN')")
    @Transactional
    public ResponseEntity<?> grantAdminRole(@AuthenticationPrincipal UserDetailsImpl userDetails,
                                           @RequestBody AdminRoleRequest request) {
        if (!isAdmin(userDetails)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Từ chối truy cập: Chỉ Quản trị viên mới có quyền trao quyền!");
        }

        if (request.getEmail() == null || request.getEmail().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Vui lòng nhập Email của người dùng cần trao quyền Admin!");
        }
        if (request.getName() == null || request.getName().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Vui lòng nhập Tên (Username hoặc Họ tên) của người dùng!");
        }

        String cleanEmail = request.getEmail().trim();
        Optional<User> userOpt = userRepository.findByEmail(cleanEmail);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body("Không tìm thấy tài khoản người dùng với Email: " + cleanEmail);
        }

        User targetUser = userOpt.get();
        String cleanName = request.getName().trim().toLowerCase();
        String username = targetUser.getUsername() != null ? targetUser.getUsername().toLowerCase() : "";
        String fullName = targetUser.getFullName() != null ? targetUser.getFullName().toLowerCase() : "";

        boolean matches = username.contains(cleanName) || cleanName.contains(username)
                || (!fullName.isEmpty() && (fullName.contains(cleanName) || cleanName.contains(fullName)));

        if (!matches) {
            return ResponseEntity.badRequest()
                    .body("Tên người dùng không khớp với thông tin tài khoản sở hữu Email này! (Email: " + cleanEmail + ")");
        }

        if ("ROLE_ADMIN".equals(targetUser.getRole()) || "ADMIN".equals(targetUser.getRole())) {
            return ResponseEntity.badRequest()
                    .body("Tài khoản '" + targetUser.getUsername() + "' (" + cleanEmail + ") hiện đã là Quản trị viên (Admin) rồi!");
        }

        targetUser.setRole("ROLE_ADMIN");
        userRepository.save(targetUser);

        UserProfileResponse response = new UserProfileResponse(
                targetUser.getId(),
                targetUser.getUsername(),
                targetUser.getEmail(),
                targetUser.getFullName(),
                targetUser.getPhone(),
                targetUser.getAddress(),
                targetUser.getRole(),
                targetUser.getCreateAt()
        );

        return ResponseEntity.ok(response);
    }

    // 5. Thu hồi quyền Quản trị viên (Gỡ quyền Admin)
    @PostMapping("/revoke-admin")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('ROLE_ADMIN')")
    @Transactional
    public ResponseEntity<?> revokeAdminRole(@AuthenticationPrincipal UserDetailsImpl userDetails,
                                            @RequestBody AdminRoleRequest request) {
        if (!isAdmin(userDetails)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Từ chối truy cập: Chỉ Quản trị viên mới có quyền gỡ quyền!");
        }

        if (request.getEmail() == null || request.getEmail().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Vui lòng nhập Email của người dùng cần gỡ quyền Admin!");
        }

        String cleanEmail = request.getEmail().trim();
        Optional<User> userOpt = userRepository.findByEmail(cleanEmail);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body("Không tìm thấy tài khoản người dùng với Email: " + cleanEmail);
        }

        User targetUser = userOpt.get();

        // Không cho phép tự gỡ quyền của chính mình
        if (targetUser.getId().equals(userDetails.getId())) {
            return ResponseEntity.badRequest()
                    .body("Bạn không thể tự gỡ quyền Quản trị viên của chính mình để tránh mất quyền kiểm soát hệ thống!");
        }

        if (!"ROLE_ADMIN".equals(targetUser.getRole()) && !"ADMIN".equals(targetUser.getRole())) {
            return ResponseEntity.badRequest()
                    .body("Tài khoản '" + targetUser.getUsername() + "' (" + cleanEmail + ") hiện không phải là Quản trị viên!");
        }

        // Nếu có nhập tên, kiểm tra tính khớp
        if (request.getName() != null && !request.getName().trim().isEmpty()) {
            String cleanName = request.getName().trim().toLowerCase();
            String username = targetUser.getUsername() != null ? targetUser.getUsername().toLowerCase() : "";
            String fullName = targetUser.getFullName() != null ? targetUser.getFullName().toLowerCase() : "";

            boolean matches = username.contains(cleanName) || cleanName.contains(username)
                    || (!fullName.isEmpty() && (fullName.contains(cleanName) || cleanName.contains(fullName)));

            if (!matches) {
                return ResponseEntity.badRequest()
                        .body("Tên người dùng không khớp với thông tin tài khoản sở hữu Email này!");
            }
        }

        targetUser.setRole("ROLE_USER");
        userRepository.save(targetUser);

        UserProfileResponse response = new UserProfileResponse(
                targetUser.getId(),
                targetUser.getUsername(),
                targetUser.getEmail(),
                targetUser.getFullName(),
                targetUser.getPhone(),
                targetUser.getAddress(),
                targetUser.getRole(),
                targetUser.getCreateAt()
        );

        return ResponseEntity.ok(response);
    }
}

