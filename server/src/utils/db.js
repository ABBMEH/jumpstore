const { Pool } = require("pg");
const crypto = require("crypto");
const fs = require("fs");
const bcrypt = require("bcrypt");
const SALT_ROUNDS = 10;

// Configuration du pool par défaut pour la base 'postgres'
const defaultPool = new Pool({
  user: process.env.STORE_DB_USER,
  host: process.env.STORE_DB_HOST,
  database: "postgres",
  password: process.env.STORE_DB_PASSWORD,
  port: parseInt(process.env.STORE_DB_PORT, 10),
});

// Configuration du pool pour la base de données principale
const pool = new Pool({
  user: process.env.STORE_DB_USER,
  host: process.env.STORE_DB_HOST,
  database: process.env.STORE_DB_NAME,
  password: process.env.STORE_DB_PASSWORD,
  port: parseInt(process.env.STORE_DB_PORT, 10),
});

// Fonction pour initialiser la base de données
async function initDB() {
  let client;
  try {
    // Connexion à la base par défaut
    client = await defaultPool.connect();
    // Vérifie si la base de données existe
    const dbExists = await client.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [process.env.STORE_DB_NAME]);
    if (dbExists.rows.length === 0) {
      // Création de la base si elle n'existe pas
      await client.query(`CREATE DATABASE ${process.env.STORE_DB_NAME}`);
    }
  } catch (err) {
    console.error("Erreur lors de la connexion à la base postgres ou de la création de store_db:", err.message);
    if (err.code === "ECONNREFUSED") {
      console.error("Impossible de se connecter au serveur PostgreSQL. Vérifiez que PostgreSQL est en cours d'exécution sur localhost:5432 et que les credentials sont corrects.");
    }
    throw new Error(`Échec de l'initialisation de la base de données: ${err.message}`);
  } finally {
    // on libere le client connecté à la DB
    if (client) client.release();
  }
  let dbClient;
  try {
    // Connexion à la base principale
    dbClient = await pool.connect();
    // Création des tables dans l'ordre des dépendances
    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS user_types (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE
      )
    `);
    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS size_types (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE
      )
    `);
    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        url_text VARCHAR(100) NOT NULL,
        parent_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
        image_url VARCHAR(500),
        show_on_navbar BOOLEAN DEFAULT FALSE,
        show_on_home BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        "order" INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS brands (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        url_text VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        logo_url VARCHAR(500),
        show_on_navbar BOOLEAN DEFAULT FALSE,
        show_on_home BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS sizes (
        id SERIAL PRIMARY KEY,
        name VARCHAR(20) NOT NULL,
        size_type_id INTEGER REFERENCES size_types(id) ON DELETE CASCADE,
        size_order INTEGER DEFAULT 0
      )
    `);
    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        url_text VARCHAR(200) UNIQUE NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        promo_price DECIMAL(10,2),
        is_used BOOLEAN DEFAULT FALSE,
        cost DECIMAL(10,2),
        barcode VARCHAR(100),
        brand_id INTEGER REFERENCES brands(id),
        size_type_id INTEGER REFERENCES size_types(id),
        is_active BOOLEAN DEFAULT FALSE,
        is_highlight BOOLEAN DEFAULT FALSE,
        weight DECIMAL(8,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS product_categories (
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
        PRIMARY KEY (product_id, category_id)
      )
    `);
    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS product_pictures (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        image_url VARCHAR(500) NOT NULL,
        alt_text VARCHAR(200),
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS brand_pictures (
        id SERIAL PRIMARY KEY,
        brand_id INTEGER REFERENCES brands(id) ON DELETE CASCADE,
        image_url VARCHAR(500) NOT NULL,
        image_type VARCHAR(50) NOT NULL,
        alt_text VARCHAR(200),
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS product_variants (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        size_id INTEGER REFERENCES sizes(id),
        stock_quantity INTEGER DEFAULT 0,
        reserved_quantity INTEGER DEFAULT 0,
        UNIQUE(product_id, size_id)
      )
    `);
    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        firstname VARCHAR(255) NOT NULL,
        lastname VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        user_type_id INTEGER NOT NULL REFERENCES user_types(id),
        newsletter_subscription BOOLEAN NOT NULL DEFAULT FALSE,
        terms_accepted BOOLEAN NOT NULL DEFAULT FALSE,
        is_email_verified BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS email_confirmations (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS website_params (
        id SERIAL PRIMARY KEY,
        footer_text TEXT,
        color_theme VARCHAR(7)
      )
    `);

    await dbClient.query(`
      CREATE INDEX IF NOT EXISTS idx_product_categories_product_id ON product_categories(product_id);
    `);
    await dbClient.query(`
      CREATE INDEX IF NOT EXISTS idx_product_categories_category_id ON product_categories(category_id);
    `);

    await dbClient.query(`
      CREATE INDEX IF NOT EXISTS idx_products_promo ON products(promo_price, is_active);
    `);

    await dbClient.query(`
      CREATE INDEX IF NOT EXISTS idx_brands_navbar ON brands(show_on_navbar);
    `);
    await dbClient.query(`
      CREATE INDEX IF NOT EXISTS idx_brands_home ON brands(show_on_home);
    `);

    // Insertion des données initiales
    await insertBaseData(dbClient);
  } catch (err) {
    console.error("Erreur lors de l'initialisation des tables:", err.message);
    throw new Error(`Échec de l'initialisation des tables: ${err.message}`);
  } finally {
    // Libération du client
    if (dbClient) dbClient.release(); 
  }
}

// Fonction pour insérer les données de base
async function insertBaseData(dbClient) {
  try {
    // Insertion des types d'utilisateurs si absents
    const userTypesExist = await dbClient.query(`SELECT 1 FROM user_types LIMIT 1`);
    if (userTypesExist.rows.length === 0) {
      await dbClient.query(`
        INSERT INTO user_types (name) VALUES
        ('Administrateur'),
        ('Utilisateur')
      `);
    }
    // Insertion des types de tailles si absents
    const sizeTypesExist = await dbClient.query(`SELECT 1 FROM size_types LIMIT 1`);
    if (sizeTypesExist.rows.length === 0) {
      await dbClient.query(`
        INSERT INTO size_types (name) VALUES
        ('Hauts'),
        ('Bas'),
        ('Chaussures'),
        ('Accessoires')
      `);
    }
    // Insertion des catégories si absentes
    const categoriesExist = await dbClient.query(`SELECT 1 FROM categories LIMIT 1`);
    if (categoriesExist.rows.length === 0) {
      // Insertion des catégories principales
      await dbClient.query(`
        INSERT INTO categories (name, url_text, parent_id, show_on_navbar, show_on_home, "order") VALUES
        ('Chaussures', 'chaussures', NULL, TRUE, TRUE, 1),
        ('Homme', 'homme', NULL, TRUE, TRUE, 2),
        ('Femme', 'femme', NULL, TRUE, TRUE, 3),
        ('Accessoires', 'accessoires', NULL, TRUE, TRUE, 4),
        ('Soldes', 'soldes', NULL, TRUE, TRUE, 5)
      `);
    }
    // Insertion des tailles si absentes
    const sizesExist = await dbClient.query(`SELECT 1 FROM sizes LIMIT 1`);
    if (sizesExist.rows.length === 0) {
      // Récupération des IDs des types de tailles
      const sizeTypes = await dbClient.query(`SELECT id, name FROM size_types`);
      const sizeTypeMap = {};
      sizeTypes.rows.forEach((st) => (sizeTypeMap[st.name] = st.id));
      await dbClient.query(`
        INSERT INTO sizes (name, size_type_id, size_order) VALUES
        -- Tailles pour Hauts
        ('XS', ${sizeTypeMap["Hauts"]}, 1), ('S', ${sizeTypeMap["Hauts"]}, 2),
        ('M', ${sizeTypeMap["Hauts"]}, 3), ('L', ${sizeTypeMap["Hauts"]}, 4),
        ('XL', ${sizeTypeMap["Hauts"]}, 5), ('XXL', ${sizeTypeMap["Hauts"]}, 6),
        -- Tailles pour Bas
        ('28', ${sizeTypeMap["Bas"]}, 1), ('30', ${sizeTypeMap["Bas"]}, 2),
        ('32', ${sizeTypeMap["Bas"]}, 3), ('34', ${sizeTypeMap["Bas"]}, 4),
        ('36', ${sizeTypeMap["Bas"]}, 5), ('38', ${sizeTypeMap["Bas"]}, 6),
        ('40', ${sizeTypeMap["Bas"]}, 7), ('42', ${sizeTypeMap["Bas"]}, 8),
        ('44', ${sizeTypeMap["Bas"]}, 9), ('46', ${sizeTypeMap["Bas"]}, 10),
        ('48', ${sizeTypeMap["Bas"]}, 11), ('50', ${sizeTypeMap["Bas"]}, 12),
        -- Tailles pour Chaussures
        ('31', ${sizeTypeMap["Chaussures"]}, 1), ('32', ${sizeTypeMap["Chaussures"]}, 2),
        ('33', ${sizeTypeMap["Chaussures"]}, 3), ('34', ${sizeTypeMap["Chaussures"]}, 4),
        ('35', ${sizeTypeMap["Chaussures"]}, 5), ('36', ${sizeTypeMap["Chaussures"]}, 6),
        ('37', ${sizeTypeMap["Chaussures"]}, 7), ('38', ${sizeTypeMap["Chaussures"]}, 8),
        ('39', ${sizeTypeMap["Chaussures"]}, 9), ('40', ${sizeTypeMap["Chaussures"]}, 10),
        ('41', ${sizeTypeMap["Chaussures"]}, 11), ('42', ${sizeTypeMap["Chaussures"]}, 12),
        ('43', ${sizeTypeMap["Chaussures"]}, 13), ('44', ${sizeTypeMap["Chaussures"]}, 14),
        ('45', ${sizeTypeMap["Chaussures"]}, 15), ('46', ${sizeTypeMap["Chaussures"]}, 16),
        ('47', ${sizeTypeMap["Chaussures"]}, 17), ('48', ${sizeTypeMap["Chaussures"]}, 18),
        -- Tailles pour Accessoires
        ('Unique', ${sizeTypeMap["Accessoires"]}, 1)
      `);
    }
    // Insertion des paramètres de site si absents
    const websiteParamsExist = await dbClient.query(`SELECT 1 FROM website_params LIMIT 1`);
    if (websiteParamsExist.rows.length === 0) {
      await dbClient.query(`
        INSERT INTO website_params (footer_text, color_theme) VALUES
        ('© 2025 JumpStore. Tous droits réservés.', '#000000')
      `);
    }
    // Vérification et création d'un admin par défaut
    const adminExists = await dbClient.query(`SELECT * FROM users WHERE user_type_id = (SELECT id FROM user_types WHERE name = 'Administrateur')`);
    if (adminExists.rows.length === 0) {
      const adminPassword = "Admin1234@";
      const hashedPassword = await bcrypt.hash(adminPassword, SALT_ROUNDS);
      console.warn("Super Admin added: admin@admin.com:" + adminPassword);
      await dbClient.query(`
        INSERT INTO users (firstname, lastname, email, password, user_type_id, newsletter_subscription, terms_accepted, is_email_verified)
        VALUES ($1, $2, $3, $4, (SELECT id FROM user_types WHERE name = 'Administrateur'), $5, $6, $7)
      `, ["Admin", "Super", "admin@admin.com", hashedPassword, false, true, true]);
    }
  } catch (err) {
    console.error("Erreur lors de l'insertion des données de base:", err.message);
  }
}

module.exports = { pool, initDB };