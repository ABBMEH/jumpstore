const { pool } = require("../utils/db");

class WebsiteParams {
  // Récupère les paramètres du site
  static async find() {
    try {
      const res = await pool.query("SELECT * FROM website_params LIMIT 1");
      return res.rows[0] || null;
    } catch (err) {
      throw new Error("Erreur lors de la récupération des paramètres du site: " + err.message);
    }
  }

  // Crée de nouveaux paramètres du site
  static async create({ footer_text, color_theme }) {
    try {
      // Validation des entrées
      if (!footer_text || typeof footer_text !== "string" || footer_text.trim() === "") {
        throw new Error("footer_text must be a non-empty string");
      }
      if (!color_theme || !/^#[0-9A-Fa-f]{6}$/.test(color_theme)) {
        throw new Error("color_theme must be a valid hex color code (e.g., #FF0000)");
      }

      const res = await pool.query(
        `INSERT INTO website_params (footer_text, color_theme) 
         VALUES ($1, $2) RETURNING *`,
        [footer_text, color_theme]
      );
      return res.rows[0];
    } catch (err) {
      throw new Error("Erreur lors de la création des paramètres du site: " + err.message);
    }
  }

  // Met à jour les paramètres du site
  static async update({ footer_text, color_theme }) {
    try {
      // Validation des entrées si fournies
      if (footer_text !== undefined && (typeof footer_text !== "string" || footer_text.trim() === "")) {
        throw new Error("footer_text must be a non-empty string if provided");
      }
      if (color_theme !== undefined && !/^#[0-9A-Fa-f]{6}$/.test(color_theme)) {
        throw new Error("color_theme must be a valid hex color code (e.g., #FF0000) if provided");
      }

      const fields = [];
      const values = [];
      let paramIndex = 1;

      // Ajout des champs à mettre à jour
      if (footer_text !== undefined) {
        fields.push(`footer_text = $${paramIndex}`);
        values.push(footer_text);
        paramIndex++;
      }

      if (color_theme !== undefined) {
        fields.push(`color_theme = $${paramIndex}`);
        values.push(color_theme);
        paramIndex++;
      }

      // Vérifie si des champs valides sont fournis
      if (fields.length === 0) {
        throw new Error("Aucun champ valide fourni pour la mise à jour");
      }

      const query = `UPDATE website_params SET ${fields.join(", ")} RETURNING *`;

      const res = await pool.query(query, values);
      if (res.rows.length === 0) {
        throw new Error("Paramètres du site non trouvés");
      }

      return res.rows[0];
    } catch (err) {
      throw new Error("Erreur lors de la mise à jour des paramètres du site: " + err.message);
    }
  }
}

module.exports = WebsiteParams;