const Brand = require("../models/Brand");
const BrandPicture = require("../models/BrandPicture");
const path = require("path");
const fs = require("fs").promises;

// Récupère toutes les marques avec leurs images
exports.getAllBrands = async (req, res) => {
  try {
    const brands = await Brand.findAllWithPictures();
    res.json(brands);
  } catch (err) {
    res.status(500).json({ error: "Erreur lors de la récupération des marques: " + err.message });
  }
};

// Récupère les marques pour la navbar
exports.getNavbarBrands = async (req, res) => {
  try {
    const brands = await Brand.findNavbarBrands();
    res.json(brands);
  } catch (err) {
    res.status(500).json({ error: "Erreur lors de la récupération des marques de la navbar: " + err.message });
  }
};

// Récupère les marques pour la page d'accueil
exports.getHomepageBrands = async (req, res) => {
  try {
    const brands = await Brand.findHomepageBrands();
    res.json(brands);
  } catch (err) {
    res.status(500).json({ error: "Erreur lors de la récupération des marques de la page d'accueil: " + err.message });
  }
};

// Récupère une marque spécifique par son ID
exports.getBrandById = async (req, res) => {
  try {
    const brand = await Brand.findByIdWithPictures(req.params.id);
    if (!brand) {
      return res.status(404).json({ error: "Marque non trouvée" });
    }
    res.json(brand);
  } catch (err) {
    res.status(404).json({ error: "Marque non trouvée: " + err.message });
  }
};

// Crée une nouvelle marque
exports.createBrand = async (req, res) => {
  try {
    const { name, url_text, description, show_on_navbar, show_on_home, is_active } = req.body;

    // Validation des champs requis
    if (!name?.trim() || !url_text?.trim()) {
      return res.status(400).json({ error: "Nom et URL texte sont requis" });
    }

    const showOnNavbar = show_on_navbar === "true" || show_on_navbar === true;
    const showOnHome = show_on_home === "true" || show_on_home === true;
    const isActive = is_active === "true" || is_active === true;

    // Gestion de l'upload du logo (max 1)
    const logoFile = req.files && req.files.logo ? req.files.logo[0] : null;
    if (req.files && req.files.logo && req.files.logo.length > 1) {
      return res.status(400).json({ error: "Un seul logo est autorisé" });
    }
    const logoPath = logoFile ? `/Uploads/logos/${logoFile.filename}` : null;

    // Validation des images (max 10)
    const pictures = req.files && req.files.pictures ? req.files.pictures : [];
    if (pictures.length > 10) {
      return res.status(400).json({ error: "Maximum 10 images autorisées pour les brandpictures" });
    }

    // Création de la marque
    const brand = await Brand.create({
      name: name.trim(),
      url_text: url_text.trim(),
      description: description?.trim() || null,
      logo_url: logoPath,
      show_on_navbar: showOnNavbar,
      show_on_home: showOnHome,
      is_active: isActive,
    });

    // Ajout des images de la marque
    for (let i = 0; i < pictures.length; i++) {
      await BrandPicture.create({
        brand_id: brand.id,
        image_url: `/Uploads/brands/${pictures[i].filename}`,
        image_type: req.body.image_types ? req.body.image_types[i]?.trim() || "general" : "general",
        alt_text: req.body.alt_texts ? req.body.alt_texts[i]?.trim() || `${name.trim()} image ${i + 1}` : `${name.trim()} image ${i + 1}`,
        display_order: req.body.display_orders ? parseInt(req.body.display_orders[i]) || i : i,
      });
    }

    // Retourne la marque avec ses images
    const brandWithPictures = await Brand.findByIdWithPictures(brand.id);
    res.status(201).json({
      message: "Marque créée avec succès",
      brand: brandWithPictures,
    });
  } catch (err) {
    res.status(400).json({
      error: err.message.includes("Nom ou URL texte déjà utilisé")
        ? err.message
        : "Erreur lors de la création de la marque: " + err.message,
    });
  }
};

// Met à jour une marque existante
exports.updateBrand = async (req, res) => {
  try {
    const { name, url_text, description, show_on_navbar, show_on_home, is_active } = req.body;

    // Validation des champs requis
    if (!name?.trim() || !url_text?.trim()) {
      return res.status(400).json({ error: "Nom et URL texte sont requis" });
    }

    const showOnNavbar = show_on_navbar !== undefined ? (show_on_navbar === "true" || show_on_navbar === true) : undefined;
    const showOnHome = show_on_home !== undefined ? (show_on_home === "true" || show_on_home === true) : undefined;
    const isActive = is_active !== undefined ? (is_active === "true" || is_active === true) : undefined;

    const existingBrand = await Brand.findById(req.params.id);
    if (!existingBrand) {
      return res.status(404).json({ error: "Marque non trouvée" });
    }

    // Gestion de l'upload du logo (max 1)
    const logoFile = req.files && req.files.logo ? req.files.logo[0] : null;
    if (req.files && req.files.logo && req.files.logo.length > 1) {
      return res.status(400).json({ error: "Un seul logo est autorisé" });
    }
    let logoPath = existingBrand.logo_url;
    if (logoFile) {
      // on supprime l'ancien logo
      if (existingBrand.logo_url) {
        const oldLogoPath = path.join(__dirname, "../../", existingBrand.logo_url);
        await fs.unlink(oldLogoPath);
      }
      logoPath = `/Uploads/logos/${logoFile.filename}`;
    }

    // suppression des images
    const deletePictureIds = req.body.delete_picture_ids ? req.body.delete_picture_ids.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id)) : [];
    if (deletePictureIds.length > 0) {
      for (const pictureId of deletePictureIds) {
        const picture = await BrandPicture.findById(pictureId);
        if (picture && picture.brand_id === parseInt(req.params.id)) {
          const picturePath = path.join(__dirname, "../../", picture.image_url);
          await fs.unlink(picturePath);
          await BrandPicture.delete(pictureId);
        }
      }
    }

    // Validation des images (max 10 images)
    const pictures = req.files && req.files.pictures ? req.files.pictures : [];
    if (pictures.length > 10) {
      return res.status(400).json({ error: "Maximum 10 images autorisées pour les brandpictures" });
    }

    // Mise à jour de la marque (préservation de l'ancien logo autrement)
    const brand = await Brand.update(req.params.id, {
      name: name.trim(),
      url_text: url_text.trim(),
      description: description?.trim() || null,
      logo_url: logoPath,
      show_on_navbar: showOnNavbar,
      show_on_home: showOnHome,
      is_active: isActive,
    });

    // Ajout des nouvelles images
    for (let i = 0; i < pictures.length; i++) {
      await BrandPicture.create({
        brand_id: req.params.id,
        image_url: `/Uploads/brands/${pictures[i].filename}`,
        image_type: req.body.image_types ? req.body.image_types[i]?.trim() || "general" : "general",
        alt_text: req.body.alt_texts ? req.body.alt_texts[i]?.trim() || `${name.trim()} image ${i + 1}` : `${name.trim()} image ${i + 1}`,
        display_order: req.body.display_orders ? parseInt(req.body.display_orders[i]) || i : i,
      });
    }

    // Retourne la marque mise à jour avec ses images
    const brandWithPictures = await Brand.findByIdWithPictures(req.params.id);
    res.json({
      message: "Marque mise à jour avec succès",
      brand: brandWithPictures,
    });
  } catch (err) {
    res.status(400).json({
      error: err.message.includes("Nom ou URL texte déjà utilisé")
        ? err.message
        : "Erreur lors de la mise à jour de la marque: " + err.message,
    });
  }
};

// Supprime une marque et ses images associées
exports.deleteBrand = async (req, res) => {
  try {
    // Suppression des fichiers associés
    const brand = await Brand.findByIdWithPictures(req.params.id);
    if (brand.logo_url) {
      const logoPath = path.join(__dirname, "../../", brand.logo_url);
      await fs.unlink(logoPath);
    }
    for (const picture of brand.pictures || []) {
      const picturePath = path.join(__dirname, "../../", picture.image_url);
      await fs.unlink(picturePath);
    }

    // Suppression de la marque et de ses images dans la base
    await BrandPicture.deleteByBrandId(req.params.id);
    await Brand.delete(req.params.id);
    res.json({ message: "Marque supprimée avec succès" });
  } catch (err) {
    res.status(404).json({ error: "Marque non trouvée: " + err.message });
  }
};