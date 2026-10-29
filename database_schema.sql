-- =============================================================================
-- HỆ THỐNG QUẢN LÝ & BÁN HÀNG TẠI QUẦY QUÁN CÀ PHÊ (COFFEE SHOP POS SYSTEM)
-- Database Engine: PostgreSQL 15+
-- =============================================================================

-- 1. Xóa các bảng cũ nếu tồn tại (để reset sạch sẽ)
DROP TABLE IF EXISTS order_detail_toppings CASCADE;
DROP TABLE IF EXISTS order_details CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS product_variants CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS toppings CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS ingredients CASCADE;
DROP TABLE IF EXISTS carts CASCADE;
DROP TABLE IF EXISTS cart_items CASCADE;
DROP TABLE IF EXISTS order_reviews CASCADE;

-- =============================================================================
-- 2. TẠO CÁC BẢNG (TABLE DEFINITIONS)
-- =============================================================================

-- Bảng 1: Tài khoản nội bộ (Chỉ có Quản lý / Admin và Nhân viên / Staff)
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    full_name VARCHAR(150),
    phone VARCHAR(20),
    address VARCHAR(255),
    role VARCHAR(50) NOT NULL DEFAULT 'ROLE_STAFF', -- 'ROLE_ADMIN' hoặc 'ROLE_STAFF'
    create_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Bảng 2: Danh mục đồ uống & bánh ngọt
CREATE TABLE categories (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT
);

-- Bảng 3: Thực đơn món (Đã bỏ cấu hình laptop và bỏ cột mô tả)
CREATE TABLE products (
    id BIGSERIAL PRIMARY KEY,
    category_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    price DOUBLE PRECISION,
    image_url VARCHAR(500),
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Bảng 4: Kích cỡ món & Đơn giá từng size (Size S, Size M, Size L)
CREATE TABLE product_variants (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    size VARCHAR(50) NOT NULL, -- 'Size S', 'Size M', 'Size L', 'Tiêu chuẩn'
    price NUMERIC(38, 2) NOT NULL,
    stock_quantity INT,        -- NULL với đồ uống pha chế; Số lượng cái/suất với Bánh ngọt
    image_url VARCHAR(500)
);

-- Bảng 5: Danh mục Topping gọi kèm
CREATE TABLE toppings (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price DOUBLE PRECISION NOT NULL,
    is_available BOOLEAN DEFAULT TRUE
);

-- Bảng 6: Hóa đơn bán hàng POS tại quầy
CREATE TABLE orders (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE SET NULL, -- Thu ngân / Nhân viên lập đơn
    order_type VARCHAR(50) NOT NULL DEFAULT 'DINE_IN',      -- 'DINE_IN' (Tại bàn) hoặc 'TAKE_AWAY' (Mang về)
    table_name VARCHAR(100),                               -- 'Bàn 01', 'Bàn 02'...
    status VARCHAR(50) NOT NULL DEFAULT 'PAID',            -- 'PAID' (Đã thanh toán) hoặc 'UNPAID' (Đang phục vụ)
    payment_method VARCHAR(50) NOT NULL DEFAULT 'CASH',     -- 'CASH' (Tiền mặt), 'TRANSFER' (Chuyển khoản QR), 'CARD'
    note VARCHAR(255),
    total_amount NUMERIC(38, 2) NOT NULL DEFAULT 0.00,
    create_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Bảng 7: Chi tiết từng ly nước trong hóa đơn
CREATE TABLE order_details (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_variant_id BIGINT NOT NULL REFERENCES product_variants(id),
    product_name VARCHAR(255),                             -- Snapshot tên món lúc bán
    size VARCHAR(50),                                      -- Snapshot cỡ ly lúc bán
    quantity INT NOT NULL DEFAULT 1,
    price NUMERIC(38, 2) NOT NULL,                         -- Giá ly lúc bán
    note VARCHAR(255)                                      -- Ghi chú pha chế: "70% đường, ít đá"
);

-- Bảng 8: Chi tiết các Topping chọn thêm cho từng ly nước
CREATE TABLE order_detail_toppings (
    id BIGSERIAL PRIMARY KEY,
    order_detail_id BIGINT NOT NULL REFERENCES order_details(id) ON DELETE CASCADE,
    topping_id BIGINT REFERENCES toppings(id) ON DELETE SET NULL,
    topping_name VARCHAR(255),                             -- Snapshot tên topping lúc bán
    price NUMERIC(38, 2) NOT NULL,                         -- Đơn giá topping lúc bán
    quantity INT NOT NULL DEFAULT 1
);

-- Bảng 9: Bảng nguyên nhiên liệu kiểm hàng cuối ca (Bảng độc lập, không liên kết khóa ngoại)
CREATE TABLE ingredients (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    min_quantity NUMERIC(10, 2) DEFAULT 0.00,
    note VARCHAR(255),
    last_checked_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_checked_by VARCHAR(100)
);

-- =============================================================================
-- 3. DỮ LIỆU KHỞI TẠO MẪU (SEED DATA SẴN SÀNG SỬ DỤNG)
-- =============================================================================

-- Mật khẩu mặc định của tất cả tài khoản bên dưới là: 123456
-- (Đã băm bằng BCrypt: $2a$10$BM/pG5g9tDuWvREVkVzz5ujM3dH21xW20is6GNyDd0uelQ5Cq.Lna)

-- A. Tài khoản Quản lý & Nhân viên
INSERT INTO users (username, password, email, full_name, phone, role) VALUES
('admin', '$2a$10$BM/pG5g9tDuWvREVkVzz5ujM3dH21xW20is6GNyDd0uelQ5Cq.Lna', 'admin@poscafe.com', 'Chủ Quán / Quản Lý', '0901234567', 'ROLE_ADMIN'),
('lecongvu', '$2a$10$BM/pG5g9tDuWvREVkVzz5ujM3dH21xW20is6GNyDd0uelQ5Cq.Lna', 'lecongvu31032005@gmail.com', 'Lê Công Vũ', '0912345678', 'ROLE_ADMIN'),
('nhanvien1', '$2a$10$BM/pG5g9tDuWvREVkVzz5ujM3dH21xW20is6GNyDd0uelQ5Cq.Lna', 'thungan1@poscafe.com', 'Nguyễn Thị Thu Ngân', '0987654321', 'ROLE_STAFF'),
('nhanvien2', '$2a$10$BM/pG5g9tDuWvREVkVzz5ujM3dH21xW20is6GNyDd0uelQ5Cq.Lna', 'phucvu1@poscafe.com', 'Trần Văn Pha Chế', '0988776655', 'ROLE_STAFF');

-- B. Danh mục thực đơn
INSERT INTO categories (id, name, description) VALUES
(1, 'Cà phê', 'Cà phê pha phin truyền thống và pha máy thơm ngon đậm đà'),
(2, 'Trà trái cây', 'Trà thanh nhiệt kết hợp trái cây tươi mát'),
(3, 'Trà sữa', 'Trà sữa đậm vị trà, béo vị sữa chuẩn gu giới trẻ'),
(4, 'Bánh ngọt', 'Bánh ăn kèm điểm tâm nhẹ nhàng');

-- C. Món đồ uống (Products)
INSERT INTO products (id, category_id, name, price, image_url, is_available) VALUES
(1, 1, 'Cà phê Sữa Đá Sài Gòn', 29000, 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=500', true),
(2, 1, 'Bạc Xỉu 3 Tầng', 32000, 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=500', true),
(3, 1, 'Cà phê Muối Cố Đô', 35000, 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=500', true),
(4, 2, 'Trà Đào Cam Sả', 39000, 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500', true),
(5, 2, 'Trà Vải Hoa Lài', 39000, 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=500', true),
(6, 3, 'Trà Sữa Oolong Nướng', 42000, 'https://images.unsplash.com/photo-1558857563-b37cf0c793ff?w=500', true),
(7, 3, 'Trà Sữa Matcha Nhật Bản', 45000, 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=500', true),
(8, 4, 'Bánh Croissant Bơ Tỏi', 28000, 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=500', true);

-- D. Kích cỡ & Giá tiền tương ứng (Product Variants)
-- Đồ uống (Cà phê, Trà): stock_quantity = NULL (pha chế theo ly, không giới hạn tồn suất)
-- Bánh ngọt (Món 8): stock_quantity = 20 (quản lý số cái thực tế trong tủ bánh đầu ca)
INSERT INTO product_variants (product_id, size, price, stock_quantity) VALUES
(1, 'Size M', 29000.00, NULL),
(1, 'Size L', 35000.00, NULL),
(2, 'Size M', 32000.00, NULL),
(2, 'Size L', 38000.00, NULL),
(3, 'Size M', 35000.00, NULL),
(3, 'Size L', 40000.00, NULL),
(4, 'Size M', 39000.00, NULL),
(4, 'Size L', 45000.00, NULL),
(5, 'Size M', 39000.00, NULL),
(5, 'Size L', 45000.00, NULL),
(6, 'Size M', 42000.00, NULL),
(6, 'Size L', 48000.00, NULL),
(7, 'Size M', 45000.00, NULL),
(7, 'Size L', 52000.00, NULL),
(8, 'Tiêu chuẩn', 28000.00, 20);

-- E. Topping gọi thêm (Toppings)
INSERT INTO toppings (id, name, price, is_available) VALUES
(1, 'Trân châu đường đen', 10000, true),
(2, 'Trân châu trắng giòn 3Q', 10000, true),
(3, 'Kem Phô Mai Macchiato (Cheese Foam)', 15000, true),
(4, 'Thạch Củ Năng Lá Dứa', 10000, true),
(5, 'Thạch Trái Đào Tươi', 12000, true),
(6, 'Pudding Trứng Mềm Mịn', 10000, true),
(7, 'Shot Espresso Thêm Đậm Vị', 12000, true);

-- F. Danh mục nguyên nhiên liệu kiểm kê kho cuối ca
INSERT INTO ingredients (id, name, unit, quantity, min_quantity, note, last_checked_by) VALUES
(1, 'Hạt cà phê Robusta rang mộc', 'kg', 15.5, 5.0, 'Bao mới nhập đầu tuần, chất lượng tốt', 'nhanvien1'),
(2, 'Hạt cà phê Arabica Cầu Đất', 'kg', 8.2, 3.0, 'Đang dùng bao số 2', 'nhanvien1'),
(3, 'Sữa đặc Ngôi Sao Phương Nam (Lon 1.284kg)', 'lon', 24.0, 6.0, 'Đầy đủ trong kho mát', 'nhanvien1'),
(4, 'Sữa tươi tiệt trùng không đường Barista', 'hộp', 36.0, 10.0, 'Hạn sử dụng còn 4 tháng', 'nhanvien2'),
(5, 'Bột trà xanh Matcha Nhật Bản Uji', 'gói', 4.5, 1.0, 'Đã khui 1 gói 500g', 'nhanvien2'),
(6, 'Trà đen Oolong nướng hảo hạng', 'kg', 6.0, 2.0, 'Mùi thơm đậm đà', 'nhanvien1'),
(7, 'Đường cát trắng Biên Hòa', 'kg', 25.0, 5.0, 'Bao 50kg còn nửa bao', 'nhanvien1'),
(8, 'Bột béo thực vật B One', 'gói', 12.0, 3.0, 'Nguyên thùng chưa mở', 'nhanvien2'),
(9, 'Siro Đào Teisseire', 'chai', 5.0, 2.0, 'Đã mở 1 chai', 'nhanvien2'),
(10, 'Ly nhựa nắp cầu 500ml (Size M)', 'cái', 350.0, 100.0, 'Đủ dùng 3 ngày tới', 'nhanvien1'),
(11, 'Ly nhựa nắp cầu 700ml (Size L)', 'cái', 280.0, 100.0, 'Đủ dùng 3 ngày tới', 'nhanvien1'),
(12, 'Ống hút giấy bọc màng', 'cái', 500.0, 150.0, 'Còn 1 bịch lớn', 'nhanvien1');

-- Đặt lại giá trị lớn nhất cho sequence tự tăng
SELECT setval('categories_id_seq', (SELECT MAX(id) FROM categories));
SELECT setval('products_id_seq', (SELECT MAX(id) FROM products));
SELECT setval('toppings_id_seq', (SELECT MAX(id) FROM toppings));
SELECT setval('ingredients_id_seq', (SELECT MAX(id) FROM ingredients));
