package com.laptopstore.backend.service;

import com.laptopstore.backend.dto.AdminRoleRequest;
import com.laptopstore.backend.dto.StaffRequest;
import com.laptopstore.backend.dto.UpdateProfileRequest;
import com.laptopstore.backend.dto.UserProfileResponse;
import com.laptopstore.backend.entity.User;
import com.laptopstore.backend.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public UserProfileResponse mapToResponse(User user) {
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

    // 1. Lấy thông tin cá nhân (Profile)
    public UserProfileResponse getProfile(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy thông tin tài khoản!"));
        return mapToResponse(user);
    }

    // 2. Cập nhật thông tin cá nhân & Đổi mật khẩu
    @Transactional
    public UserProfileResponse updateProfile(Long userId, UpdateProfileRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy thông tin tài khoản!"));

        if (request.getEmail() != null && !request.getEmail().trim().isEmpty()) {
            String newEmail = request.getEmail().trim();
            if (!newEmail.equalsIgnoreCase(user.getEmail())) {
                Optional<User> existingEmailUser = userRepository.findByEmail(newEmail);
                if (existingEmailUser.isPresent() && !existingEmailUser.get().getId().equals(user.getId())) {
                    throw new IllegalArgumentException("Email này đã được sử dụng bởi một tài khoản khác!");
                }
                user.setEmail(newEmail);
            }
        }

        if (request.getFullName() != null) {
            user.setFullName(request.getFullName().trim());
        }
        if (request.getPhone() != null) {
            user.setPhone(request.getPhone().trim());
        }
        if (request.getAddress() != null) {
            user.setAddress(request.getAddress().trim());
        }

        if (request.getNewPassword() != null && !request.getNewPassword().trim().isEmpty()) {
            String newPass = request.getNewPassword().trim();
            if (newPass.length() < 6) {
                throw new IllegalArgumentException("Mật khẩu mới phải có ít nhất 6 ký tự!");
            }

            if (request.getCurrentPassword() == null || request.getCurrentPassword().trim().isEmpty()) {
                throw new IllegalArgumentException("Vui lòng nhập mật khẩu hiện tại để xác nhận đổi mật khẩu!");
            }

            if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
                throw new IllegalArgumentException("Mật khẩu hiện tại không chính xác!");
            }

            user.setPassword(passwordEncoder.encode(newPass));
        }

        User saved = userRepository.save(user);
        return mapToResponse(saved);
    }

    // 3. Lấy danh sách nhân viên
    public List<UserProfileResponse> getAllStaff() {
        return userRepository.findByRoleInOrderByIdDesc(List.of("ROLE_STAFF", "STAFF"))
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    // 4. Lấy tất cả tài khoản nội bộ
    public List<UserProfileResponse> getAllUsers() {
        return userRepository.findAllByOrderByIdDesc()
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    // 5. Admin tạo tài khoản nhân viên mới
    @Transactional
    public UserProfileResponse createStaff(StaffRequest request) {
        if (request.getUsername() == null || request.getUsername().trim().isEmpty()) {
            throw new IllegalArgumentException("Tên đăng nhập không được để trống!");
        }
        String username = request.getUsername().trim().toLowerCase();

        if (userRepository.existsByUsername(username)) {
            throw new IllegalArgumentException("Tên đăng nhập '" + username + "' đã tồn tại!");
        }

        if (request.getPassword() == null || request.getPassword().trim().length() < 6) {
            throw new IllegalArgumentException("Mật khẩu phải có ít nhất 6 ký tự!");
        }

        String email = (request.getEmail() != null && !request.getEmail().trim().isEmpty())
                ? request.getEmail().trim()
                : (username + "@cafe.internal");

        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("Email '" + email + "' đã tồn tại trong hệ thống!");
        }

        User staff = new User();
        staff.setUsername(username);
        staff.setPassword(passwordEncoder.encode(request.getPassword().trim()));
        staff.setEmail(email);
        staff.setFullName(request.getFullName() != null ? request.getFullName().trim() : username);
        staff.setPhone(request.getPhone() != null ? request.getPhone().trim() : null);
        staff.setRole("ROLE_STAFF");

        User saved = userRepository.save(staff);
        return mapToResponse(saved);
    }

    // 6. Admin cập nhật thông tin nhân viên
    @Transactional
    public UserProfileResponse updateStaff(Long staffId, StaffRequest request) {
        User staff = userRepository.findById(staffId)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy nhân viên với ID: " + staffId));

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
                    throw new IllegalArgumentException("Email này đã được sử dụng bởi tài khoản khác!");
                }
                staff.setEmail(newEmail);
            }
        }
        if (request.getPassword() != null && !request.getPassword().trim().isEmpty()) {
            if (request.getPassword().trim().length() < 6) {
                throw new IllegalArgumentException("Mật khẩu mới phải có ít nhất 6 ký tự!");
            }
            staff.setPassword(passwordEncoder.encode(request.getPassword().trim()));
        }

        if (request.getRole() != null && !request.getRole().isBlank()) {
            staff.setRole(request.getRole().trim());
        }

        User saved = userRepository.save(staff);
        return mapToResponse(saved);
    }

    // 7. Admin xóa nhân viên
    @Transactional
    public void deleteStaff(Long currentUserId, Long staffId) {
        if (currentUserId != null && currentUserId.equals(staffId)) {
            throw new IllegalArgumentException("Bạn không thể tự xóa tài khoản của chính mình!");
        }

        if (!userRepository.existsById(staffId)) {
            throw new NoSuchElementException("Không tìm thấy tài khoản với ID: " + staffId);
        }

        userRepository.deleteById(staffId);
    }

    // 8. Lấy danh sách quản trị viên
    public List<UserProfileResponse> getAdminUsers() {
        return userRepository.findByRoleInOrderByIdDesc(List.of("ROLE_ADMIN", "ADMIN"))
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    // 9. Cấp quyền Admin
    @Transactional
    public UserProfileResponse grantAdminRole(String email) {
        if (email == null || email.trim().isEmpty()) {
            throw new IllegalArgumentException("Vui lòng nhập Email!");
        }

        String cleanEmail = email.trim();
        User targetUser = userRepository.findByEmail(cleanEmail)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy tài khoản với Email: " + cleanEmail));

        targetUser.setRole("ROLE_ADMIN");
        return mapToResponse(userRepository.save(targetUser));
    }

    // 10. Gỡ quyền Admin
    @Transactional
    public UserProfileResponse revokeAdminRole(Long currentUserId, String email) {
        if (email == null || email.trim().isEmpty()) {
            throw new IllegalArgumentException("Vui lòng nhập Email!");
        }

        String cleanEmail = email.trim();
        User targetUser = userRepository.findByEmail(cleanEmail)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy tài khoản với Email: " + cleanEmail));

        if (currentUserId != null && targetUser.getId().equals(currentUserId)) {
            throw new IllegalArgumentException("Không thể tự gỡ quyền Quản trị viên của chính mình!");
        }

        targetUser.setRole("ROLE_STAFF");
        return mapToResponse(userRepository.save(targetUser));
    }
}
