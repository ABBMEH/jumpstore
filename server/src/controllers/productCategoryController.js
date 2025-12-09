const ProductCategory = require("../models/ProductCategory");
const path = require("path");
const fs = require("fs").promises;

// Récupère toutes les catégories
const getAllProductCategories = async (req, res) => {
  try {
    const productCategories = await ProductCategory.findAll();
    res.json(productCategories);
  } catch (err) {
    console.error("Error in getAllProductCategories:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// Récupère les catégories pour la navbar
const getNavbarCategories = async (req, res) => {
  try {
    const categories = await ProductCategory.findNavbarCategories();
    res.json(categories);
  } catch (err) {
    console.error("Error in getNavbarCategories:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// Récupère les catégories pour la page d'accueil
const getHomepageCategories = async (req, res) => {
  try {
    const categories = await ProductCategory.findHomepageCategories();
    res.json(categories);
  } catch (err) {
    console.error("Error in getHomepageCategories:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// Récupère une catégorie par son ID
const getProductCategoryById = async (req, res) => {
  try {
    const productCategory = await ProductCategory.findById(req.params.id);
    res.json(productCategory);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
};

// Crée une nouvelle catégorie
const createProductCategory = async (req, res) => {
  try {
    const { name, url_text, parent_id, show_on_navbar, show_on_home, is_active, order } = req.body;
    if (!name || !url_text || !order) {
      return res.status(400).json({ error: "Nom, url_text et ordre requis" });
    }
    const isActive = is_active === "true" || is_active === true;
    const showOnNavbar = show_on_navbar === "true" || show_on_navbar === true;
    const showOnHome = show_on_home === "true" || show_on_home === true;
    const orderNum = parseInt(order);
    if (isNaN(orderNum) || orderNum < 0) {
      return res.status(400).json({ error: "L'ordre doit être un nombre positif" });
    }
    let image_url = null;
    if (req.file) {
      image_url = `/Uploads/product-categories/${req.file.filename}`;
    }
    const productCategory = await ProductCategory.create({
      name,
      url_text,
      parent_id: parent_id || null,
      show_on_navbar: showOnNavbar,
      show_on_home: showOnHome,
      is_active: isActive,
      order: orderNum,
      image_url,
    });
    res.status(201).json({
      message: "Catégorie créée avec succès",
      productCategory,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Met à jour une catégorie existante
const updateProductCategory = async (req, res) => {
  try {
    const { name, url_text, parent_id, show_on_navbar, show_on_home, is_active, order, image_url } = req.body;
    if (!name || !url_text || !order) {
      return res.status(400).json({ error: "Nom, url_text et ordre requis" });
    }
    const isActive = is_active === "true" || is_active === true;
    const showOnNavbar = show_on_navbar === "true" || show_on_navbar === true;
    const showOnHome = show_on_home === "true" || show_on_home === true;
    const orderNum = parseInt(order);
    if (isNaN(orderNum) || orderNum < 0) {
      return res.status(400).json({ error: "L'ordre doit être un nombre positif" });
    }
    let finalImageUrl = image_url;
    if (req.file) {
      const existingCategory = await ProductCategory.findById(req.params.id);
      if (existingCategory.image_url) {
        const oldImagePath = path.join(__dirname, "../../", existingCategory.image_url);
        await fs.unlink(oldImagePath);
      }
      finalImageUrl = `/Uploads/product-categories/${req.file.filename}`;
    }
    const productCategory = await ProductCategory.update(req.params.id, {
      name,
      url_text,
      parent_id: parent_id || null,
      show_on_navbar: showOnNavbar,
      show_on_home: showOnHome,
      is_active: isActive,
      order: orderNum,
      image_url: finalImageUrl,
    });
    res.json({ message: "Catégorie mise à jour", productCategory });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Supprime une catégorie
const deleteProductCategory = async (req, res) => {
  try {
    const existingCategory = await ProductCategory.findById(req.params.id);
    if (existingCategory.image_url) {
      const imagePath = path.join(__dirname, "../../", existingCategory.image_url);
      await fs.unlink(imagePath);
    }
    await ProductCategory.delete(req.params.id);
    res.json({ message: "Catégorie supprimée" });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
};

module.exports = {
  getAllProductCategories,
  getNavbarCategories,
  getHomepageCategories,
  getProductCategoryById,
  createProductCategory,
  updateProductCategory,
  deleteProductCategory,
};