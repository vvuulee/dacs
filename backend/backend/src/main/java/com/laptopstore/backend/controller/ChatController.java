package com.laptopstore.backend.controller;

import com.laptopstore.backend.entity.Product;
import com.laptopstore.backend.entity.ProductVariant;
import com.laptopstore.backend.repository.ProductRepository;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class ChatController {

    private final ChatClient chatClient;
    private final ProductRepository productRepository;

    public ChatController(ChatClient.Builder chatClientBuilder, ProductRepository productRepository) {
        this.chatClient = chatClientBuilder.build();
        this.productRepository = productRepository;
    }

    private String generateLaptopContext() {
        List<Product> products = productRepository.findAll();
        StringBuilder laptopData = new StringBuilder("KHO HÀNG LAPTOP HIỆN CÓ TẠI CỬA HÀNG:\n");
        if (products.isEmpty()) {
            laptopData.append("Hiện tại kho chưa có sản phẩm nào.\n");
        } else {
            for (Product sp : products) {
                laptopData.append("- ").append(sp.getName())
                        .append(" | Danh mục: ").append(sp.getCategory() != null ? sp.getCategory().getName() : "Laptop")
                        .append(" | Giá gốc tham khảo: ").append(sp.getPrice() != null ? String.format("%,.0f", sp.getPrice()) : "0").append(" VNĐ")
                        .append(" | CPU: ").append(sp.getCpu() != null ? sp.getCpu() : "Đang cập nhật")
                        .append(" | RAM: ").append(sp.getRamGb() != null ? sp.getRamGb() : 0).append("GB")
                        .append(" | Ổ cứng: ").append(sp.getStorageGb() != null ? sp.getStorageGb() : 0).append("GB")
                        .append(" | VGA: ").append(sp.getVga() != null ? sp.getVga() : "Onboard")
                        .append(" | Màn hình: ").append(sp.getScreenSize() != null ? sp.getScreenSize() : "Chuẩn").append("\n");
            }
        }
        return laptopData.toString();
    }

    private String fallbackAdvisor(String message) {
        List<Product> products = productRepository.findAll();
        String lowerMsg = message.toLowerCase();
        StringBuilder reply = new StringBuilder();

        reply.append("Xin chào! Dưới đây là các gợi ý laptop phù hợp tại cửa hàng LAPTOP.HAY:\n\n");
        int count = 0;
        for (Product p : products) {
            String nameLower = p.getName() != null ? p.getName().toLowerCase() : "";
            String catLower = p.getCategory() != null && p.getCategory().getName() != null ? p.getCategory().getName().toLowerCase() : "";

            boolean match = false;
            if (lowerMsg.contains("gaming") && (catLower.contains("gaming") || nameLower.contains("gaming") || nameLower.contains("tuf") || nameLower.contains("legion") || nameLower.contains("rog"))) {
                match = true;
            } else if ((lowerMsg.contains("macbook") || lowerMsg.contains("apple")) && (nameLower.contains("macbook") || catLower.contains("macbook"))) {
                match = true;
            } else if (lowerMsg.contains("văn phòng") && (catLower.contains("văn phòng") || lowerMsg.contains("mỏng nhẹ"))) {
                match = true;
            } else if (lowerMsg.contains("danh sách") || lowerMsg.contains("kho") || lowerMsg.contains("tất cả")) {
                match = true;
            }

            if (match) {
                count++;
                reply.append("💻 **").append(p.getName()).append("**\n")
                        .append("  • Giá: ").append(p.getPrice() != null ? String.format("%,.0f VNĐ", p.getPrice()) : "Liên hệ")
                        .append(" | CPU: ").append(p.getCpu() != null ? p.getCpu() : "")
                        .append(" | RAM: ").append(p.getRamGb() != null ? p.getRamGb() + "GB" : "")
                        .append(" | VGA: ").append(p.getVga() != null ? p.getVga() : "")
                        .append("\n\n");
                if (count >= 3) break;
            }
        }

        if (count == 0 && !products.isEmpty()) {
            reply.append("Cửa hàng hiện có các dòng máy nổi bật:\n");
            for (int i = 0; i < Math.min(3, products.size()); i++) {
                Product p = products.get(i);
                reply.append("- **").append(p.getName()).append("**: ")
                        .append(p.getPrice() != null ? String.format("%,.0f VNĐ", p.getPrice()) : "Liên hệ")
                        .append("\n");
            }
            reply.append("\nBạn có thể nhắn tin trực tiếp qua nút Zalo ở góc màn hình để chuyên viên tư vấn chi tiết hơn nhé!");
        }

        return reply.toString();
    }

    @GetMapping("/chat")
    public ResponseEntity<?> chatWithAIGet(@RequestParam String message) {
        return handleChat(message);
    }

    @PostMapping("/chat")
    public ResponseEntity<?> chatWithAIPost(@RequestBody Map<String, String> body) {
        String message = body != null ? body.get("message") : "";
        if (message == null || message.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("reply", "Vui lòng nhập câu hỏi hoặc yêu cầu cần tư vấn!"));
        }
        return handleChat(message);
    }

    private ResponseEntity<?> handleChat(String message) {
        if (message == null || message.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("reply", "Bạn muốn tìm laptop dòng nào ạ?"));
        }

        try {
            String laptopData = generateLaptopContext();
            String systemPrompt = "Bạn là Trợ lý AI tư vấn bán laptop thông minh, thân thiện của cửa hàng LAPTOP.HAY.\n" +
                    "Nhiệm vụ của bạn là tư vấn cho khách hàng những mẫu laptop phù hợp nhất dựa trên nhu cầu của họ.\n" +
                    "Quy tắc tư vấn:\n" +
                    "1. Hãy dựa VÀO DANH SÁCH KHO HÀNG THỰC TẾ sau đây để giới thiệu đúng tên máy, cấu hình và giá bán:\n" +
                    laptopData + "\n" +
                    "2. Nếu khách hỏi loại máy cửa hàng không có, hãy lịch sự thông báo và gợi ý dòng máy tương đương có sẵn trong kho.\n" +
                    "3. Trả lời bằng tiếng Việt tự nhiên, súc tích, định dạng gạch đầu dòng rõ ràng, làm nổi bật tên máy và giá tiền.\n" +
                    "4. Luôn nhắc khách hàng có thể đặt hàng ngay trên website hoặc bấm vào nút Zalo bên cạnh để gặp nhân viên hỗ trợ.";

            String aiResponse = chatClient.prompt()
                    .system(systemPrompt)
                    .user(message)
                    .call()
                    .content();

            return ResponseEntity.ok(Map.of("reply", aiResponse));
        } catch (Exception e) {
            System.err.println("Lỗi gọi Spring AI Gemini: " + e.getMessage());
            // Fallback trả lời thông minh dựa vào danh sách sản phẩm trong database
            String fallback = fallbackAdvisor(message);
            return ResponseEntity.ok(Map.of("reply", fallback));
        }
    }
}
