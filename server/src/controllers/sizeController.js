const Size = require("../models/Size");

// Récupère toutes les tailles
exports.getAllSizes = async (req, res) => {
  try {
    const sizes = await Size.findAll();
    res.json(sizes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Récupère les tailles par type
exports.getSizesBySizeType = async (req, res) => {
  try {
    const sizes = await Size.findBySizeType(req.params.sizeTypeId);
    res.json(sizes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Récupère une taille spécifique par son ID
exports.getSizeById = async (req, res) => {
  try {
    const size = await Size.findById(req.params.id);
    res.json(size);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
};

// Crée une nouvelle taille
exports.createSize = async (req, res) => {
  try {
    const { name, size_type_id, size_order } = req.body;

    // Vérification des champs obligatoires
    if (!name || !size_type_id) {
      return res.status(400).json({ error: "Nom et type de taille sont requis" });
    }

    const size = await Size.create({
      name,
      size_type_id,
      size_order: size_order || 0, // Par défaut, ordre à 0 si non spécifié
    });

    res.status(201).json({
      message: "Taille créée avec succès",
      size,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Met à jour une taille existante
exports.updateSize = async (req, res) => {
  try {
    const { name, size_type_id, size_order } = req.body;

    // Vérifie que les champs requis sont fournis
    if (!name || !size_type_id) {
      return res.status(400).json({ error: "Nom et type de taille sont requis" });
    }

    const size = await Size.update(req.params.id, {
      name,
      size_type_id,
      size_order,
    });

    res.json({ message: "Taille mise à jour", size });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Supprime une taille
exports.deleteSize = async (req, res) => {
  try {
    await Size.delete(req.params.id);
    res.json({ message: "Taille supprimée" });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
};