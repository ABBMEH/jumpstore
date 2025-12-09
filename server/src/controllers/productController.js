const Product = require("../models/product");
const ProductPicture = require("../models/ProductPicture");
const ProductVariant = require("../models/ProductVariant");
const Size = require("../models/Size");
const { pool } = require("../utils/db");

// Récupère tous les produits avec leurs détails
const getAllProducts = async (req, res) => {
  try {
    const products = await Product.findAllWithDetails();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Récupère tous les produits actifs avec du stock
const getAllActiveProducts = async (req, res) => {
  try {
    const products = await Product.findAllActiveWithStock();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Récupère tous les produits pour l'administration
const getAllProductsAdmin = async (req, res) => {
  try {
    const products = await Product.findAllWithDetails();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Récupère un produit spécifique par son ID
const getProductById = async (req, res) => {
  try {
    const product = await Product.findByIdWithDetails(req.params.id);
    res.json(product);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
};

// Récupère les produits par catégorie
const getProductsByCategory = async (req, res) => {
  try {
    const { url_text } = req.params;
    let products;
    if (url_text === "soldes") {
      products = await Product.findSoldes();
    } else {
      products = await Product.findByCategoryUrlText(url_text);
    }
    res.json(products);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
};

// Récupère les produits par catégorie principale ou sous-catégories
const getProductsByCategoryOrSubcategories = async (req, res) => {
  try {
    const { category, subcategories } = req.body;

    // Convertir les sous-catégories en liste
    const subcategoryArray = subcategories
      ? typeof subcategories === 'string'
        ? subcategories.split(',').map(s => s.trim()).filter(s => s !== '')
        : Array.isArray(subcategories)
        ? subcategories.filter(s => s && typeof s === 'string' && s.trim() !== '')
        : []
      : [];

    let products = [];

    // Cas 1: Catégorie et sous-catégories fournies
    if (category && subcategoryArray.length > 0) {
      products = await Product.findBySubcategoryNamesWithParent(subcategoryArray, category);
    }
    // Cas 2: Seulement catégorie fournie
    else if (category) {
      products = await Product.findByCategoryNames(category);
    }
    // Cas 3: Seulement sous-catégories fournies
    else if (subcategoryArray.length > 0) {
      products = await Product.findBySubcategoryNames(subcategoryArray);
    }
    // Cas 4: Aucun filtre, récupérer tous les produits
    else {
      products = await Product.findAllWithDetails();
    }

    // Supprimer les doublons
    const uniqueProducts = Array.from(
      new Map(products.map(product => [product.id, product])).values()
    );

    res.status(200).json(uniqueProducts);
  } catch (err) {
    console.error("Error in getProductsByCategoryOrSubcategories:", {
      message: err.message,
      stack: err.stack,
      requestBody: req.body
    });
    res.status(500).json({ error: err.message });
  }
};

// Crée un nouveau produit
const createProduct = async (req, res) => {
  try {
    const {
      name,
      url_text,
      description,
      price,
      promo_price,
      is_used,
      cost,
      barcode,
      category_ids,
      brand_id,
      size_type_id,
      is_active,
      is_highlight,
      weight,
      variants,
    } = req.body;

    let parsedVariants = variants;
    if (typeof variants === "string") {
      try {
        parsedVariants = JSON.parse(variants);
      } catch (error) {
        return res.status(400).json({ error: "Le champ variants n'est pas un JSON valide" });
      }
    }

    // Parse category_ids si c'est un string
    let parsedCategoryIds = category_ids;
    if (typeof category_ids === "string") {
      try {
        parsedCategoryIds = JSON.parse(category_ids);
      } catch (error) {
        return res.status(400).json({ error: "Le champ category_ids n'est pas un JSON valide" });
      }
    }

    if (!name || !url_text || !price || !size_type_id) {
      return res.status(400).json({ error: "Les champs name, url_text, price et size_type_id sont requis" });
    }

    if (!parsedVariants || !Array.isArray(parsedVariants)) {
      return res.status(400).json({ error: "Le champ variants doit être un tableau" });
    }

    if (!parsedCategoryIds || !Array.isArray(parsedCategoryIds)) {
      return res.status(400).json({ error: "Le champ category_ids doit être un tableau" });
    }

    try {
      await Size.findBySizeType(size_type_id);
    } catch (error) {
      return res.status(400).json({ error: `Le size_type_id ${size_type_id} n'existe pas` });
    }

    const validSizes = await Size.findBySizeType(size_type_id);
    const validSizeIds = validSizes.map((size) => size.id);
    for (const variant of parsedVariants) {
      if (!variant.size_id || typeof variant.stock_quantity !== "number" || variant.stock_quantity < 0) {
        return res.status(400).json({ error: "Chaque variante doit avoir un size_id et un stock_quantity valide" });
      }
      if (!validSizeIds.includes(parseInt(variant.size_id))) {
        return res.status(400).json({ error: `size_id ${variant.size_id} n'est pas valide pour le type de taille sélectionné` });
      }
    }

    const pictures = req.files && req.files['p-pictures'] ? req.files['p-pictures'] : [];
    const product = await Product.create({
      name,
      url_text,
      description,
      price,
      promo_price: promo_price || null,
      is_used: is_used || false,
      cost: cost || null,
      barcode: barcode || null,
      category_ids: parsedCategoryIds,
      brand_id: brand_id || null,
      size_type_id: size_type_id || null,
      is_active: is_active !== undefined ? is_active : true,
      is_highlight: is_highlight || false,
      weight: weight || null,
    });

    for (const variant of parsedVariants) {
      await ProductVariant.create({
        product_id: product.id,
        size_id: variant.size_id,
        stock_quantity: variant.stock_quantity,
        reserved_quantity: 0,
      });
    }

    for (let i = 0; i < pictures.length; i++) {
      await ProductPicture.create({
        product_id: product.id,
        image_url: `/Uploads/products/${pictures[i].filename}`,
        alt_text: pictures[i].originalname,
        display_order: i,
      });
    }

    const productWithDetails = await Product.findByIdWithDetails(product.id);
    res.status(201).json({
      message: "Produit créé avec succès",
      product: productWithDetails,
    });
  } catch (err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: `Multer error: ${err.message}` });
    }
    res.status(400).json({ error: err.message });
  }
};

// Met à jour un produit existant
const updateProduct = async (req, res) => {
  try {
    const {
      name,
      url_text,
      description,
      price,
      promo_price,
      is_used,
      cost,
      barcode,
      category_ids,
      brand_id,
      size_type_id,
      is_active,
      is_highlight,
      weight,
      variants,
    } = req.body;

    let parsedVariants = null;
    if (variants) {
      parsedVariants = typeof variants === "string" ? JSON.parse(variants) : variants;
      if (!Array.isArray(parsedVariants)) {
        return res.status(400).json({ error: "Le champ variants doit être un tableau" });
      }
    }

    // Parse category_ids si c'est un string
    let parsedCategoryIds = category_ids;
    if (typeof category_ids === "string") {
      try {
        parsedCategoryIds = JSON.parse(category_ids);
      } catch (error) {
        return res.status(400).json({ error: "Le champ category_ids n'est pas un JSON valide" });
      }
    }

    if (parsedCategoryIds && !Array.isArray(parsedCategoryIds)) {
      return res.status(400).json({ error: "Le champ category_ids doit être un tableau" });
    }

    // Vérifier que size_type_id existe en base
    if (size_type_id) {
      try {
        await Size.findBySizeType(size_type_id);
      } catch (error) {
        return res.status(400).json({ error: `Le size_type_id ${size_type_id} n'existe pas` });
      }
    }

    const product = await Product.update(req.params.id, {
      name,
      url_text,
      description,
      price,
      promo_price,
      is_used,
      cost,
      barcode,
      category_ids: parsedCategoryIds,
      brand_id,
      size_type_id,
      is_active,
      is_highlight,
      weight,
    });

    if (parsedVariants) {
      const finalSizeTypeId = size_type_id || (await Product.findById(req.params.id)).size_type_id;
      if (!finalSizeTypeId) {
        return res.status(400).json({ error: "Aucun size_type_id spécifié pour le produit" });
      }
      const validSizes = await Size.findBySizeType(finalSizeTypeId);
      const validSizeIds = validSizes.map((size) => size.id);
      for (const variant of parsedVariants) {
        if (!variant.size_id || typeof variant.stock_quantity !== "number" || variant.stock_quantity < 0) {
          return res.status(400).json({ error: "Chaque variante doit avoir un size_id et un stock_quantity valide" });
        }
        if (!validSizeIds.includes(parseInt(variant.size_id))) {
          return res.status(400).json({ error: `size_id ${variant.size_id} n'est pas valide pour le type de taille sélectionné` });
        }
      }
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await ProductVariant.deleteByProductId(req.params.id);
        for (const variant of parsedVariants) {
          await ProductVariant.create({
            product_id: req.params.id,
            size_id: variant.size_id,
            stock_quantity: variant.stock_quantity,
            reserved_quantity: 0,
          });
        }
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    }

    const pictures = req.files && req.files['p-pictures'] ? req.files['p-pictures'] : [];
    if (pictures.length > 0) {
      await ProductPicture.deleteByProductId(req.params.id);
      for (let i = 0; i < pictures.length; i++) {
        await ProductPicture.create({
          product_id: req.params.id,
          image_url: `/Uploads/products/${pictures[i].filename}`,
          alt_text: pictures[i].originalname,
          display_order: i,
        });
      }
    }

    const productWithDetails = await Product.findByIdWithDetails(req.params.id);
    res.json({ message: "Produit mis à jour", product: productWithDetails });
  } catch (err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: `Multer error: ${err.message}` });
    }
    res.status(400).json({ error: err.message });
  }
};

// Supprime un produit
const deleteProduct = async (req, res) => {
  try {
    await Product.delete(req.params.id);
    res.json({ message: "Produit supprimé" });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
};

module.exports = {
  getAllProducts,
  getAllActiveProducts,
  getAllProductsAdmin,
  getProductById,
  getProductsByCategory,
  getProductsByCategoryOrSubcategories,
  createProduct,
  updateProduct,
  deleteProduct,
};