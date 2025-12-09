const { pool } = require("../utils/db");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const schedule = require("node-schedule");
const { sendConfirmationEmail } = require("../utils/email");
const SALT_ROUNDS = 10;
const TOKEN_EXPIRATION_HOURS = 24;

class User {
  // validation du mot de passe
  static validatePassword(password) {
    if (typeof password !== "string" || password.trim() === "") {
      throw new Error("Le mot de passe doit être une chaîne non vide");
    }
    const passwordRegex = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[@$!%*?&])[A-Za-z0-9@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      throw new Error(
        "Le mot de passe doit contenir au moins 8 caractères, une majuscule, un chiffre et un caractère spécial (@$!%*?&)"
      );
    }
    return true;
  }

  // Récupère tous les utilisateurs
  static async findAll() {
    try {
      const res = await pool.query(`
        SELECT u.id, u.firstname, u.lastname, u.email, ut.name AS role, u.newsletter_subscription, u.terms_accepted, u.is_email_verified
        FROM users u
        JOIN user_types ut ON u.user_type_id = ut.id
        ORDER BY u.lastname
      `);
      return res.rows;
    } catch (err) {
      throw new Error("Erreur lors de la récupération des utilisateurs: " + err.message);
    }
  }

  // Récupère un utilisateur par son ID
  static async findById(id) {
    try {
      const res = await pool.query(`
        SELECT u.id, u.firstname, u.lastname, u.email, ut.name AS role, u.password, u.newsletter_subscription, u.terms_accepted, u.is_email_verified
        FROM users u
        JOIN user_types ut ON u.user_type_id = ut.id
        WHERE u.id = $1
      `, [id]);
      if (res.rows.length === 0) {
        throw new Error("Utilisateur non trouvé");
      }
      return res.rows[0];
    } catch (err) {
      throw new Error("Erreur lors de la récupération de l'utilisateur: " + err.message);
    }
  }

  // Recherche un utilisateur par email
  static async findByEmail(email) {
    try {
      const res = await pool.query(`
        SELECT u.*, ut.name AS role
        FROM users u
        JOIN user_types ut ON u.user_type_id = ut.id
        WHERE u.email = $1
      `, [email]);
      return res.rows[0] || null;
    } catch (err) {
      throw new Error("Erreur lors de la recherche par email: " + err.message);
    }
  }

  // Récupère tous les types d'utilisateurs
  static async findAllUserTypes() {
    try {
      const res = await pool.query(`
        SELECT id, name
        FROM user_types
        ORDER BY name
      `);
      return res.rows;
    } catch (err) {
      throw new Error("Erreur lors de la récupération des types d'utilisateurs: " + err.message);
    }
  }

  // Crée un nouvel utilisateur
  static async create({ firstname, lastname, email, password, role = "Utilisateur", newsletter_subscription = false, terms_accepted = false }) {
    let client;
    try {

      // Vérification des champs obligatoires
      if (!firstname || !lastname || !email || !password || terms_accepted === undefined) {
        throw new Error("Tous les champs, y compris l'acceptation des conditions, sont requis");
      }
      // Validation des types de données
      if (typeof firstname !== "string" || typeof lastname !== "string" || typeof email !== "string") {
        throw new Error("Les champs doivent être des chaînes de caractères");
      }
      if (typeof newsletter_subscription !== "boolean" || typeof terms_accepted !== "boolean") {
        throw new Error("Les champs d'abonnement et d'acceptation des conditions doivent être des booléens");
      }
      if (!terms_accepted) {
        throw new Error("L'acceptation des conditions d'utilisation et de la politique de confidentialité est requise");
      }
      // Validation du mot de passe
      this.validatePassword(password);

      // Vérification du rôle
      const roleResult = await pool.query(`SELECT id FROM user_types WHERE name = $1`, [role]);
      if (roleResult.rows.length === 0) {
        throw new Error("Rôle non valide. Les rôles autorisés sont: Utilisateur, Administrateur");
      }
      const user_type_id = roleResult.rows[0].id;

      // Hachage du mot de passe
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

      // Démarrer une transaction
      client = await pool.connect();
      await client.query("BEGIN");

      // Création de l'utilisateur
      const userRes = await client.query(
        `INSERT INTO users (firstname, lastname, email, password, user_type_id, newsletter_subscription, terms_accepted, is_email_verified)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, firstname, lastname, email, user_type_id, newsletter_subscription, terms_accepted, is_email_verified`,
        [firstname, lastname, email, hashedPassword, user_type_id, newsletter_subscription, terms_accepted, false]
      );
      const user = userRes.rows[0];
      user.role = role;

      // Générer un token de confirmation
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + TOKEN_EXPIRATION_HOURS * 60 * 60 * 1000);

      // Insérer dans email_confirmations
      const emailConfirmRes = await client.query(
        `INSERT INTO email_confirmations (user_id, token, expires_at)
         VALUES ($1, $2, $3) RETURNING *`,
        [user.id, token, expiresAt]
      );

      // Valider la transaction
      await client.query("COMMIT");

      // Envoyer l'email de confirmation
      await sendConfirmationEmail(user, token);

      // Programmer la suppression si non confirmé
      schedule.scheduleJob(expiresAt, async () => {
        const checkUser = await this.findById(user.id);
        if (checkUser && !checkUser.is_email_verified) {
          await this.delete(user.id);
          await pool.query("DELETE FROM email_confirmations WHERE user_id = $1", [user.id]);
        }
      });
      return user;
    } catch (err) {
      if (client) {
        await client.query("ROLLBACK");
      }
      //console.error("Error in User.create:", err.message, err.code, err.detail, err.stack);
      if (err.code === "23505") {
        throw new Error("Email déjà utilisé");
      } else if (err.code === "23502") {
        throw new Error("Champ obligatoire manquant");
      } else if (err.code === "23514") {
        throw new Error("Valeur de champ invalide");
      } else if (err.code === "22P02") {
        throw new Error("Type de données invalide");
      }
      throw new Error(`Erreur lors de la création de l'utilisateur: ${err.message}`);
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  // Crée un utilisateur standard
  static async createUser({ firstname, lastname, email, password, newsletter_subscription, terms_accepted }) {
    return this.create({ firstname, lastname, email, password, role: "Utilisateur", newsletter_subscription, terms_accepted });
  }

  // Crée un utilisateur avec rôle spécifique
  static async createAdminUser({ firstname, lastname, email, password, role = "Utilisateur", newsletter_subscription, terms_accepted }) {
    return this.create({ firstname, lastname, email, password, role, newsletter_subscription, terms_accepted });
  }

  // Met à jour un utilisateur
  static async update(id, { firstname, lastname, email, role, password, newsletter_subscription, terms_accepted }) {
    try {
      // Construction dynamique de la requête
      const fields = [];
      const values = [];
      let paramIndex = 1;
      if (firstname !== undefined) {
        fields.push(`firstname = $${paramIndex}`);
        values.push(firstname);
        paramIndex++;
      }
      if (lastname !== undefined) {
        fields.push(`lastname = $${paramIndex}`);
        values.push(lastname);
        paramIndex++;
      }
      if (email !== undefined) {
        fields.push(`email = $${paramIndex}`);
        values.push(email);
        paramIndex++;
      }
      if (role !== undefined) {
        const roleResult = await pool.query(`SELECT id FROM user_types WHERE name = $1`, [role]);
        if (roleResult.rows.length === 0) {
          throw new Error("Rôle non valide. Les rôles autorisés sont: Utilisateur, Administrateur");
        }
        fields.push(`user_type_id = $${paramIndex}`);
        values.push(roleResult.rows[0].id);
        paramIndex++;
      }
      if (password !== undefined) {
        this.validatePassword(password);
        fields.push(`password = $${paramIndex}`);
        values.push(await bcrypt.hash(password, SALT_ROUNDS));
        paramIndex++;
      }
      if (newsletter_subscription !== undefined) {
        fields.push(`newsletter_subscription = $${paramIndex}`);
        values.push(newsletter_subscription);
        paramIndex++;
      }
      if (terms_accepted !== undefined) {
        fields.push(`terms_accepted = $${paramIndex}`);
        values.push(terms_accepted);
        paramIndex++;
      }
      // Vérifie si des champs sont fournis
      if (fields.length === 0) {
        throw new Error("Aucun champ fourni pour la mise à jour");
      }
      values.push(id);
      const query = `UPDATE users SET ${fields.join(", ")} WHERE id = $${paramIndex} RETURNING id, firstname, lastname, email, user_type_id, newsletter_subscription, terms_accepted, is_email_verified`;
      const res = await pool.query(query, values);
      if (res.rows.length === 0) {
        throw new Error("Utilisateur non trouvé");
      }
      const user = res.rows[0];
      const roleResult = await pool.query(`SELECT name FROM user_types WHERE id = $1`, [user.user_type_id]);
      user.role = roleResult.rows[0].name;
      return user;
    } catch (err) {
      if (err.code === "23505") {
        throw new Error("Email déjà utilisé");
      }
      if (err.code === "23502") {
        throw new Error("Champ obligatoire manquant");
      }
      if (err.code === "23514") {
        throw new Error("Valeur de champ invalide");
      }
      if (err.code === "22P02") {
        throw new Error("Type de données invalide");
      }
      if (err.code === "42703") {
        throw new Error("Colonne non trouvée dans la table users");
      }
      throw new Error(`Erreur lors de la mise à jour de l'utilisateur: ${err.message}`);
    }
  }

  // Supprime un utilisateur
  static async delete(id) {
    try {
      const res = await pool.query("DELETE FROM users WHERE id = $1", [id]);
      if (res.rowCount === 0) {
        throw new Error("Utilisateur non trouvé");
      }
    } catch (err) {
      throw new Error(`Erreur lors de la suppression de l'utilisateur: ${err.message}`);
    }
  }

  // Valide les identifiants d'un utilisateur
  static async validateCredentials(email, password) {
    try {
      const user = await this.findByEmail(email);
      if (!user) {
        return null;
      }
      if (!user.is_email_verified) {
        throw new Error("Email non vérifié. Veuillez confirmer votre adresse email.");
      }
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return null;
      }
      return { id: user.id, firstname: user.firstname, lastname: user.lastname, email: user.email, role: user.role, newsletter_subscription: user.newsletter_subscription, terms_accepted: user.terms_accepted, is_email_verified: user.is_email_verified };
    } catch (err) {
      throw new Error("Erreur lors de la validation des credentials: " + err.message);
    }
  }

  // Confirme l'email d'un utilisateur
  static async confirmEmail(token) {
      const res = await pool.query(
        `SELECT * FROM email_confirmations WHERE token = $1 AND expires_at > CURRENT_TIMESTAMP`,
        [token]
      );
      if (res.rows.length === 0) {
        throw new Error("Token invalide ou expiré");
      }
      const { user_id } = res.rows[0];
      await pool.query(`UPDATE users SET is_email_verified = TRUE WHERE id = $1`, [user_id]);
      await pool.query(`DELETE FROM email_confirmations WHERE token = $1`, [token]);
      const user = await this.findById(user_id);
      return user;
  }
}

// Planifier un nettoyage quotidien des comptes non vérifiés
schedule.scheduleJob("0 0 * * *", async () => {
  try {
    const res = await pool.query(`
      SELECT u.id
      FROM users u
      JOIN email_confirmations ec ON u.id = ec.user_id
      WHERE u.is_email_verified = FALSE AND ec.expires_at < CURRENT_TIMESTAMP
    `);
    for (const row of res.rows) {
      await User.delete(row.id);
      await pool.query("DELETE FROM email_confirmations WHERE user_id = $1", [row.id]);
    }
  } catch (err) {
    console.error("Erreur lors du nettoyage des comptes non vérifiés:", err.message);
  }
});

module.exports = User;