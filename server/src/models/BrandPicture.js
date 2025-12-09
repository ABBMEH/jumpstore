const { pool } = require("../utils/db");

class BrandPicture {
  // Récupère toutes les images d'une marque
  static async findByBrandId(brand_id) {
    try {
      const res = await pool.query(
        `
        SELECT * FROM brand_pictures 
        WHERE brand_id = $1 
        ORDER BY display_order
      `,
        [brand_id]
      );
      return res.rows;
    } catch (err) {
      throw new Error("Erreur lors de la récupération des images de la marque: " + err.message);
    }
  }

  // Récupère une image spécifique par son ID
  static async findById(id) {
    try {
      const res = await pool.query("SELECT * FROM brand_pictures WHERE id = $1", [id]);
      if (res.rows.length === 0) {
        throw new Error("Image de marque non trouvée");
      }
      return res.rows[0];
    } catch (err) {
      throw new Error("Erreur lors de la récupération de l'image de marque: " + err.message);
    }
  }

  // Crée une nouvelle image pour une marque
  static async create({ brand_id, image_url, image_type, alt_text, display_order = 0 }) {
    try {
      const res = await pool.query(
        `INSERT INTO brand_pictures (brand_id, image_url, image_type, alt_text, display_order) 
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [brand_id, image_url, image_type, alt_text, display_order]
      );
      return res.rows[0];
    } catch (err) {
      throw new Error("Erreur lors de la création de l'image de marque: " + err.message);
    }
  }

  // Met à jour une image existante
  static async update(id, { image_url, image_type, alt_text, display_order }) {
    try {
      const res = await pool.query(
        `UPDATE brand_pictures SET image_url = $1, image_type = $2, alt_text = $3, display_order = $4 
         WHERE id = $5 RETURNING *`,
        [image_url, image_type, alt_text, display_order, id]
      );
      if (res.rows.length === 0) {
        throw new Error("Image de marque non trouvée");
      }
      return res.rows[0];
    } catch (err) {
      throw new Error("Erreur lors de la mise à jour de l'image de marque: " + err.message);
    }
  }

  // Supprime une image par son ID
  static async delete(id) {
    try {
      const res = await pool.query("DELETE FROM brand_pictures WHERE id = $1", [id]);
      if (res.rowCount === 0) {
        throw new Error("Image de marque non trouvée");
      }
    } catch (err) {
      throw new Error("Erreur lors de la suppression de l'image de marque: " + err.message);
    }
  }

  // Supprime toutes les images d'une marque
  static async deleteByBrandId(brand_id) {
    try {
      await pool.query("DELETE FROM brand_pictures WHERE brand_id = $1", [brand_id]);
    } catch (err) {
      throw new Error("Erreur lors de la suppression des images de la marque: " + err.message);
    }
  }
}

module.exports = BrandPicture;