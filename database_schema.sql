-- =============================================================================
-- HỆ THỐNG QUẢN LÝ & BÁN HÀNG QUÁN CÀ PHÊ ĐA KÊNH (COFFEE OMNICHANNEL SYSTEM)
-- Kết hợp: Bán hàng tại quầy (POS) & Đặt hàng Online giao tận nhà (Coffee Web)
-- Tích hợp: Tích điểm thành viên qua Số Điện Thoại (Mỗi 50 đơn tặng 1 Voucher)
-- Database Engine: PostgreSQL 15+
-- =============================================================================

-- -----------------------------------------------------------------------------
-- PHẦN 1: XÓA CÁC BẢNG CŨ (RESET DATABASE SẠCH SẼ)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS customer_vouchers CASCADE;
DROP TABLE IF EXISTS vouchers CASCADE;
DROP TABLE IF EXISTS stores CASCADE;
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

-- -----------------------------------------------------------------------------
-- PHẦN 2: TẠO CÁC BẢNG (TABLE DEFINITIONS)
-- -----------------------------------------------------------------------------

-- Bảng 1: Tài khoản người dùng (Admin, Nhân viên quầy và Khách hàng tích điểm)
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    full_name VARCHAR(150),
    phone VARCHAR(20) UNIQUE,
    address VARCHAR(255),                                  -- Địa chỉ mặc định của khách hàng
    role VARCHAR(50) NOT NULL DEFAULT 'ROLE_CUSTOMER',     -- 'ROLE_ADMIN', 'ROLE_STAFF', 'ROLE_CUSTOMER'
    order_count INT NOT NULL DEFAULT 0,                    -- Số đơn hàng tích lũy (Cứ đủ 50 đơn tặng 1 Voucher)
    create_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Bảng 2: Danh mục đồ uống & điểm tâm (Có ảnh đại diện nhóm món cho web)
CREATE TABLE categories (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    image VARCHAR(500)                                     -- Ảnh icon/banner hiển thị trên thanh menu
);

-- Bảng 3: Thực đơn món (Có mô tả hương vị cho modal chi tiết món)
CREATE TABLE products (
    id BIGSERIAL PRIMARY KEY,
    category_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,                                      -- Mô tả chi tiết (thành phần, hương vị)
    price DOUBLE PRECISION,                                -- Giá cơ bản (base price)
    image_url VARCHAR(500),
    is_available BOOLEAN DEFAULT TRUE,                     -- TRUE: Đang bán, FALSE: Tạm hết món
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Bảng 4: Kích cỡ món & Đơn giá từng size (Size S, Size M, Size L)
CREATE TABLE product_variants (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    size VARCHAR(50) NOT NULL,                             -- 'Size S', 'Size M', 'Size L', 'Tiêu chuẩn'
    price NUMERIC(38, 2) NOT NULL,                         -- Giá bán theo kích cỡ
    stock_quantity INT,                                    -- NULL: Đồ uống pha chế; Số lượng cái: Bánh ngọt kiểm tồn
    image_url VARCHAR(500)
);

-- Bảng 5: Danh mục Topping gọi kèm
CREATE TABLE toppings (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price DOUBLE PRECISION NOT NULL,
    is_available BOOLEAN DEFAULT TRUE                      -- TRUE: Còn topping, FALSE: Tạm hết
);

-- Bảng 6: Hệ thống chi nhánh cửa hàng (Cho trang /stores trên web)
CREATE TABLE stores (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,                            -- Tên cửa hàng / Chi nhánh
    province_name VARCHAR(100),                            -- Tỉnh / Thành phố
    ward_name VARCHAR(100),                                -- Phường / Xã
    street VARCHAR(255),                                   -- Số nhà, tên đường
    phone VARCHAR(50),                                     -- Hotline chi nhánh
    opening_hours VARCHAR(100)                             -- Giờ mở cửa (vd: '07:00 – 22:00')
);

-- Bảng 7: Kho Voucher khuyến mãi chung của quán (Cho trang /offers & thanh toán)
CREATE TABLE vouchers (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,                      -- Mã voucher (vd: 'CHAO10', 'GIAM20K', 'FREESHIP')
    title VARCHAR(255) NOT NULL,                           -- Tiêu đề hiển thị
    description TEXT,                                      -- Điều kiện áp dụng
    type VARCHAR(50) NOT NULL,                             -- 'percent' (% tổng đơn), 'fixed' (trừ tiền), 'freeship'
    value NUMERIC(38, 2) NOT NULL,                         -- Giá trị giảm (10% hoặc 20.000đ)
    max_discount NUMERIC(38, 2),                           -- Giảm tối đa (nếu là percent)
    min_order NUMERIC(38, 2) DEFAULT 0,                    -- Giá trị đơn tối thiểu để áp dụng
    expires_at TIMESTAMP WITHOUT TIME ZONE,                -- Hạn sử dụng
    is_active BOOLEAN DEFAULT TRUE                         -- Đang bật / Tắt
);

-- Bảng 8: Voucher tích điểm tặng riêng cho khách (Mỗi 50 đơn tặng 1 voucher vào SĐT khách)
CREATE TABLE customer_vouchers (
    id BIGSERIAL PRIMARY KEY,
    customer_phone VARCHAR(20) NOT NULL,                   -- SĐT khách hàng nhận thưởng
    voucher_code VARCHAR(50) NOT NULL,                     -- Mã voucher thưởng riêng
    title VARCHAR(255) NOT NULL,                           -- Tiêu đề (vd: 'Tri ân 50 đơn - Giảm 50.000đ')
    discount_amount NUMERIC(38, 2) NOT NULL,               -- Trị giá quà tặng
    is_used BOOLEAN DEFAULT FALSE,                         -- TRUE: Đã dùng, FALSE: Chưa dùng
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITHOUT TIME ZONE                 -- Thời hạn dùng voucher thưởng
);

-- Bảng 9: Hóa đơn bán hàng Đa Kênh (Bán tại quầy POS & Đặt Online giao tận nơi)
CREATE TABLE orders (
    id BIGSERIAL PRIMARY KEY,
    client_request_id VARCHAR(100) UNIQUE,                 -- Khóa chống bấm đặt hàng trùng 2 lần trên web
    user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,-- Khách hàng (nếu có đăng nhập) hoặc Thu ngân lập đơn
    customer_name VARCHAR(150),                            -- Tên khách nhận hàng
    customer_phone VARCHAR(20),                            -- SĐT khách (dùng để tra cứu đơn & tích điểm)
    delivery_address VARCHAR(255),                         -- Địa chỉ giao hàng tận nơi
    order_type VARCHAR(50) NOT NULL DEFAULT 'DINE_IN',     -- 'DINE_IN' (Tại bàn), 'TAKE_AWAY' (Mang về), 'DELIVERY' (Giao tận nơi)
    table_name VARCHAR(100),                               -- 'Bàn 01', 'Bàn 02'... (dành cho đơn DINE_IN)
    status VARCHAR(50) NOT NULL DEFAULT 'placed',          -- POS: 'PAID'/'UNPAID' | Online: 'placed','preparing','delivering','delivered','cancelled'
    payment_method VARCHAR(50) NOT NULL DEFAULT 'CASH',    -- 'cash', 'bank_transfer', 'wallet'
    payment_status VARCHAR(50) NOT NULL DEFAULT 'unpaid',  -- 'unpaid', 'pending', 'paid', 'expired'
    note VARCHAR(255),                                     -- Ghi chú của khách hoặc thu ngân
    subtotal NUMERIC(38, 2) NOT NULL DEFAULT 0.00,         -- Tiền món trước giảm giá
    delivery_fee NUMERIC(38, 2) NOT NULL DEFAULT 0.00,     -- Phí giao hàng
    discount NUMERIC(38, 2) NOT NULL DEFAULT 0.00,         -- Số tiền được giảm
    voucher_code VARCHAR(50),                              -- Mã voucher đã dùng (nếu có)
    total_amount NUMERIC(38, 2) NOT NULL DEFAULT 0.00,     -- Tổng thanh toán cuối cùng (= subtotal + delivery_fee - discount)
    create_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Bảng 10: Chi tiết từng ly nước / món trong hóa đơn
CREATE TABLE order_details (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_variant_id BIGINT NOT NULL REFERENCES product_variants(id),
    product_name VARCHAR(255),                             -- Tên món lúc bán
    size VARCHAR(50),                                      -- Cỡ ly lúc bán (Size S, M, L)
    quantity INT NOT NULL DEFAULT 1,
    price NUMERIC(38, 2) NOT NULL,                         -- Giá ly lúc bán
    note VARCHAR(255)                                      -- Ghi chú pha chế ("70% đường, ít đá")
);

-- Bảng 11: Chi tiết Topping kèm theo từng ly nước
CREATE TABLE order_detail_toppings (
    id BIGSERIAL PRIMARY KEY,
    order_detail_id BIGINT NOT NULL REFERENCES order_details(id) ON DELETE CASCADE,
    topping_id BIGINT REFERENCES toppings(id) ON DELETE SET NULL,
    topping_name VARCHAR(255),
    price NUMERIC(38, 2) NOT NULL,
    quantity INT NOT NULL DEFAULT 1
);

-- Bảng 12: Bảng nguyên nhiên liệu kiểm kho cuối ca (Bảng độc lập nội bộ quán)
CREATE TABLE ingredients (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    unit VARCHAR(50) NOT NULL,                             -- 'kg', 'hộp', 'lít', 'lon', 'cái'...
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 0.00,         -- Số lượng tồn đếm thực tế cuối ca
    min_quantity NUMERIC(10, 2) DEFAULT 0.00,              -- Định mức tối thiểu cảnh báo cần nhập
    note VARCHAR(255),                                     -- Ghi chú ca: "Đã mở 1 lon", "Hạn dùng 30/11"
    last_checked_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_checked_by VARCHAR(100)                           -- Nhân viên thực hiện kiểm ca
);

-- -----------------------------------------------------------------------------
-- PHẦN 3: TẠO CHỈ MỤC (INDEXES) TỐI ƯU TỐC ĐỘ TRUY VẤN
-- -----------------------------------------------------------------------------
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_variants_product ON product_variants(product_id);
CREATE INDEX idx_orders_customer_phone ON orders(customer_phone);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_create_at ON orders(create_at);
CREATE INDEX idx_order_details_order ON order_details(order_id);
CREATE INDEX idx_vouchers_code ON vouchers(code);
CREATE INDEX idx_cust_vouchers_phone ON customer_vouchers(customer_phone);

-- -----------------------------------------------------------------------------
-- PHẦN 4: DỮ LIỆU KHỞI TẠO MẪU (SEED DATA ĐẦY ĐỦ)
-- -----------------------------------------------------------------------------
-- Mật khẩu mặc định: 123456 (Băm BCrypt: $2a$10$BM/pG5g9tDuWvREVkVzz5ujM3dH21xW20is6GNyDd0uelQ5Cq.Lna)

-- A. Tài khoản Quản lý, Nhân viên và Khách hàng mẫu
INSERT INTO users (id, username, password, email, full_name, phone, address, role, order_count) VALUES
(1, 'admin', '$2a$10$BM/pG5g9tDuWvREVkVzz5ujM3dH21xW20is6GNyDd0uelQ5Cq.Lna', 'admin@poscafe.com', 'Chủ Quán / Quản Lý', '0901234567', 'Trụ sở chính Coffee Shop', 'ROLE_ADMIN', 0),
(2, 'lecongvu', '$2a$10$BM/pG5g9tDuWvREVkVzz5ujM3dH21xW20is6GNyDd0uelQ5Cq.Lna', 'lecongvu31032005@gmail.com', 'Lê Công Vũ', '0912345678', 'Quận 1, TP. Hồ Chí Minh', 'ROLE_ADMIN', 0),
(3, 'nhanvien1', '$2a$10$BM/pG5g9tDuWvREVkVzz5ujM3dH21xW20is6GNyDd0uelQ5Cq.Lna', 'thungan1@poscafe.com', 'Nguyễn Thị Thu Ngân', '0987654321', 'Quận 3, TP. Hồ Chí Minh', 'ROLE_STAFF', 0),
(4, 'khachhang1', '$2a$10$BM/pG5g9tDuWvREVkVzz5ujM3dH21xW20is6GNyDd0uelQ5Cq.Lna', 'khachhang@gmail.com', 'Trần Văn Hoàng (Khách VIP)', '0933445566', '45 Lê Duẩn, Phường Bến Nghé, TP. Hồ Chí Minh', 'ROLE_CUSTOMER', 48);

-- B. Danh mục thực đơn (Khớp hoàn toàn với Coffee Web)
INSERT INTO categories (id, name, description, image) VALUES
(1, 'Cà phê', 'Cà phê pha phin truyền thống và ủ lạnh thơm ngon đậm đà', '/images/products/ca-phe-sua-da.jpg'),
(2, 'Trà trái cây', 'Trà thanh nhiệt kết hợp trái cây tươi mát giải nhiệt', '/images/products/tra-dao.jpg'),
(3, 'Trà sữa', 'Trà sữa đậm vị trà, béo vị sữa chuẩn gu giới trẻ', '/images/products/tra-sua-tran-chau.jpg'),
(4, 'Đá xay', 'Đá xay mát lạnh kết hợp socola và kem béo ngậy', '/images/products/socola-da-xay.jpg'),
(5, 'Bánh ngọt', 'Bánh nướng bơ tỏi và bánh lạnh điểm tâm nhẹ nhàng', '/images/products/tiramisu.jpg'),
(6, 'Ăn nhẹ', 'Các món ăn vặt kèm theo vui miệng', '');

-- C. Món đồ uống & điểm tâm (Products)
INSERT INTO products (id, category_id, name, description, price, image_url, is_available) VALUES
(1, 1, 'Cà phê Sữa Đá', 'Cà phê phin đậm vị truyền thống kết hợp sữa đặc Ngôi Sao Phương Nam thơm béo.', 29000, '/images/products/ca-phe-sua-da.jpg', true),
(2, 1, 'Cà phê Đen Đá', 'Cà phê nguyên chất không đường, chuẩn gu đậm đà nguyên bản.', 25000, '', true),
(3, 1, 'Bạc Xỉu 3 Tầng', 'Nhiều sữa đặc ngọt dịu, ít cà phê hòa quyện cùng sữa tươi thanh trùng.', 29000, '/images/products/bac-xiu.jpg', true),
(4, 2, 'Trà Đào Cam Sả', 'Trà đen thơm lừng kết hợp đào miếng giòn ngọt, vị cam chua nhẹ và hương sả nồng nàn.', 45000, '/images/products/tra-dao.jpg', true),
(5, 2, 'Trà Vải Hoa Hồng', 'Trà xanh thanh mát hòa quyện trái vải mọng nước và hương hoa hồng quyến rũ.', 45000, '/images/products/tra-vai.jpg', true),
(6, 3, 'Trà Sữa Trân Châu', 'Trà đen truyền thống nấu cùng sữa béo thơm, sẵn sàng trân châu dai giòn.', 45000, '/images/products/tra-sua-tran-chau.jpg', true),
(7, 3, 'Trà Sữa Matcha Nhật Bản', 'Bột matcha Uji thượng hạng hòa quyện cùng sữa tươi nguyên kem béo ngậy.', 49000, '/images/products/tra-sua-matcha.jpg', true),
(8, 4, 'Socola Đá Xay', 'Socola nguyên chất đậm đà xay cùng đá tuyết và phủ lớp kem tươi bồng bềnh.', 55000, '/images/products/socola-da-xay.jpg', true),
(9, 5, 'Bánh Croissant Bơ Tỏi', 'Bánh sừng bò nướng giòn rụm với bơ Pháp thơm lừng nức mũi.', 28000, '/images/products/banh-sung-bo.jpg', true),
(10, 5, 'Bánh Tiramisu Cà Phê', 'Bánh kem phô mai Mascarpone mềm mịn đan xen hương vị cà phê espresso đặc trưng.', 39000, '/images/products/tiramisu.jpg', true);

-- D. Kích cỡ & Giá tiền tương ứng (Product Variants)
-- Đồ uống (1 -> 8): stock_quantity = NULL (pha chế theo ly)
-- Bánh ngọt (9, 10): stock_quantity = có số lượng cụ thể trong tủ đầu ca
INSERT INTO product_variants (id, product_id, size, price, stock_quantity) VALUES
(1, 1, 'Size M', 29000.00, NULL),
(2, 1, 'Size L', 35000.00, NULL),
(3, 2, 'Size M', 25000.00, NULL),
(4, 2, 'Size L', 30000.00, NULL),
(5, 3, 'Size M', 29000.00, NULL),
(6, 3, 'Size L', 35000.00, NULL),
(7, 4, 'Size M', 45000.00, NULL),
(8, 4, 'Size L', 51000.00, NULL),
(9, 5, 'Size M', 45000.00, NULL),
(10, 5, 'Size L', 51000.00, NULL),
(11, 6, 'Size M', 45000.00, NULL),
(12, 6, 'Size L', 51000.00, NULL),
(13, 7, 'Size M', 49000.00, NULL),
(14, 7, 'Size L', 55000.00, NULL),
(15, 8, 'Size M', 55000.00, NULL),
(16, 8, 'Size L', 62000.00, NULL),
(17, 9, 'Tiêu chuẩn', 28000.00, 20),                -- Bánh sừng bò: còn 20 cái đầu ca
(18, 10, 'Tiêu chuẩn', 39000.00, 15);               -- Bánh Tiramisu: còn 15 cái đầu ca

-- E. Topping gọi thêm (Toppings)
INSERT INTO toppings (id, name, price, is_available) VALUES
(1, 'Trân châu đường đen', 8000, true),
(2, 'Thạch trái cây giòn', 6000, true),
(3, 'Kem Phô Mai Cheese Foam', 10000, true),
(4, 'Pudding Trứng mềm mịn', 10000, true),
(5, 'Thạch Đào tươi', 12000, true);

-- F. Hệ thống chi nhánh cửa hàng (Stores)
INSERT INTO stores (id, name, province_name, ward_name, street, phone, opening_hours) VALUES
(1, 'Cà Phê Mẫu - Chi nhánh Nhà Thờ', 'TP. Hồ Chí Minh', 'Phường Bến Nghé', '10 Công Xã Paris, Quận 1', '02838221101', '07:00 – 22:30'),
(2, 'Cà Phê Mẫu - Chi nhánh Hồ Con Rùa', 'TP. Hồ Chí Minh', 'Phường Võ Thị Sáu', '42 Phạm Ngọc Thạch, Quận 3', '02838221102', '06:30 – 22:00'),
(3, 'Cà Phê Mẫu - Chi nhánh Phố Cổ', 'Hà Nội', 'Phường Hàng Trống', '15 Nhà Chung, Quận Hoàn Kiếm', '02439332201', '07:00 – 23:00'),
(4, 'Cà Phê Mẫu - Chi nhánh Bạch Đằng', 'Đà Nẵng', 'Phường Hải Châu 1', '88 Bạch Đằng, Quận Hải Châu', '02363889901', '06:30 – 22:30');

-- G. Kho Voucher khuyến mãi công khai (Vouchers)
INSERT INTO vouchers (id, code, title, description, type, value, max_discount, min_order, expires_at, is_active) VALUES
(1, 'CHAO10', 'Giảm 10% (tối đa 30.000 ₫)', 'Giảm 10% tổng giá trị đơn hàng cho khách trải nghiệm.', 'percent', 10, 30000, 50000, '2099-01-01 00:00:00', true),
(2, 'GIAM20K', 'Giảm trực tiếp 20.000 ₫', 'Giảm ngay 20.000 ₫ cho hóa đơn đặt đồ uống từ 100.000 ₫.', 'fixed', 20000, NULL, 100000, '2099-01-01 00:00:00', true),
(3, 'FREESHIP', 'Miễn phí giao hàng tận nhà', 'Miễn phí vận chuyển cho đơn hàng giao tận nơi từ 80.000 ₫.', 'freeship', 0, NULL, 80000, '2099-01-01 00:00:00', true),
(4, 'COMBO15', 'Giảm 15% (tối đa 50.000 ₫)', 'Ưu đãi đặt tiệc nhóm, giảm 15% cho đơn từ 150.000 ₫.', 'percent', 15, 50000, 150000, '2099-01-01 00:00:00', true);

-- H. Voucher thưởng tích điểm mẫu (Khách 0933445566 đã tích lũy và được tặng)
INSERT INTO customer_vouchers (id, customer_phone, voucher_code, title, discount_amount, is_used, expires_at) VALUES
(1, '0933445566', 'VIP50_0933445566', 'Tri ân khách quen 50 đơn - Giảm 50.000 ₫', 50000.00, false, '2099-01-01 00:00:00');

-- I. Danh mục nguyên nhiên liệu kiểm kê kho cuối ca (Ingredients)
INSERT INTO ingredients (id, name, unit, quantity, min_quantity, note, last_checked_by) VALUES
(1, 'Hạt cà phê Robusta rang mộc', 'kg', 15.5, 5.0, 'Bao mới nhập đầu tuần, chất lượng tốt', 'nhanvien1'),
(2, 'Hạt cà phê Arabica Cầu Đất', 'kg', 8.2, 3.0, 'Đang dùng bao số 2', 'nhanvien1'),
(3, 'Sữa đặc Ngôi Sao Phương Nam (Lon 1.284kg)', 'lon', 24.0, 6.0, 'Đầy đủ trong kho mát', 'nhanvien1'),
(4, 'Sữa tươi tiệt trùng không đường Barista', 'hộp', 36.0, 10.0, 'Hạn sử dụng còn 4 tháng', 'nhanvien1'),
(5, 'Bột trà xanh Matcha Nhật Bản Uji', 'gói', 4.5, 1.0, 'Đã khui 1 gói 500g', 'nhanvien1'),
(6, 'Trà đen Oolong nướng hảo hạng', 'kg', 6.0, 2.0, 'Mùi thơm đậm đà', 'nhanvien1'),
(7, 'Đường cát trắng Biên Hòa', 'kg', 25.0, 5.0, 'Bao 50kg còn nửa bao', 'nhanvien1'),
(8, 'Bột béo thực vật B One', 'gói', 12.0, 3.0, 'Nguyên thùng chưa mở', 'nhanvien1'),
(9, 'Siro Đào Teisseire', 'chai', 5.0, 2.0, 'Đã mở 1 chai', 'nhanvien1'),
(10, 'Ly nhựa nắp cầu 500ml (Size M)', 'cái', 350.0, 100.0, 'Đủ dùng 3 ngày tới', 'nhanvien1'),
(11, 'Ly nhựa nắp cầu 700ml (Size L)', 'cái', 280.0, 100.0, 'Đủ dùng 3 ngày tới', 'nhanvien1'),
(12, 'Ống hút giấy bọc màng', 'cái', 500.0, 150.0, 'Còn 1 bịch lớn', 'nhanvien1');

-- Đặt lại giá trị lớn nhất cho tất cả các sequence tự tăng
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));
SELECT setval('categories_id_seq', (SELECT MAX(id) FROM categories));
SELECT setval('products_id_seq', (SELECT MAX(id) FROM products));
SELECT setval('product_variants_id_seq', (SELECT MAX(id) FROM product_variants));
SELECT setval('toppings_id_seq', (SELECT MAX(id) FROM toppings));
SELECT setval('stores_id_seq', (SELECT MAX(id) FROM stores));
SELECT setval('vouchers_id_seq', (SELECT MAX(id) FROM vouchers));
SELECT setval('customer_vouchers_id_seq', (SELECT MAX(id) FROM customer_vouchers));
SELECT setval('ingredients_id_seq', (SELECT MAX(id) FROM ingredients));
