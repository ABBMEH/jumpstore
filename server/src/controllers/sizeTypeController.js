const SizeType = require("../models/SizeType");
const Size = require("../models/Size");

// Récupère tous les types de tailles avec leurs tailles associées
exports.getAllSizeTypes = async (req, res) => {
  try {
    const sizeTypes = await SizeType.findAllWithSizes();
    res.json(sizeTypes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Récupère un type de taille par ID avec ses tailles
exports.getSizeTypeById = async (req, res) => {
  try {
    const sizeType = await SizeType.findByIdWithSizes(req.params.id);
    res.json(sizeType);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
};

// Crée un nouveau type de taille
exports.createSizeType = async (req, res) => {
  try {
    const { name, sizes } = req.body;

    // Vérification du champ obligatoire
    if (!name) {
      return res.status(400).json({ error: "Nom requis" });
    }

    // Création du type de taille
    const sizeType = await SizeType.create({ name });

    // Ajoute les tailles si fournies
    if (sizes && typeof sizes === "string") {
      const sizeList = sizes
        .split(";")
        .map((s) => s.trim())
        .filter((s) => s !== "");

      // Parcours des tailles pour les créer
      for (let i = 0; i < sizeList.length; i++) {
        await Size.create({
          name: sizeList[i],
          size_type_id: sizeType.id,
          size_order: i,
        });
      }
    }

    // Récupère le type de taille avec ses tailles
    const sizeTypeWithSizes = await SizeType.findByIdWithSizes(sizeType.id);
    res.status(201).json({
      message: "Type de taille créé avec succès",
      sizeType: sizeTypeWithSizes,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Met à jour un type de taille
exports.updateSizeType = async (req, res) => {
  try {
    const { name, sizes } = req.body;

    // Vérifie que le nom est fourni
    if (!name) {
      return res.status(400).json({ error: "Nom requis" });
    }

    // Mise à jour du type de taille
    const sizeType = await SizeType.update(req.params.id, { name });

    // Gère les tailles si fournies
    if (sizes !== undefined) {
      // Supprime les tailles existantes
      await Size.deleteBySizeTypeId(req.params.id);

      // Ajoute les nouvelles tailles
      if (typeof sizes === "string") {
        const sizeList = sizes
          .split(";")
          .map((s) => s.trim())
          .filter((s) => s !== "");

        for (let i = 0; i < sizeList.length; i++) {
          await Size.create({
            name: sizeList[i],
            size_type_id: req.params.id,
            size_order: i,
          });
        }
      }
    }

    // Retourne le type de taille mis à jour avec ses tailles
    const sizeTypeWithSizes = await SizeType.findByIdWithSizes(req.params.id);
    res.json({ message: "Type de taille mis à jour", sizeType: sizeTypeWithSizes });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Supprime un type de taille
exports.deleteSizeType = async (req, res) => {
  try {
    await SizeType.delete(req.params.id);
    res.json({ message: "Type de taille supprimé" });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
};