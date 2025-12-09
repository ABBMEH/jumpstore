const { pool } = require("../utils/db");

class ProductPicture {
  // Récupère toutes les images d'un produit
  static async findByProductId(product_id) {
    try {
      const res = await pool.query(
        `
        SELECT * FROM product_pictures 
        WHERE product_id = $1 
        ORDER BY display_order
      `,
        [product_id]
      );
      return res.rows;
    } catch (err) {
      throw new Error("Erreur lors de la récupération des images du produit: " + err.message);
    }
  }

  // Récupère une image par son ID
  static async findById(id) {
    try {
      const res = await pool.query("SELECT * FROM product_pictures WHERE id = $1", [id]);
      if (res.rows.length === 0) {
        throw new Error("Image de produit non trouvée");
      }
      return res.rows[0];
    } catch (err) {
      throw new Error("Erreur lors de la récupération de l'image de produit: " + err.message);
    }
  }

  // Crée une nouvelle image pour un produit
  static async create({ product_id, image_url, alt_text, display_order = 0 }) {
    try {
      const res = await pool.query(
        `INSERT INTO product_pictures (product_id, image_url, alt_text, display_order) 
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [product_id, image_url, alt_text, display_order]
      );
      return res.rows[0];
    } catch (err) {
      throw new Error("Erreur lors de la création de l'image de produit: " + err.message);
    }
  }

  // Met à jour une image existante
  static async update(id, { image_url, alt_text, display_order }) {
    try {
      const res = await pool.query(
        `UPDATE product_pictures SET image_url = $1, alt_text = $2, display_order = $3 
         WHERE id = $4 RETURNING *`,
        [image_url, alt_text, display_order, id]
      );
      if (res.rows.length === 0) {
        throw new Error("Image de produit non trouvée");
      }
      return res.rows[0];
    } catch (err) {
      throw new Error("Erreur lors de la mise à jour de l'image de produit: " + err.message);
    }
  }

  // Supprime une image de produit
  static async delete(id) {
    try {
      const res = await pool.query("DELETE FROM product_pictures WHERE id = $1", [id]);
      if (res.rowCount === 0) {
        throw new Error("Image de produit non trouvée");
      }
    } catch (err) {
      throw new Error("Erreur lors de la suppression de l'image de produit: " + err.message);
    }
  }

  // Supprime toutes les images d'un produit
  static async deleteByProductId(product_id) {
    try {
      await pool.query("DELETE FROM product_pictures WHERE product_id = $1", [product_id]);
    } catch (err) {
      throw new Error("Erreur lors de la suppression des images du produit: " + err.message);
    }
  }
}

module.exports = ProductPicture;