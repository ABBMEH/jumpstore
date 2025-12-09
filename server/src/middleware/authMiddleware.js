require("dotenv").config();
const jwt = require("jsonwebtoken");
const { pool } = require("../utils/db");
const SECRET_KEY = process.env.SECRET_KEY;

// Middleware pour vérifier l'authentification
const authMiddleware = async (req, res, next) => {
  let token;
  // Vérification du token dans les cookies
  token = req.cookies.token;
  // Si pas de token dans les cookies, vérifie l'en-tête Authorization
  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }
  }
  if (!token) {
    return res.status(401).json({ error: "Accès non autorisé: Token manquant" });
  }
  try {
    // Vérification et décodage du token JWT
    const decoded = jwt.verify(token, SECRET_KEY);
    // Récupérer le rôle depuis la table user_types
    const roleResult = await pool.query(`
      SELECT ut.name
      FROM users u
      JOIN user_types ut ON u.user_type_id = ut.id
      WHERE u.id = $1
    `, [decoded.id]);
    if (roleResult.rows.length === 0) {
      return res.status(401).json({ error: "Utilisateur non trouvé" });
    }
    req.user = { ...decoded, role: roleResult.rows[0].name };
    next();
  } catch (err) {
    res.status(401).json({ error: `Token invalide ou expiré: ${err.message}` });
  }
};

// Middleware pour vérifier le rôle administrateur
const adminMiddleware = (req, res, next) => {
  // Vérifie si l'utilisateur a le rôle Administrateur
  if (req.user.role !== "Administrateur") {
    return res.status(403).json({ error: "Accès refusé: Administrateur requis" });
  }
  next();
};

module.exports = { authMiddleware, adminMiddleware };