package com.laptopstore.backend.dto;

import com.fasterxml.jackson.annotation.JsonAlias;

public class SignupRequest {

    @JsonAlias({"username"})
    private String username;

    private String password;
    private String email;

    @JsonAlias({"name", "fullName", "full_name"})
    private String name;

    private String phone;

    public String getUsername() {
        if (username != null && !username.isBlank()) return username;
        if (email != null && !email.isBlank()) return email.split("@")[0];
        if (phone != null && !phone.isBlank()) return "kh_" + phone;
        return name;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getName() {
        return name != null ? name : username;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }
}
