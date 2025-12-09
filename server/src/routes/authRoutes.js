const express = require("express");
const authController = require("../controllers/authController");
const { authMiddleware } = require("../middleware/authMiddleware");
const router = express.Router();

// Route pour la connexion
router.post("/login", authController.login);

// Route pour la déconnexion
router.get("/logout", authController.logout);

// Route pour vérifier l'authentification
router.get("/check", authMiddleware, authController.checkAuth);

module.exports = router;