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
                .orElseThrow(() -> new RuntimeException("Không tìm thấy sản phẩm với ID: " + id));
        product.setVariants(productVariantRepository.findByProductId(id));
        return product;
    }

    @Transactional
    public Product createProduct(Product product) {
        // 1. Xử lý Category (Dòng laptop)
        resolveCategory(product);

        // 2. Lưu thông tin chung của Laptop
        List<ProductVariant> incomingVariants = product.getVariants();
        Product savedProduct = productRepository.save(product);

        // 3. Lưu danh sách màu sắc & số lượng tồn kho vào bảng product_variants
        saveVariantsForProduct(savedProduct, incomingVariants);

        savedProduct.setVariants(productVariantRepository.findByProductId(savedProduct.getId()));
        return savedProduct;
    }

    @Transactional
    public Product updateProduct(Long id, Product productDetails) {
        Product existingProduct = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy sản phẩm với ID: " + id));

        existingProduct.setName(productDetails.getName());
        existingProduct.setCpu(productDetails.getCpu());
        existingProduct.setRamGb(productDetails.getRamGb());
        existingProduct.setStorageGb(productDetails.getStorageGb());
        existingProduct.setVga(productDetails.getVga());
        existingProduct.setScreenSize(productDetails.getScreenSize());
        existingProduct.setImageUrl(productDetails.getImageUrl());
        existingProduct.setPrice(productDetails.getPrice());

        if (productDetails.getCategory() != null) {
            existingProduct.setCategory(productDetails.getCategory());
            resolveCategory(existingProduct);
        }

        Product updatedProduct = productRepository.save(existingProduct);

        // Cập nhật danh sách màu sắc & số lượng
        if (productDetails.getVariants() != null && !productDetails.getVariants().isEmpty()) {
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
            // Nếu không truyền biến thể nào, tạo 1 biến thể mặc định để khách vẫn mua được
            ProductVariant defaultVariant = new ProductVariant();
            defaultVariant.setProduct(product);
            defaultVariant.setColor("Tiêu chuẩn");
            defaultVariant.setPrice(BigDecimal.valueOf(product.getPrice() != null ? product.getPrice() : 0));
            defaultVariant.setStockQuantity(10);
            defaultVariant.setImageUrl(product.getImageUrl());
            productVariantRepository.save(defaultVariant);
            return;
        }

        for (ProductVariant v : variants) {
            ProductVariant variantToSave;
            if (v.getId() != null) {
                variantToSave = productVariantRepository.findById(v.getId()).orElse(new ProductVariant());
            } else {
                variantToSave = new ProductVariant();
            }

            variantToSave.setProduct(product);
            variantToSave.setColor(v.getColor() != null && !v.getColor().isBlank() ? v.getColor() : "Tiêu chuẩn");
            variantToSave.setStockQuantity(v.getStockQuantity() != null ? v.getStockQuantity() : 0);
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