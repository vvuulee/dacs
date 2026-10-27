package com.laptopstore.backend.controller;

import com.laptopstore.backend.dto.AdminRoleRequest;
import com.laptopstore.backend.dto.StaffRequest;
import com.laptopstore.backend.dto.UpdateProfileRequest;
import com.laptopstore.backend.dto.UserProfileResponse;
import com.laptopstore.backend.security.UserDetailsImpl;
import com.laptopstore.backend.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.NoSuchElementException;

@CrossOrigin("*")
@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    private boolean isAdmin(UserDetailsImpl userDetails) {
        if (userDetails == null) return false;
        return userDetails.getAuthorities().stream().anyMatch(a ->
                "ROLE_ADMIN".equals(a.getAuthority()) || "ADMIN".equals(a.getAuthority())
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
        try {
            return ResponseEntity.ok(userService.getProfile(userDetails.getId()));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        }
    }

    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(@AuthenticationPrincipal UserDetailsImpl userDetails,
                                           @RequestBody UpdateProfileRequest request) {
        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Chưa xác thực người dùng!");
        }
        try {
            return ResponseEntity.ok(userService.updateProfile(userDetails.getId(), request));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // ==========================================
    // 2. QUẢN LÝ NHÂN VIÊN (STAFF MANAGEMENT - CHỈ ADMIN)
    // ==========================================

    @GetMapping("/staff")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<?> getAllStaff(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (!isAdmin(userDetails)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Từ chối truy cập: Chỉ Quản trị viên mới có quyền xem danh sách nhân viên!");
        }
        return ResponseEntity.ok(userService.getAllStaff());
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<?> getAllUsers(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (!isAdmin(userDetails)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Từ chối truy cập: Chỉ Quản trị viên mới có quyền xem!");
        }
        return ResponseEntity.ok(userService.getAllUsers());
    }

    @PostMapping("/staff")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<?> createStaff(@AuthenticationPrincipal UserDetailsImpl userDetails,
                                         @RequestBody StaffRequest request) {
        if (!isAdmin(userDetails)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Từ chối truy cập: Chỉ Quản trị viên mới có quyền tạo tài khoản nhân viên!");
        }
        try {
            UserProfileResponse response = userService.createStaff(request);
            return new ResponseEntity<>(response, HttpStatus.CREATED);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/staff/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<?> updateStaff(@AuthenticationPrincipal UserDetailsImpl userDetails,
                                         @PathVariable Long id,
                                         @RequestBody StaffRequest request) {
        if (!isAdmin(userDetails)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Từ chối truy cập: Chỉ Quản trị viên mới có quyền sửa!");
        }
        try {
            return ResponseEntity.ok(userService.updateStaff(id, request));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/staff/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<?> deleteStaff(@AuthenticationPrincipal UserDetailsImpl userDetails,
                                         @PathVariable Long id) {
        if (!isAdmin(userDetails)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Từ chối truy cập: Chỉ Quản trị viên mới có quyền xóa!");
        }
        try {
            userService.deleteStaff(userDetails.getId(), id);
            return ResponseEntity.ok("Đã xóa tài khoản nhân viên thành công!");
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
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
        return ResponseEntity.ok(userService.getAdminUsers());
    }

    @PostMapping("/grant-admin")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<?> grantAdminRole(@AuthenticationPrincipal UserDetailsImpl userDetails,
                                            @RequestBody AdminRoleRequest request) {
        if (!isAdmin(userDetails)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Từ chối truy cập!");
        }
        try {
            return ResponseEntity.ok(userService.grantAdminRole(request.getEmail()));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/revoke-admin")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<?> revokeAdminRole(@AuthenticationPrincipal UserDetailsImpl userDetails,
                                             @RequestBody AdminRoleRequest request) {
        if (!isAdmin(userDetails)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Từ chối truy cập!");
        }
        try {
            return ResponseEntity.ok(userService.revokeAdminRole(userDetails.getId(), request.getEmail()));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
