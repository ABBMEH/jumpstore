const { pool } = require("../utils/db");

class Size {
  // Récupère toutes les tailles avec le nom du type associé
  static async findAll() {
    try {
      const res = await pool.query(`
        SELECT s.*, st.name as size_type_name 
        FROM sizes s 
        JOIN size_types st ON s.size_type_id = st.id 
        ORDER BY st.name, s.size_order
      `);
      return res.rows;
    } catch (err) {
      throw new Error("Erreur lors de la récupération des tailles: " + err.message);
    }
  }

  // Récupère les tailles pour un type spécifique
  static async findBySizeType(size_type_id) {
    try {
      const res = await pool.query(
        `
        SELECT s.*, st.name as size_type_name 
        FROM sizes s 
        JOIN size_types st ON s.size_type_id = st.id 
        WHERE s.size_type_id = $1 
        ORDER BY s.size_order
      `,
        [size_type_id]
      );
      return res.rows;
    } catch (err) {
      throw new Error("Erreur lors de la récupération des tailles par type: " + err.message);
    }
  }

  // Récupère une taille par son ID
  static async findById(id) {
    try {
      const res = await pool.query(
        `
        SELECT s.*, st.name as size_type_name 
        FROM sizes s 
        JOIN size_types st ON s.size_type_id = st.id 
        WHERE s.id = $1
      `,
        [id]
      );
      if (res.rows.length === 0) {
        throw new Error("Taille non trouvée");
      }
      return res.rows[0];
    } catch (err) {
      throw new Error("Erreur lors de la récupération de la taille: " + err.message);
    }
  }

  // Crée une nouvelle taille
  static async create({ name, size_type_id, size_order = 0 }) {
    try {
      const res = await pool.query(
        `INSERT INTO sizes (name, size_type_id, size_order) 
         VALUES ($1, $2, $3) RETURNING *`,
        [name, size_type_id, size_order]
      );
      return res.rows[0];
    } catch (err) {
      if (err.code === "23505") {
        throw new Error("Taille déjà existante pour ce type");
      }
      throw new Error("Erreur lors de la création de la taille: " + err.message);
    }
  }

  // Met à jour une taille existante
  static async update(id, { name, size_type_id, size_order }) {
    try {
      const res = await pool.query(
        `UPDATE sizes SET name = $1, size_type_id = $2, size_order = $3 
         WHERE id = $4 RETURNING *`,
        [name, size_type_id, size_order, id]
      );
      if (res.rows.length === 0) {
        throw new Error("Taille non trouvée");
      }
      return res.rows[0];
    } catch (err) {
      if (err.code === "23505") {
        throw new Error("Taille déjà existante pour ce type");
      }
      throw new Error("Erreur lors de la mise à jour de la taille: " + err.message);
    }
  }

  // Supprime une taille
  static async delete(id) {
    try {
      const res = await pool.query("DELETE FROM sizes WHERE id = $1", [id]);
      if (res.rowCount === 0) {
        throw new Error("Taille non trouvée");
      }
    } catch (err) {
      throw new Error("Erreur lors de la suppression de la taille: " + err.message);
    }
  }

  // Supprime toutes les tailles d'un type donné
  static async deleteBySizeTypeId(size_type_id) {
    try {
      await pool.query("DELETE FROM sizes WHERE size_type_id = $1", [size_type_id]);
    } catch (err) {
      throw new Error("Erreur lors de la suppression des tailles par type: " + err.message);
    }
  }
}

module.exports = Size;