const { pool } = require("../utils/db");

class ProductCategory {
  // Récupère toutes les catégories (flat structure pour datagrid)
  static async findAll() {
    try {
      const res = await pool.query(`
        SELECT
          c.*,
          p.name as parent_name
        FROM categories c
        LEFT JOIN categories p ON c.parent_id = p.id
        ORDER BY COALESCE(p."order", c."order"), c."order", c.name
      `);
      return res.rows;
    } catch (err) {
      throw new Error("Erreur lors de la récupération des catégories: " + err.message);
    }
  }

  // Récupère les catégories pour la navbar
  static async findNavbarCategories() {
    try {
      const res = await pool.query(`
        SELECT id, name, url_text
        FROM categories
        WHERE show_on_navbar = true AND is_active = true
        ORDER BY "order", name
      `);
      return res.rows;
    } catch (err) {
      throw new Error("Erreur lors de la récupération des catégories de la navbar: " + err.message);
    }
  }

  // Récupère les catégories pour la page d'accueil
  static async findHomepageCategories() {
    try {
      const res = await pool.query(`
        SELECT id, name, url_text, image_url
        FROM categories
        WHERE show_on_home = true AND is_active = true
        ORDER BY "order", name
      `);
      return res.rows;
    } catch (err) {
      throw new Error("Erreur lors de la récupération des catégories de la page d'accueil: " + err.message);
    }
  }

  // Récupère une catégorie par son ID
  static async findById(id) {
    try {
      const res = await pool.query(
        `
        SELECT 
          c.*,
          (SELECT json_agg(
            json_build_object(
              'id', sc.id,
              'name', sc.name,
              'url_text', sc.url_text,
              'show_on_navbar', sc.show_on_navbar,
              'show_on_home', sc.show_on_home,
              'order', sc.order
            )
          ) FROM categories sc WHERE sc.parent_id = c.id) as subcategories,
          (SELECT json_build_object(
            'id', p.id,
            'name', p.name,
            'url_text', p.url_text,
            'parent_id', p.parent_id,
            'image_url', p.image_url,
            'show_on_navbar', p.show_on_navbar,
            'show_on_home', p.show_on_home,
            'is_active', p.is_active,
            'order', p.order,
            'created_at', p.created_at,
            'updated_at', p.updated_at
          ) FROM categories p WHERE p.id = c.parent_id) as parent
        FROM categories c
        WHERE c.id = $1
      `,
        [id]
      );
      if (res.rows.length === 0) {
        throw new Error("Catégorie non trouvée");
      }
      return res.rows[0];
    } catch (err) {
      throw new Error("Erreur lors de la récupération de la catégorie: " + err.message);
    }
  }

  // Récupère une catégorie par son url_text
  static async findByUrlText(url_text) {
    try {
      const res = await pool.query(
        `
        SELECT c.*,
               (SELECT json_agg(
                 json_build_object(
                   'id', sc.id,
                   'name', sc.name,
                   'url_text', sc.url_text,
                   'show_on_navbar', sc.show_on_navbar,
                   'show_on_home', sc.show_on_home,
                   'order', sc.order
                 )
               ) FROM categories sc WHERE sc.parent_id = c.id) as subcategories
        FROM categories c
        WHERE c.url_text = $1
      `,
        [url_text]
      );
      if (res.rows.length === 0) {
        throw new Error("Catégorie non trouvée");
      }
      return res.rows[0];
    } catch (err) {
      throw new Error("Erreur lors de la récupération de la catégorie par url_text: " + err.message);
    }
  }

  // Crée une nouvelle catégorie
  static async create({ name, url_text, parent_id, show_on_navbar, show_on_home, is_active, order, image_url }) {
    try {
      const res = await pool.query(
        `INSERT INTO categories (name, url_text, parent_id, show_on_navbar, show_on_home, is_active, "order", image_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [name, url_text, parent_id, show_on_navbar, show_on_home, is_active, order, image_url]
      );
      return res.rows[0];
    } catch (err) {
      if (err.code === "23505") {
        throw new Error("Nom ou URL texte déjà utilisé");
      }
      throw new Error("Erreur lors de la création de la catégorie: " + err.message);
    }
  }

  // Met à jour une catégorie existante
  static async update(id, { name, url_text, parent_id, show_on_navbar, show_on_home, is_active, order, image_url }) {
    try {
      const res = await pool.query(
        `UPDATE categories SET
          name = $1, url_text = $2, parent_id = $3,
          show_on_navbar = $4, show_on_home = $5, is_active = $6, "order" = $7,
          image_url = $8, updated_at = CURRENT_TIMESTAMP
         WHERE id = $9 RETURNING *`,
        [name, url_text, parent_id, show_on_navbar, show_on_home, is_active, order, image_url, id]
      );
      if (res.rows.length === 0) {
        throw new Error("Catégorie non trouvée");
      }
      return res.rows[0];
    } catch (err) {
      if (err.code === "23505") {
        throw new Error("Nom ou URL texte déjà utilisé");
      }
      throw new Error("Erreur lors de la mise à jour de la catégorie: " + err.message);
    }
  }

  // Supprime une catégorie
  static async delete(id) {
    try {
      const res = await pool.query("DELETE FROM categories WHERE id = $1", [id]);
      if (res.rowCount === 0) {
        throw new Error("Catégorie non trouvée");
      }
    } catch (err) {
      throw new Error("Erreur lors de la suppression de la catégorie: " + err.message);
    }
  }
}

module.exports = ProductCategory;