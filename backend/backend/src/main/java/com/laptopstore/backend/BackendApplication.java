package com.laptopstore.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.util.TimeZone;

@SpringBootApplication
public class BackendApplication {

	public static void main(String[] args) {
		// Thiết lập múi giờ UTC ngay lập tức để PostgreSQL Driver không bị lỗi
		TimeZone.setDefault(TimeZone.getTimeZone("UTC"));

		// Bắt đầu khởi chạy Spring Boot
		SpringApplication.run(BackendApplication.class, args);
	}
}