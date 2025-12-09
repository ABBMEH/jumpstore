const WebsiteParams = require("../models/WebsiteParams");

// Récupère les paramètres du site
exports.getWebsiteParams = async (req, res) => {
  try {
    const params = await WebsiteParams.find();
    if (!params) {
      return res.status(404).json({ error: "Aucun paramètre de site trouvé" });
    }
    res.json(params);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur: " + err.message });
  }
};

// Met à jour les paramètres du site
exports.updateWebsiteParams = async (req, res) => {
  try {
    const { footer_text, color_theme } = req.body;

    // Vérifie qu'au moins un champ est fourni
    if (!footer_text && !color_theme) {
      return res.status(400).json({ error: "Au moins un champ (footer_text ou color_theme) doit être fourni" });
    }

    // Validation du format du code couleur si fourni
    if (color_theme !== undefined) {
      if (!/^#[0-9A-Fa-f]{6}$/.test(color_theme)) {
        return res.status(400).json({ error: "Le code couleur doit être un code hexadécimal valide (ex: #FFFFFF)" });
      }
    }

    // Vérifie si une ligne existe dans la base
    const params = await WebsiteParams.find();
    if (!params) {
      // Crée une nouvelle ligne si aucune n'existe
      const newParams = await WebsiteParams.create({
        footer_text: footer_text || "© 2025 JumpStore. Tous droits réservés.",
        color_theme: color_theme || "#000000",
      });
      return res.status(201).json({ message: "Paramètres du site créés", params: newParams });
    }

    // Met à jour la ligne existante
    const updatedParams = await WebsiteParams.update({
      footer_text,
      color_theme,
    });

    res.json({ message: "Paramètres du site mis à jour", params: updatedParams });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};