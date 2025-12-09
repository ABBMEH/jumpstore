const { pool } = require("../utils/db");

class ProductVariant {
  // Récupère toutes les variantes d'un produit
  static async findByProductId(product_id) {
    try {
      const res = await pool.query(
        `
        SELECT pv.*, s.name as size_name, s.size_order
        FROM product_variants pv
        JOIN sizes s ON pv.size_id = s.id
        WHERE pv.product_id = $1
        ORDER BY s.size_order
      `,
        [product_id]
      );
      return res.rows;
    } catch (err) {
      throw new Error("Erreur lors de la récupération des variantes du produit: " + err.message);
    }
  }

  // Récupère une variante par son ID
  static async findById(id) {
    try {
      const res = await pool.query(
        `
        SELECT pv.*, s.name as size_name
        FROM product_variants pv
        JOIN sizes s ON pv.size_id = s.id
        WHERE pv.id = $1
      `,
        [id]
      );
      if (res.rows.length === 0) {
        throw new Error("Variante de produit non trouvée");
      }
      return res.rows[0];
    } catch (err) {
      throw new Error("Erreur lors de la récupération de la variante de produit: " + err.message);
    }
  }

  // Crée une nouvelle variante de produit
  static async create({ product_id, size_id, stock_quantity = 0, reserved_quantity = 0 }) {
    try {
      const res = await pool.query(
        `INSERT INTO product_variants (product_id, size_id, stock_quantity, reserved_quantity) 
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [product_id, size_id, stock_quantity, reserved_quantity]
      );
      return res.rows[0];
    } catch (err) {
      if (err.code === "23505") {
        throw new Error("Variante déjà existante pour cette taille");
      }
      throw new Error("Erreur lors de la création de la variante de produit: " + err.message);
    }
  }

  // Met à jour une variante existante
  static async update(id, { stock_quantity, reserved_quantity }) {
    try {
      const res = await pool.query(
        `UPDATE product_variants SET stock_quantity = $1, reserved_quantity = $2 
         WHERE id = $3 RETURNING *`,
        [stock_quantity, reserved_quantity, id]
      );
      if (res.rows.length === 0) {
        throw new Error("Variante de produit non trouvée");
      }
      return res.rows[0];
    } catch (err) {
      throw new Error("Erreur lors de la mise à jour de la variante de produit: " + err.message);
    }
  }

  // Supprime une variante de produit
  static async delete(id) {
    try {
      const res = await pool.query("DELETE FROM product_variants WHERE id = $1", [id]);
      if (res.rowCount === 0) {
        throw new Error("Variante de produit non trouvée");
      }
    } catch (err) {
      throw new Error("Erreur lors de la suppression de la variante de produit: " + err.message);
    }
  }

  // Supprime toutes les variantes d'un produit
  static async deleteByProductId(product_id) {
    try {
      await pool.query("DELETE FROM product_variants WHERE product_id = $1", [product_id]);
    } catch (err) {
      throw new Error("Erreur lors de la suppression des variantes du produit: " + err.message);
    }
  }

  // Met à jour le stock d'une variante
  static async updateStock(product_id, size_id, quantity) {
    try {
      const res = await pool.query(
        `UPDATE product_variants SET stock_quantity = $1 
         WHERE product_id = $2 AND size_id = $3 RETURNING *`,
        [quantity, product_id, size_id]
      );
      if (res.rows.length === 0) {
        throw new Error("Variante non trouvée");
      }
      return res.rows[0];
    } catch (err) {
      throw new Error("Erreur lors de la mise à jour du stock: " + err.message);
    }
  }
}

module.exports = ProductVariant;