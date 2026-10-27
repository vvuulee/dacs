package com.laptopstore.backend.service;

import com.laptopstore.backend.entity.Category;
import com.laptopstore.backend.entity.Product;
import com.laptopstore.backend.entity.ProductVariant;
import com.laptopstore.backend.repository.CategoryRepository;
import com.laptopstore.backend.repository.ProductRepository;
import com.laptopstore.backend.repository.ProductVariantRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
public class ProductService {

    private final ProductRepository productRepository;
    private final ProductVariantRepository productVariantRepository;
    private final CategoryRepository categoryRepository;

    public ProductService(ProductRepository productRepository,
            ProductVariantRepository productVariantRepository,
            CategoryRepository categoryRepository) {
        this.productRepository = productRepository;
        this.productVariantRepository = productVariantRepository;
        this.categoryRepository = categoryRepository;
    }

    public List<Product> getAllProducts() {
        List<Product> products = productRepository.findAll();
        for (Product p : products) {
            p.setVariants(productVariantRepository.findByProductId(p.getId()));
        }
        return products;
    }

    public Product getProductById(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy món với ID: " + id));
        product.setVariants(productVariantRepository.findByProductId(id));
        return product;
    }

    @Transactional
    public Product createProduct(Product product) {
        // 1. Xử lý Category (Danh mục đồ uống / bánh ngọt)
        resolveCategory(product);

        if (product.getIsAvailable() == null) {
            product.setIsAvailable(true);
        }

        // 2. Lưu thông tin chung của món
        List<ProductVariant> incomingVariants = product.getVariants();
        Product savedProduct = productRepository.save(product);

        // 3. Lưu danh sách Size (S, M, L) & giá tiền vào bảng product_variants
        saveVariantsForProduct(savedProduct, incomingVariants);

        savedProduct.setVariants(productVariantRepository.findByProductId(savedProduct.getId()));
        return savedProduct;
    }

    @Transactional
    public Product updateProduct(Long id, Product productDetails) {
        Product existingProduct = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy món với ID: " + id));

        existingProduct.setName(productDetails.getName());
        if (productDetails.getIsAvailable() != null) {
            existingProduct.setIsAvailable(productDetails.getIsAvailable());
        }
        existingProduct.setImageUrl(productDetails.getImageUrl());
        existingProduct.setPrice(productDetails.getPrice());

        if (productDetails.getCategory() != null) {
            existingProduct.setCategory(productDetails.getCategory());
            resolveCategory(existingProduct);
        }

        Product updatedProduct = productRepository.save(existingProduct);

        // Cập nhật danh sách Size (S, M, L) & giá tiền
        if (productDetails.getVariants() != null && !productDetails.getVariants().isEmpty()) {
            // Xóa các size cũ của món này và lưu lại danh sách size mới để tránh trùng lặp
            List<ProductVariant> oldVariants = productVariantRepository.findByProductId(id);
            if (oldVariants != null && !oldVariants.isEmpty()) {
                productVariantRepository.deleteAll(oldVariants);
            }
            saveVariantsForProduct(updatedProduct, productDetails.getVariants());
        }

        updatedProduct.setVariants(productVariantRepository.findByProductId(updatedProduct.getId()));
        return updatedProduct;
    }

    @Transactional
    public void deleteProduct(Long id) {
        List<ProductVariant> variants = productVariantRepository.findByProductId(id);
        if (variants != null && !variants.isEmpty()) {
            productVariantRepository.deleteAll(variants);
        }
        productRepository.deleteById(id);
    }

    private void resolveCategory(Product product) {
        Category cat = product.getCategory();
        if (cat == null)
            return;

        if (cat.getId() != null) {
            Category found = categoryRepository.findById(cat.getId()).orElse(null);
            if (found != null) {
                product.setCategory(found);
                return;
            }
        }

        if (cat.getName() != null && !cat.getName().trim().isEmpty()) {
            Category existing = categoryRepository.findAll().stream()
                    .filter(c -> cat.getName().trim().equalsIgnoreCase(c.getName()))
                    .findFirst()
                    .orElseGet(() -> {
                        Category newCat = new Category();
                        newCat.setName(cat.getName().trim());
                        return categoryRepository.save(newCat);
                    });
            product.setCategory(existing);
        }
    }

    private void saveVariantsForProduct(Product product, List<ProductVariant> variants) {
        if (variants == null || variants.isEmpty()) {
            // Nếu không truyền Size nào, tự động tạo Size M tiêu chuẩn
            ProductVariant defaultVariant = new ProductVariant();
            defaultVariant.setProduct(product);
            defaultVariant.setSize("Size M");
            defaultVariant.setColor("Size M");
            defaultVariant.setPrice(BigDecimal.valueOf(product.getPrice() != null ? product.getPrice() : 0));
            defaultVariant.setStockQuantity(100);
            defaultVariant.setImageUrl(product.getImageUrl());
            productVariantRepository.save(defaultVariant);
            return;
        }

        for (ProductVariant v : variants) {
            ProductVariant variantToSave = new ProductVariant();
            variantToSave.setProduct(product);

            // Ưu tiên lấy size, nếu chưa có thì lấy từ color (tương thích cả 2 chiều)
            String variantSize = (v.getSize() != null && !v.getSize().isBlank())
                    ? v.getSize()
                    : ((v.getColor() != null && !v.getColor().isBlank()) ? v.getColor() : "Size M");

            variantToSave.setSize(variantSize);
            variantToSave.setColor(variantSize);
            variantToSave.setStockQuantity(v.getStockQuantity() != null ? v.getStockQuantity() : 100);
            variantToSave.setPrice(v.getPrice() != null
                    ? v.getPrice()
                    : BigDecimal.valueOf(product.getPrice() != null ? product.getPrice() : 0));
            variantToSave.setImageUrl(v.getImageUrl() != null && !v.getImageUrl().isBlank()
                    ? v.getImageUrl()
                    : product.getImageUrl());

            productVariantRepository.save(variantToSave);
        }
    }
}