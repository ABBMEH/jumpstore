const { pool } = require("../utils/db");

class SizeType {
  // Récupère tous les types de tailles
  static async findAll() {
    try {
      const res = await pool.query("SELECT * FROM size_types ORDER BY name");
      return res.rows;
    } catch (err) {
      throw new Error("Erreur lors de la récupération des types de tailles: " + err.message);
    }
  }

  // Récupère tous les types de tailles avec leurs tailles associées
  static async findAllWithSizes() {
    try {
      const res = await pool.query(`
        SELECT st.*, 
               json_agg(
                 json_build_object(
                   'id', s.id,
                   'name', s.name,
                   'size_order', s.size_order
                 ) ORDER BY s.size_order
               ) FILTER (WHERE s.id IS NOT NULL) as sizes
        FROM size_types st
        LEFT JOIN sizes s ON st.id = s.size_type_id
        GROUP BY st.id
        ORDER BY st.name
      `);
      return res.rows;
    } catch (err) {
      throw new Error("Erreur lors de la récupération des types de tailles avec tailles: " + err.message);
    }
  }

  // Récupère un type de taille par ID
  static async findById(id) {
    try {
      const res = await pool.query("SELECT * FROM size_types WHERE id = $1", [id]);
      if (res.rows.length === 0) {
        throw new Error("Type de taille non trouvé");
      }
      return res.rows[0];
    } catch (err) {
      throw new Error("Erreur lors de la récupération du type de taille: " + err.message);
    }
  }

  // Récupère un type de taille avec ses tailles associées
  static async findByIdWithSizes(id) {
    try {
      const res = await pool.query(
        `
        SELECT st.*, 
               json_agg(
                 json_build_object(
                   'id', s.id,
                   'name', s.name,
                   'size_order', s.size_order
                 ) ORDER BY s.size_order
               ) FILTER (WHERE s.id IS NOT NULL) as sizes
        FROM size_types st
        LEFT JOIN sizes s ON st.id = s.size_type_id
        WHERE st.id = $1
        GROUP BY st.id
      `,
        [id]
      );

      if (res.rows.length === 0) {
        throw new Error("Type de taille non trouvé");
      }
      return res.rows[0];
    } catch (err) {
      throw new Error("Erreur lors de la récupération du type de taille avec tailles: " + err.message);
    }
  }

  // Crée un nouveau type de taille
  static async create({ name }) {
    try {
      const res = await pool.query("INSERT INTO size_types (name) VALUES ($1) RETURNING *", [name]);
      return res.rows[0];
    } catch (err) {
      if (err.code === "23505") {
        throw new Error("Nom déjà utilisé");
      }
      throw new Error("Erreur lors de la création du type de taille: " + err.message);
    }
  }

  // Met à jour un type de taille
  static async update(id, { name }) {
    try {
      const res = await pool.query("UPDATE size_types SET name = $1 WHERE id = $2 RETURNING *", [name, id]);
      if (res.rows.length === 0) {
        throw new Error("Type de taille non trouvé");
      }
      return res.rows[0];
    } catch (err) {
      if (err.code === "23505") {
        throw new Error("Nom déjà utilisé");
      }
      throw new Error("Erreur lors de la mise à jour du type de taille: " + err.message);
    }
  }

  // Supprime un type de taille
  static async delete(id) {
    try {
      const res = await pool.query("DELETE FROM size_types WHERE id = $1", [id]);
      if (res.rowCount === 0) {
        throw new Error("Type de taille non trouvé");
      }
    } catch (err) {
      throw new Error("Erreur lors de la suppression du type de taille: " + err.message);
    }
  }
}

module.exports = SizeType;