package com.laptopstore.backend.controller;

import com.laptopstore.backend.dto.AdminRoleRequest;
import com.laptopstore.backend.dto.StaffRequest;
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

@CrossOrigin("*")
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

    private UserProfileResponse mapToResponse(User user) {
        return new UserProfileResponse(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getFullName(),
                user.getPhone(),
                user.getAddress(),
                user.getRole(),
                user.getCreateAt()
        );
    }

    // ==========================================
    // 1. THÔNG TIN CÁ NHÂN (PROFILE)
    // ==========================================

    @GetMapping("/profile")
    public ResponseEntity<?> getProfile(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Chưa xác thực người dùng!");
        }

        User user = userRepository.findById(userDetails.getId()).orElse(null);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Không tìm thấy thông tin tài khoản!");
        }

        return ResponseEntity.ok(mapToResponse(user));
    }

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

        // Cập nhật Email
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

        // Cập nhật Họ tên, SĐT, Địa chỉ
        if (request.getFullName() != null) {
            user.setFullName(request.getFullName().trim());
        }
        if (request.getPhone() != null) {
            user.setPhone(request.getPhone().trim());
        }
        if (request.getAddress() != null) {
            user.setAddress(request.getAddress().trim());
        }

        // Đổi mật khẩu
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
        return ResponseEntity.ok(mapToResponse(user));
    }

    // ==========================================
    // 2. QUẢN LÝ NHÂN VIÊN (STAFF MANAGEMENT - CHỈ ADMIN)
    // ==========================================

    /**
     * Lấy danh sách tất cả nhân viên quán cafe (ROLE_STAFF)
     */
    @GetMapping("/staff")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<?> getAllStaff(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (!isAdmin(userDetails)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Từ chối truy cập: Chỉ Quản trị viên mới có quyền xem danh sách nhân viên!");
        }

        List<User> staffList = userRepository.findByRoleInOrderByIdDesc(List.of("ROLE_STAFF", "STAFF"));
        List<UserProfileResponse> responses = staffList.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());

        return ResponseEntity.ok(responses);
    }

    /**
     * Lấy toàn bộ danh sách tài khoản nội bộ (Admin + Staff)
     */
    @GetMapping
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<?> getAllUsers(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (!isAdmin(userDetails)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Từ chối truy cập: Chỉ Quản trị viên mới có quyền xem!");
        }

        List<User> allUsers = userRepository.findAllByOrderByIdDesc();
        List<UserProfileResponse> responses = allUsers.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());

        return ResponseEntity.ok(responses);
    }

    /**
     * Admin tạo tài khoản Nhân viên mới cho quán
     */
    @PostMapping("/staff")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('ROLE_ADMIN')")
    @Transactional
    public ResponseEntity<?> createStaff(@AuthenticationPrincipal UserDetailsImpl userDetails,
                                         @RequestBody StaffRequest request) {
        if (!isAdmin(userDetails)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Từ chối truy cập: Chỉ Quản trị viên mới có quyền tạo tài khoản nhân viên!");
        }

        if (request.getUsername() == null || request.getUsername().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Tên đăng nhập không được để trống!");
        }
        String username = request.getUsername().trim().toLowerCase();

        if (userRepository.existsByUsername(username)) {
            return ResponseEntity.badRequest().body("Tên đăng nhập '" + username + "' đã tồn tại!");
        }

        if (request.getPassword() == null || request.getPassword().trim().length() < 6) {
            return ResponseEntity.badRequest().body("Mật khẩu phải có ít nhất 6 ký tự!");
        }

        String email = (request.getEmail() != null && !request.getEmail().trim().isEmpty())
                ? request.getEmail().trim()
                : (username + "@cafe.internal");

        if (userRepository.existsByEmail(email)) {
            return ResponseEntity.badRequest().body("Email '" + email + "' đã tồn tại trong hệ thống!");
        }

        User staff = new User();
        staff.setUsername(username);
        staff.setPassword(passwordEncoder.encode(request.getPassword().trim()));
        staff.setEmail(email);
        staff.setFullName(request.getFullName() != null ? request.getFullName().trim() : username);
        staff.setPhone(request.getPhone() != null ? request.getPhone().trim() : null);
        staff.setRole("ROLE_STAFF");

        User saved = userRepository.save(staff);
        return new ResponseEntity<>(mapToResponse(saved), HttpStatus.CREATED);
    }

    /**
     * Admin cập nhật thông tin nhân viên
     */
    @PutMapping("/staff/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('ROLE_ADMIN')")
    @Transactional
    public ResponseEntity<?> updateStaff(@AuthenticationPrincipal UserDetailsImpl userDetails,
                                         @PathVariable Long id,
                                         @RequestBody StaffRequest request) {
        if (!isAdmin(userDetails)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Từ chối truy cập: Chỉ Quản trị viên mới có quyền sửa!");
        }

        Optional<User> staffOpt = userRepository.findById(id);
        if (staffOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Không tìm thấy nhân viên với ID: " + id);
        }

        User staff = staffOpt.get();

        if (request.getFullName() != null) {
            staff.setFullName(request.getFullName().trim());
        }
        if (request.getPhone() != null) {
            staff.setPhone(request.getPhone().trim());
        }
        if (request.getEmail() != null && !request.getEmail().trim().isEmpty()) {
            String newEmail = request.getEmail().trim();
            if (!newEmail.equalsIgnoreCase(staff.getEmail())) {
                Optional<User> emailCheck = userRepository.findByEmail(newEmail);
                if (emailCheck.isPresent() && !emailCheck.get().getId().equals(staff.getId())) {
                    return ResponseEntity.badRequest().body("Email này đã được sử dụng bởi tài khoản khác!");
                }
                staff.setEmail(newEmail);
            }
        }
        if (request.getPassword() != null && !request.getPassword().trim().isEmpty()) {
            if (request.getPassword().trim().length() < 6) {
                return ResponseEntity.badRequest().body("Mật khẩu mới phải có ít nhất 6 ký tự!");
            }
            staff.setPassword(passwordEncoder.encode(request.getPassword().trim()));
        }

        if (request.getRole() != null && !request.getRole().isBlank()) {
            staff.setRole(request.getRole().trim());
        }

        userRepository.save(staff);
        return ResponseEntity.ok(mapToResponse(staff));
    }

    /**
     * Admin xóa tài khoản nhân viên
     */
    @DeleteMapping("/staff/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('ROLE_ADMIN')")
    @Transactional
    public ResponseEntity<?> deleteStaff(@AuthenticationPrincipal UserDetailsImpl userDetails,
                                         @PathVariable Long id) {
        if (!isAdmin(userDetails)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Từ chối truy cập: Chỉ Quản trị viên mới có quyền xóa!");
        }

        if (userDetails.getId().equals(id)) {
            return ResponseEntity.badRequest().body("Bạn không thể tự xóa tài khoản của chính mình!");
        }

        Optional<User> userOpt = userRepository.findById(id);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Không tìm thấy tài khoản với ID: " + id);
        }

        userRepository.deleteById(id);
        return ResponseEntity.ok("Đã xóa tài khoản nhân viên thành công!");
    }

    // ==========================================
    // 3. QUẢN LÝ ADMIN (QUẢN TRỊ VIÊN)
    // ==========================================

    @GetMapping("/admins")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<?> getAdminUsers(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (!isAdmin(userDetails)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Từ chối truy cập!");
        }

        List<User> admins = userRepository.findByRoleInOrderByIdDesc(List.of("ROLE_ADMIN", "ADMIN"));
        List<UserProfileResponse> responses = admins.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());

        return ResponseEntity.ok(responses);
    }

    @PostMapping("/grant-admin")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('ROLE_ADMIN')")
    @Transactional
    public ResponseEntity<?> grantAdminRole(@AuthenticationPrincipal UserDetailsImpl userDetails,
                                            @RequestBody AdminRoleRequest request) {
        if (!isAdmin(userDetails)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Từ chối truy cập!");
        }

        if (request.getEmail() == null || request.getEmail().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Vui lòng nhập Email!");
        }

        String cleanEmail = request.getEmail().trim();
        Optional<User> userOpt = userRepository.findByEmail(cleanEmail);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body("Không tìm thấy tài khoản với Email: " + cleanEmail);
        }

        User targetUser = userOpt.get();
        targetUser.setRole("ROLE_ADMIN");
        userRepository.save(targetUser);

        return ResponseEntity.ok(mapToResponse(targetUser));
    }

    @PostMapping("/revoke-admin")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('ROLE_ADMIN')")
    @Transactional
    public ResponseEntity<?> revokeAdminRole(@AuthenticationPrincipal UserDetailsImpl userDetails,
                                             @RequestBody AdminRoleRequest request) {
        if (!isAdmin(userDetails)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Từ chối truy cập!");
        }

        if (request.getEmail() == null || request.getEmail().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Vui lòng nhập Email!");
        }

        String cleanEmail = request.getEmail().trim();
        Optional<User> userOpt = userRepository.findByEmail(cleanEmail);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body("Không tìm thấy tài khoản với Email: " + cleanEmail);
        }

        User targetUser = userOpt.get();
        if (targetUser.getId().equals(userDetails.getId())) {
            return ResponseEntity.badRequest().body("Không thể tự gỡ quyền Quản trị viên của chính mình!");
        }

        targetUser.setRole("ROLE_STAFF");
        userRepository.save(targetUser);

        return ResponseEntity.ok(mapToResponse(targetUser));
    }
}
