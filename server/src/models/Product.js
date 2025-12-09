const { pool } = require("../utils/db");
const Size = require("./Size");

class Product {
  // Récupère tous les produits avec informations de base
  static async findAll() {
    try {
      const res = await pool.query(`
        SELECT p.*,
               b.name as brand_name,
               st.name as size_type_name,
               (SELECT json_agg(
                 json_build_object(
                   'id', c.id,
                   'name', c.name,
                   'url_text', c.url_text
                 )
               ) FROM product_categories pc
               JOIN categories c ON pc.category_id = c.id
               WHERE pc.product_id = p.id) as categories,
               (SELECT COUNT(*) FROM product_variants pv WHERE pv.product_id = p.id) as variant_count,
               (SELECT SUM(pv.stock_quantity) FROM product_variants pv WHERE pv.product_id = p.id) as total_stock
        FROM products p
        LEFT JOIN brands b ON p.brand_id = b.id
        LEFT JOIN size_types st ON p.size_type_id = st.id
        ORDER BY p.created_at DESC
      `);
      return res.rows;
    } catch (err) {
      throw new Error("Erreur lors de la récupération des produits: " + err.message);
    }
  }

  // Récupère tous les produits actifs ayant du stock
  static async findAllActiveWithStock() {
    try {
      const res = await pool.query(`
        SELECT
          p.*,
          json_build_object(
            'id', b.id,
            'name', b.name,
            'logo_url', b.logo_url
          ) as brand,
          json_build_object(
            'id', st.id,
            'name', st.name
          ) as size_type,
          (SELECT json_agg(
            json_build_object(
              'id', c.id,
              'name', c.url_text
            )
          ) FROM product_categories pc
          JOIN categories c ON pc.category_id = c.id
          WHERE pc.product_id = p.id) as categories,
          (SELECT json_agg(
            json_build_object(
              'id', pp.id,
              'image_url', pp.image_url,
              'alt_text', pp.alt_text,
              'display_order', pp.display_order
            ) ORDER BY pp.display_order
          ) FROM product_pictures pp WHERE pp.product_id = p.id) as pictures,
          (SELECT json_agg(
            json_build_object(
              'id', pv.id,
              'size_id', pv.size_id,
              'size_name', s.name,
              'stock_quantity', pv.stock_quantity,
              'reserved_quantity', pv.reserved_quantity
            ) ORDER BY s.size_order
          ) FROM product_variants pv
            JOIN sizes s ON pv.size_id = s.id
            WHERE pv.product_id = p.id) as variants
        FROM products p
        LEFT JOIN brands b ON p.brand_id = b.id
        LEFT JOIN size_types st ON p.size_type_id = st.id
        WHERE p.is_active = true
        AND EXISTS (
          SELECT 1 FROM product_variants pv
          WHERE pv.product_id = p.id AND pv.stock_quantity > 0
        )
        ORDER BY p.created_at DESC
      `);
      return res.rows;
    } catch (err) {
      throw new Error("Erreur lors de la récupération des produits actifs avec stock: " + err.message);
    }
  }

  // Récupère tous les produits avec leurs détails
  static async findAllWithDetails() {
    try {
      const res = await pool.query(`
        SELECT
          p.*,
          json_build_object(
            'id', b.id,
            'name', b.name,
            'logo_url', b.logo_url
          ) as brand,
          json_build_object(
            'id', st.id,
            'name', st.name
          ) as size_type,
          (SELECT json_agg(
            json_build_object(
              'id', c.id,
              'name', c.name,
              'url_text', c.url_text
            )
          ) FROM product_categories pc
          JOIN categories c ON pc.category_id = c.id
          WHERE pc.product_id = p.id) as categories,
          (SELECT json_agg(
            json_build_object(
              'id', pp.id,
              'image_url', pp.image_url,
              'alt_text', pp.alt_text,
              'display_order', pp.display_order
            ) ORDER BY pp.display_order
          ) FROM product_pictures pp WHERE pp.product_id = p.id) as pictures,
          (SELECT json_agg(
            json_build_object(
              'id', pv.id,
              'size_id', pv.size_id,
              'size_name', s.name,
              'stock_quantity', pv.stock_quantity,
              'reserved_quantity', pv.reserved_quantity
            ) ORDER BY s.size_order
          ) FROM product_variants pv
            JOIN sizes s ON pv.size_id = s.id
            WHERE pv.product_id = p.id) as variants
        FROM products p
        LEFT JOIN brands b ON p.brand_id = b.id
        LEFT JOIN size_types st ON p.size_type_id = st.id
        ORDER BY p.created_at DESC
      `);
      return res.rows;
    } catch (err) {
      console.error("Erreur détaillée:", err);
      throw new Error("Erreur lors de la récupération des produits avec détails: " + err.message);
    }
  }

  // Récupère un produit par son ID
  static async findById(id) {
    try {
      const res = await pool.query(
        `
        SELECT p.*,
               b.name as brand_name,
               st.name as size_type_name,
               (SELECT json_agg(
                 json_build_object(
                   'id', c.id,
                   'name', c.name,
                   'url_text', c.url_text
                 )
               ) FROM product_categories pc
               JOIN categories c ON pc.category_id = c.id
               WHERE pc.product_id = p.id) as categories
        FROM products p
        LEFT JOIN brands b ON p.brand_id = b.id
        LEFT JOIN size_types st ON p.size_type_id = st.id
        WHERE p.id = $1
      `,
        [id]
      );
      if (res.rows.length === 0) {
        throw new Error("Produit non trouvé");
      }
      return res.rows[0];
    } catch (err) {
      throw new Error("Erreur lors de la récupération du produit: " + err.message);
    }
  }

  // Récupère un produit avec tous ses détails
  static async findByIdWithDetails(id) {
    try {
      const res = await pool.query(
        `
        SELECT
          p.*,
          json_build_object(
            'id', b.id,
            'name', b.name,
            'logo_url', b.logo_url
          ) as brand,
          json_build_object(
            'id', st.id,
            'name', st.name
          ) as size_type,
          (SELECT json_agg(
            json_build_object(
              'id', c.id,
              'name', c.name,
              'url_text', c.url_text
            )
          ) FROM product_categories pc
          JOIN categories c ON pc.category_id = c.id
          WHERE pc.product_id = p.id) as categories,
          (SELECT json_agg(
            json_build_object(
              'id', pp.id,
              'image_url', pp.image_url,
              'alt_text', pp.alt_text,
              'display_order', pp.display_order
            ) ORDER BY pp.display_order
          ) FROM product_pictures pp WHERE pp.product_id = p.id) as pictures,
          (SELECT json_agg(
            json_build_object(
              'id', pv.id,
              'size_id', pv.size_id,
              'size_name', s.name,
              'stock_quantity', pv.stock_quantity,
              'reserved_quantity', pv.reserved_quantity
            ) ORDER BY s.size_order
          ) FROM product_variants pv
            JOIN sizes s ON pv.size_id = s.id
            WHERE pv.product_id = p.id) as variants
        FROM products p
        LEFT JOIN brands b ON p.brand_id = b.id
        LEFT JOIN size_types st ON p.size_type_id = st.id
        WHERE p.id = $1
      `,
        [id]
      );
      if (res.rows.length === 0) {
        throw new Error("Produit non trouvé");
      }
      return res.rows[0];
    } catch (err) {
      throw new Error("Erreur lors de la récupération du produit avec détails: " + err.message);
    }
  }

  // Crée un nouveau produit
  static async create({ name, url_text, description, price, promo_price, is_used, cost, barcode, category_ids, brand_id, size_type_id, is_active, is_highlight, weight }) {
    let client;
    try {
      client = await pool.connect();
      await client.query("BEGIN");
      const res = await pool.query(
        `INSERT INTO products (
          name, url_text, description, price, promo_price, is_used, cost, barcode,
          brand_id, size_type_id, is_active, is_highlight, weight
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
        [name, url_text, description, price, promo_price, is_used, cost, barcode, brand_id, size_type_id, is_active, is_highlight, weight]
      );
      const productId = res.rows[0].id;

      if (category_ids && Array.isArray(category_ids)) {
        for (const categoryId of category_ids) {
          await client.query(
            `INSERT INTO product_categories (product_id, category_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [productId, categoryId]
          );
        }
      }
      await client.query("COMMIT");
      return res.rows[0];
    } catch (err) {
      await client.query("ROLLBACK");
      if (err.code === "23505") {
        throw new Error("Nom ou URL texte déjà utilisé");
      }
      throw new Error("Erreur lors de la création du produit: " + err.message);
    } finally {
      if (client) client.release();
    }
  }

  // Met à jour un produit existant
  static async update(id, { name, url_text, description, price, promo_price, is_used, cost, barcode, category_ids, brand_id, size_type_id, is_active, is_highlight, weight }) {
    let client;
    try {
      client = await pool.connect();
      await client.query("BEGIN");
      const res = await client.query(
        `UPDATE products SET
          name = $1, url_text = $2, description = $3, price = $4, promo_price = $5,
          is_used = $6, cost = $7, barcode = $8,
          brand_id = $9, size_type_id = $10, is_active = $11, is_highlight = $12, weight = $13, updated_at = CURRENT_TIMESTAMP
         WHERE id = $14 RETURNING *`,
        [name, url_text, description, price, promo_price, is_used, cost, barcode, brand_id, size_type_id, is_active, is_highlight, weight, id]
      );
      if (res.rows.length === 0) {
        throw new Error("Produit non trouvé");
      }

      if (category_ids && Array.isArray(category_ids)) {
        await client.query(`DELETE FROM product_categories WHERE product_id = $1`, [id]);
        for (const categoryId of category_ids) {
          await client.query(
            `INSERT INTO product_categories (product_id, category_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [id, categoryId]
          );
        }
      }
      await client.query("COMMIT");
      return res.rows[0];
    } catch (err) {
      await client.query("ROLLBACK");
      if (err.code === "23505") {
        throw new Error("Nom ou URL texte déjà utilisé");
      }
      throw new Error("Erreur lors de la mise à jour du produit: " + err.message);
    } finally {
      if (client) client.release();
    }
  }

  // Supprime un produit
  static async delete(id) {
    try {
      const res = await pool.query("DELETE FROM products WHERE id = $1", [id]);
      if (res.rowCount === 0) {
        throw new Error("Produit non trouvé");
      }
    } catch (err) {
      throw new Error("Erreur lors de la suppression du produit: " + err.message);
    }
  }

  // Récupère les produits par marque
  static async findByBrand(brand_id) {
    try {
      const res = await pool.query(
        `
        SELECT p.*
        FROM products p
        WHERE p.brand_id = $1 AND p.is_active = true
        ORDER BY p.name
      `,
        [brand_id]
      );
      return res.rows;
    } catch (err) {
      throw new Error("Erreur lors de la récupération des produits par marque: " + err.message);
    }
  }

  // Recherche des produits par nom, description ou marque
  static async search(query) {
    try {
      const res = await pool.query(
        `
        SELECT p.*, b.name as brand_name
        FROM products p
        LEFT JOIN brands b ON p.brand_id = b.id
        WHERE p.is_active = true AND (
          p.name ILIKE $1 OR p.description ILIKE $1 OR b.name ILIKE $1
        )
        ORDER BY p.name
      `,
        [`%${query}%`]
      );
      return res.rows;
    } catch (err) {
      throw new Error("Erreur lors de la recherche de produits: " + err.message);
    }
  }

  // Récupère les produits par catégorie (incluant sous-catégories)
  static async findByCategoryUrlText(url_text) {
    try {
      const res = await pool.query(
        `
        WITH RECURSIVE category_tree AS (
          SELECT id
          FROM categories
          WHERE url_text = $1
          UNION ALL
          SELECT c.id
          FROM categories c
          INNER JOIN category_tree ct ON c.parent_id = ct.id
        )
        SELECT
          p.*,
          json_build_object(
            'id', b.id,
            'name', b.name,
            'logo_url', b.logo_url
          ) as brand,
          json_build_object(
            'id', st.id,
            'name', st.name
          ) as size_type,
          (SELECT json_agg(
            json_build_object(
              'id', c.id,
              'name', c.name,
              'url_text', c.url_text
            )
          ) FROM product_categories pc
          JOIN categories c ON pc.category_id = c.id
          WHERE pc.product_id = p.id) as categories,
          (SELECT json_agg(
            json_build_object(
              'id', pp.id,
              'image_url', pp.image_url,
              'alt_text', pp.alt_text,
              'display_order', pp.display_order
            ) ORDER BY pp.display_order
          ) FROM product_pictures pp WHERE pp.product_id = p.id) as pictures,
          (SELECT json_agg(
            json_build_object(
              'id', pv.id,
              'size_id', pv.size_id,
              'size_name', s.name,
              'stock_quantity', pv.stock_quantity,
              'reserved_quantity', pv.reserved_quantity
            ) ORDER BY s.size_order
          ) FROM product_variants pv
            JOIN sizes s ON pv.size_id = s.id
            WHERE pv.product_id = p.id) as variants
        FROM products p
        LEFT JOIN brands b ON p.brand_id = b.id
        LEFT JOIN size_types st ON p.size_type_id = st.id
        INNER JOIN product_categories pc ON p.id = pc.product_id
        WHERE pc.category_id IN (SELECT id FROM category_tree)
        AND p.is_active = true
        ORDER BY p.created_at DESC
      `,
        [url_text]
      );
      return res.rows;
    } catch (err) {
      throw new Error("Erreur lors de la récupération des produits par catégorie: " + err.message);
    }
  }

  // Récupère les produits par sous-catégories
  static async findBySubcategoryUrlTexts(url_texts) {
    try {
      const res = await pool.query(
        `
        SELECT
          p.*,
          json_build_object(
            'id', b.id,
            'name', b.name,
            'logo_url', b.logo_url
          ) as brand,
          json_build_object(
            'id', st.id,
            'name', st.name
          ) as size_type,
          (SELECT json_agg(
            json_build_object(
              'id', c.id,
              'name', c.name,
              'url_text', c.url_text
            )
          ) FROM product_categories pc
          JOIN categories c ON pc.category_id = c.id
          WHERE pc.product_id = p.id) as categories,
          (SELECT json_agg(
            json_build_object(
              'id', pp.id,
              'image_url', pp.image_url,
              'alt_text', pp.alt_text,
              'display_order', pp.display_order
            ) ORDER BY pp.display_order
          ) FROM product_pictures pp WHERE pp.product_id = p.id) as pictures,
          (SELECT json_agg(
            json_build_object(
              'id', pv.id,
              'size_id', pv.size_id,
              'size_name', s.name,
              'stock_quantity', pv.stock_quantity,
              'reserved_quantity', pv.reserved_quantity
            ) ORDER BY s.size_order
          ) FROM product_variants pv
            JOIN sizes s ON pv.size_id = s.id
            WHERE pv.product_id = p.id) as variants
        FROM products p
        LEFT JOIN brands b ON p.brand_id = b.id
        LEFT JOIN size_types st ON p.size_type_id = st.id
        INNER JOIN product_categories pc ON p.id = pc.product_id
        INNER JOIN categories c ON pc.category_id = c.id
        WHERE c.url_text = ANY($1)
        AND p.is_active = true
        ORDER BY p.created_at DESC
      `,
        [url_texts]
      );
      return res.rows;
    } catch (err) {
      throw new Error("Erreur lors de la récupération des produits par sous-catégories: " + err.message);
    }
  }

  // Récupère les produits par nom de catégorie principale (incluant sous-catégories)
  static async findByCategoryNames(categoryName) {
    let queryParams = [categoryName];
    try {
      if (!categoryName) {
        throw new Error("Le nom de la catégorie principale est requis");
      }

      let queryText = `
        SELECT DISTINCT ON (p.id)
          p.*,
          json_build_object(
            'id', b.id,
            'name', b.name,
            'logo_url', b.logo_url
          ) as brand,
          json_build_object(
            'id', st.id,
            'name', st.name
          ) as size_type,
          (SELECT json_agg(
            json_build_object(
              'id', c2.id,
              'name', c2.name,
              'url_text', c2.url_text
            )
          ) FROM product_categories pc2
          JOIN categories c2 ON pc2.category_id = c2.id
          WHERE pc2.product_id = p.id) as categories,
          (SELECT json_agg(
            json_build_object(
              'id', pp.id,
              'image_url', pp.image_url,
              'alt_text', pp.alt_text,
              'display_order', pp.display_order
            ) ORDER BY pp.display_order
          ) FROM product_pictures pp WHERE pp.product_id = p.id) as pictures,
          (SELECT json_agg(
            json_build_object(
              'id', pv.id,
              'size_id', pv.size_id,
              'size_name', s.name,
              'stock_quantity', pv.stock_quantity,
              'reserved_quantity', pv.reserved_quantity
            ) ORDER BY s.size_order
          ) FROM product_variants pv
            JOIN sizes s ON pv.size_id = s.id
            WHERE pv.product_id = p.id) as variants
        FROM products p
        LEFT JOIN brands b ON p.brand_id = b.id
        LEFT JOIN size_types st ON p.size_type_id = st.id
        INNER JOIN product_categories pc ON p.id = pc.product_id
        INNER JOIN categories c ON pc.category_id = c.id
        WHERE p.is_active = true
        AND EXISTS (
          SELECT 1 FROM product_variants pv
          WHERE pv.product_id = p.id AND pv.stock_quantity > 0
        )
        AND pc.category_id IN (
          WITH RECURSIVE category_tree AS (
            SELECT id
            FROM categories
            WHERE name = $1 AND parent_id IS NULL
            UNION ALL
            SELECT c.id
            FROM categories c
            INNER JOIN category_tree ct ON c.parent_id = ct.id
          )
          SELECT id FROM category_tree
        )
        ORDER BY p.id, p.created_at DESC
      `;

      const res = await pool.query(queryText, queryParams);
      return res.rows;
    } catch (err) {
      console.error("Erreur détaillée dans findByCategoryNames:", {
        message: err.message,
        stack: err.stack,
        code: err.code,
        detail: err.detail,
        categoryName,
        queryParams
      });
      throw new Error("Erreur lors de la récupération des produits par nom de catégorie principale: " + err.message);
    }
  }

  // Récupère les produits par noms de sous-catégories avec catégorie parente
  static async findBySubcategoryNamesWithParent(subcategoryNames, parentCategoryName) {
    try {
      const subcats = Array.isArray(subcategoryNames)
        ? subcategoryNames.filter(s => s && typeof s === 'string' && s.trim() !== '')
        : typeof subcategoryNames === 'string' && subcategoryNames.trim() !== ''
        ? subcategoryNames.split(',').map(s => s.trim()).filter(s => s !== '')
        : [];

      if (subcats.length === 0) {
        throw new Error("Au moins une sous-catégorie doit être fournie");
      }
      if (!parentCategoryName) {
        throw new Error("Le nom de la catégorie parente est requis");
      }

      let queryText = `
        SELECT DISTINCT ON (p.id)
          p.*,
          json_build_object(
            'id', b.id,
            'name', b.name,
            'logo_url', b.logo_url
          ) as brand,
          json_build_object(
            'id', st.id,
            'name', st.name
          ) as size_type,
          (SELECT json_agg(
            json_build_object(
              'id', c2.id,
              'name', c2.name,
              'url_text', c2.url_text
            )
          ) FROM product_categories pc2
          JOIN categories c2 ON pc2.category_id = c2.id
          WHERE pc2.product_id = p.id) as categories,
          (SELECT json_agg(
            json_build_object(
              'id', pp.id,
              'image_url', pp.image_url,
              'alt_text', pp.alt_text,
              'display_order', pp.display_order
            ) ORDER BY pp.display_order
          ) FROM product_pictures pp WHERE pp.product_id = p.id) as pictures,
          (SELECT json_agg(
            json_build_object(
              'id', pv.id,
              'size_id', pv.size_id,
              'size_name', s.name,
              'stock_quantity', pv.stock_quantity,
              'reserved_quantity', pv.reserved_quantity
            ) ORDER BY s.size_order
          ) FROM product_variants pv
            JOIN sizes s ON pv.size_id = s.id
            WHERE pv.product_id = p.id) as variants
        FROM products p
        LEFT JOIN brands b ON p.brand_id = b.id
        LEFT JOIN size_types st ON p.size_type_id = st.id
        INNER JOIN product_categories pc ON p.id = pc.product_id
        INNER JOIN categories c ON pc.category_id = c.id
        INNER JOIN categories parent_c ON c.parent_id = parent_c.id
        WHERE p.is_active = true
        AND EXISTS (
          SELECT 1 FROM product_variants pv
          WHERE pv.product_id = p.id AND pv.stock_quantity > 0
        )
        AND c.name = ANY($1::text[])
        AND parent_c.name = $2
        ORDER BY p.id, p.created_at DESC
      `;

      const res = await pool.query(queryText, [subcats, parentCategoryName]);
      return res.rows;
    } catch (err) {
      console.error("Erreur détaillée dans findBySubcategoryNamesWithParent:", {
        message: err.message,
        stack: err.stack,
        code: err.code,
        detail: err.detail,
        subcategoryNames,
        parentCategoryName
      });
      throw new Error("Erreur lors de la récupération des produits par noms de sous-catégories avec catégorie parente: " + err.message);
    }
  }

  // Récupère les produits par noms de sous-catégories
  static async findBySubcategoryNames(subcategoryNames) {
    try {
      const subcats = Array.isArray(subcategoryNames)
        ? subcategoryNames.filter(s => s && typeof s === 'string' && s.trim() !== '')
        : typeof subcategoryNames === 'string' && subcategoryNames.trim() !== ''
        ? subcategoryNames.split(',').map(s => s.trim()).filter(s => s !== '')
        : [];

      if (subcats.length === 0) {
        throw new Error("Au moins une sous-catégorie doit être fournie");
      }

      let queryText = `
        SELECT DISTINCT ON (p.id)
          p.*,
          json_build_object(
            'id', b.id,
            'name', b.name,
            'logo_url', b.logo_url
          ) as brand,
          json_build_object(
            'id', st.id,
            'name', st.name
          ) as size_type,
          (SELECT json_agg(
            json_build_object(
              'id', c2.id,
              'name', c2.name,
              'url_text', c2.url_text
            )
          ) FROM product_categories pc2
          JOIN categories c2 ON pc2.category_id = c2.id
          WHERE pc2.product_id = p.id) as categories,
          (SELECT json_agg(
            json_build_object(
              'id', pp.id,
              'image_url', pp.image_url,
              'alt_text', pp.alt_text,
              'display_order', pp.display_order
            ) ORDER BY pp.display_order
          ) FROM product_pictures pp WHERE pp.product_id = p.id) as pictures,
          (SELECT json_agg(
            json_build_object(
              'id', pv.id,
              'size_id', pv.size_id,
              'size_name', s.name,
              'stock_quantity', pv.stock_quantity,
              'reserved_quantity', pv.reserved_quantity
            ) ORDER BY s.size_order
          ) FROM product_variants pv
            JOIN sizes s ON pv.size_id = s.id
            WHERE pv.product_id = p.id) as variants
        FROM products p
        LEFT JOIN brands b ON p.brand_id = b.id
        LEFT JOIN size_types st ON p.size_type_id = st.id
        INNER JOIN product_categories pc ON p.id = pc.product_id
        INNER JOIN categories c ON pc.category_id = c.id
        WHERE p.is_active = true
        AND EXISTS (
          SELECT 1 FROM product_variants pv
          WHERE pv.product_id = p.id AND pv.stock_quantity > 0
        )
        AND c.name = ANY($1::text[])
        ORDER BY p.id, p.created_at DESC
      `;

      const res = await pool.query(queryText, [subcats]);
      return res.rows;
    } catch (err) {
      console.error("Erreur détaillée dans findBySubcategoryNames:", {
        message: err.message,
        stack: err.stack,
        code: err.code,
        detail: err.detail,
        subcategoryNames
      });
      throw new Error("Erreur lors de la récupération des produits par noms de sous-catégories: " + err.message);
    }
  }

  // Récupère les produits en soldes
  static async findSoldes() {
    try {
      const res = await pool.query(
        `
        SELECT
          p.*,
          json_build_object(
            'id', b.id,
            'name', b.name,
            'logo_url', b.logo_url
          ) as brand,
          json_build_object(
            'id', st.id,
            'name', st.name
          ) as size_type,
          (SELECT json_agg(
            json_build_object(
              'id', c.id,
              'name', c.name,
              'url_text', c.url_text
            )
          ) FROM product_categories pc
          JOIN categories c ON pc.category_id = c.id
          WHERE pc.product_id = p.id) as categories,
          (SELECT json_agg(
            json_build_object(
              'id', pp.id,
              'image_url', pp.image_url,
              'alt_text', pp.alt_text,
              'display_order', pp.display_order
            ) ORDER BY pp.display_order
          ) FROM product_pictures pp WHERE pp.product_id = p.id) as pictures,
          (SELECT json_agg(
            json_build_object(
              'id', pv.id,
              'size_id', pv.size_id,
              'size_name', s.name,
              'stock_quantity', pv.stock_quantity,
              'reserved_quantity', pv.reserved_quantity
            ) ORDER BY s.size_order
          ) FROM product_variants pv
            JOIN sizes s ON pv.size_id = s.id
            WHERE pv.product_id = p.id) as variants
        FROM products p
        LEFT JOIN brands b ON p.brand_id = b.id
        LEFT JOIN size_types st ON p.size_type_id = st.id
        WHERE p.promo_price IS NOT NULL
        AND p.promo_price < p.price
        AND p.is_active = true
        ORDER BY p.created_at DESC
      `
      );
      return res.rows;
    } catch (err) {
      throw new Error("Erreur lors de la récupération des produits en soldes: " + err.message);
    }
  }
}

module.exports = Product;