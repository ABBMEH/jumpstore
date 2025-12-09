const { pool } = require("../utils/db");

class Brand {
  // Récupère toutes les marques
  static async findAll() {
    try {
      const res = await pool.query("SELECT * FROM brands ORDER BY name");
      return res.rows;
    } catch (err) {
      throw new Error("Erreur lors de la récupération des marques: " + err.message);
    }
  }

  // Récupère toutes les marques avec leurs images
  static async findAllWithPictures() {
    try {
      const res = await pool.query(`
        SELECT b.*,
               json_agg(
                 json_build_object(
                   'id', bp.id,
                   'image_url', bp.image_url,
                   'image_type', bp.image_type,
                   'alt_text', bp.alt_text,
                   'display_order', bp.display_order
                 ) ORDER BY bp.display_order
               ) FILTER (WHERE bp.id IS NOT NULL) as pictures
        FROM brands b
        LEFT JOIN brand_pictures bp ON b.id = bp.brand_id
        GROUP BY b.id
        ORDER BY b.name
      `);
      return res.rows;
    } catch (err) {
      throw new Error("Erreur lors de la récupération des marques avec images: " + err.message);
    }
  }

  // Récupère les marques pour la navbar
  static async findNavbarBrands() {
    try {
      const res = await pool.query(`
        SELECT id, name, url_text, logo_url
        FROM brands
        WHERE show_on_navbar = true AND is_active = true
        ORDER BY name
      `);
      return res.rows;
    } catch (err) {
      throw new Error("Erreur lors de la récupération des marques de la navbar: " + err.message);
    }
  }

  // Récupère les marques pour la page d'accueil
  static async findHomepageBrands() {
    try {
      const res = await pool.query(`
        SELECT id, name, url_text, logo_url
        FROM brands
        WHERE show_on_home = true AND is_active = true
        ORDER BY name
      `);
      return res.rows;
    } catch (err) {
      throw new Error("Erreur lors de la récupération des marques de la page d'accueil: " + err.message);
    }
  }

  // Récupère une marque par son ID
  static async findById(id) {
    try {
      const res = await pool.query("SELECT * FROM brands WHERE id = $1", [id]);
      if (res.rows.length === 0) {
        throw new Error("Marque non trouvée");
      }
      return res.rows[0];
    } catch (err) {
      throw new Error("Erreur lors de la récupération de la marque: " + err.message);
    }
  }

  // Récupère une marque avec ses images par son ID
  static async findByIdWithPictures(id) {
    try {
      const res = await pool.query(
        `
        SELECT b.*,
               json_agg(
                 json_build_object(
                   'id', bp.id,
                   'image_url', bp.image_url,
                   'image_type', bp.image_type,
                   'alt_text', bp.alt_text,
                   'display_order', bp.display_order
                 ) ORDER BY bp.display_order
               ) FILTER (WHERE bp.id IS NOT NULL) as pictures
        FROM brands b
        LEFT JOIN brand_pictures bp ON b.id = bp.brand_id
        WHERE b.id = $1
        GROUP BY b.id
      `,
        [id]
      );
      if (res.rows.length === 0) {
        throw new Error("Marque non trouvée");
      }
      return res.rows[0];
    } catch (err) {
      throw new Error("Erreur lors de la récupération de la marque avec images: " + err.message);
    }
  }

  // Crée une nouvelle marque
  static async create({ name, url_text, description, logo_url, show_on_navbar, show_on_home, is_active = true }) {
    try {
      if (!name?.trim() || !url_text?.trim()) {
        throw new Error("Nom et URL texte sont requis");
      }
      const res = await pool.query(
        `INSERT INTO brands (name, url_text, description, logo_url, show_on_navbar, show_on_home, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [name.trim(), url_text.trim(), description?.trim() || null, logo_url || null, show_on_navbar || false, show_on_home || false, is_active]
      );
      return res.rows[0];
    } catch (err) {
      if (err.code === "23505") {
        throw new Error("Nom ou URL texte déjà utilisé");
      }
      throw new Error("Erreur lors de la création de la marque: " + err.message);
    }
  }

  // Met à jour une marque existante
  static async update(id, { name, url_text, description, logo_url, show_on_navbar, show_on_home, is_active }) {
    try {
      if (!name?.trim() || !url_text?.trim()) {
        throw new Error("Nom et URL texte sont requis");
      }
      const res = await pool.query(
        `UPDATE brands 
         SET name = $1, url_text = $2, description = $3, logo_url = $4, show_on_navbar = $5, show_on_home = $6, is_active = $7, updated_at = CURRENT_TIMESTAMP
         WHERE id = $8 RETURNING *`,
        [
          name.trim(),
          url_text.trim(),
          description?.trim() || null,
          logo_url !== undefined ? logo_url : null,
          show_on_navbar !== undefined ? show_on_navbar : null,
          show_on_home !== undefined ? show_on_home : null,
          is_active !== undefined ? is_active : null,
          id,
        ]
      );
      if (res.rows.length === 0) {
        throw new Error("Marque non trouvée");
      }
      return res.rows[0];
    } catch (err) {
      if (err.code === "23505") {
        throw new Error("Nom ou URL texte déjà utilisé");
      }
      throw new Error("Erreur lors de la mise à jour de la marque: " + err.message);
    }
  }

  // Supprime une marque
  static async delete(id) {
    try {
      const res = await pool.query("DELETE FROM brands WHERE id = $1", [id]);
      if (res.rowCount === 0) {
        throw new Error("Marque non trouvée");
      }
    } catch (err) {
      throw new Error("Erreur lors de la suppression de la marque: " + err.message);
    }
  }
}

module.exports = Brand;