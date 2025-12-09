const express = require("express");
const productController = require("../controllers/productController");
const brandController = require("../controllers/brandController");
const productCategoryController = require("../controllers/productCategoryController");
const sizeTypeController = require("../controllers/sizeTypeController");
const sizeController = require("../controllers/sizeController");
const { authMiddleware, adminMiddleware } = require("../middleware/authMiddleware");
const { brandFileUpload, productFileUpload, productCategoryFileUpload } = require("../middleware/multerMiddleware");
const router = express.Router();

// Routes pour gérer les marques
router.get("/brands", brandController.getAllBrands);
router.get("/brands/navbar", brandController.getNavbarBrands);
router.get("/brands/homepage", brandController.getHomepageBrands);
router.get("/brands/:id", brandController.getBrandById);
router.post("/brands", authMiddleware, adminMiddleware, brandFileUpload, brandController.createBrand);
router.put("/brands/:id", authMiddleware, adminMiddleware, brandFileUpload, brandController.updateBrand);
router.delete("/brands/:id", authMiddleware, adminMiddleware, brandController.deleteBrand);

// Routes pour gérer les types de tailles
router.get("/size-types", sizeTypeController.getAllSizeTypes);
router.get("/size-types/:id", sizeTypeController.getSizeTypeById);
router.post("/size-types", authMiddleware, adminMiddleware, sizeTypeController.createSizeType);
router.put("/size-types/:id", authMiddleware, adminMiddleware, sizeTypeController.updateSizeType);
router.delete("/size-types/:id", authMiddleware, adminMiddleware, sizeTypeController.deleteSizeType);

// Routes pour gérer les tailles
router.get("/sizes", sizeController.getAllSizes);
router.get("/sizes/size-type/:sizeTypeId", sizeController.getSizesBySizeType);
router.get("/sizes/:id", sizeController.getSizeById);
router.post("/sizes", authMiddleware, adminMiddleware, sizeController.createSize);
router.put("/sizes/:id", authMiddleware, adminMiddleware, sizeController.updateSize);
router.delete("/sizes/:id", authMiddleware, adminMiddleware, sizeController.deleteSize);

// Routes pour gérer les catégories
router.get("/product-categories", productCategoryController.getAllProductCategories);
router.get("/product-categories/navbar", productCategoryController.getNavbarCategories);
router.get("/product-categories/homepage", productCategoryController.getHomepageCategories);
router.get("/product-categories/:id", productCategoryController.getProductCategoryById);
router.post("/product-categories", authMiddleware, adminMiddleware, productCategoryFileUpload, productCategoryController.createProductCategory);
router.put("/product-categories/:id", authMiddleware, adminMiddleware, productCategoryFileUpload, productCategoryController.updateProductCategory);
router.delete("/product-categories/:id", authMiddleware, adminMiddleware, productCategoryController.deleteProductCategory);

// Routes pour gérer les produits
router.get("/products", productController.getAllActiveProducts);
router.get("/products/all", authMiddleware, adminMiddleware, productController.getAllProductsAdmin);
router.get("/products/:id", productController.getProductById);
router.get("/products/category/:url_text", productController.getProductsByCategory);
router.post("/products/filter", productController.getProductsByCategoryOrSubcategories);
router.post("/products", authMiddleware, adminMiddleware, productFileUpload, productController.createProduct);
router.put("/products/:id", authMiddleware, adminMiddleware, productFileUpload, productController.updateProduct);
router.delete("/products/:id", authMiddleware, adminMiddleware, productController.deleteProduct);

module.exports = router;