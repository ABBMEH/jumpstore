const express = require("express");
const websiteParamsController = require("../controllers/websiteParamsController");
const { authMiddleware, adminMiddleware } = require("../middleware/authMiddleware");

// Initialisation du routeur Express
const router = express.Router();

// Route pour récupérer les paramètres du site
router.get("/", websiteParamsController.getWebsiteParams);
// Route pour mettre à jour les paramètres du site (admin uniquement)
router.put("/", authMiddleware, adminMiddleware, websiteParamsController.updateWebsiteParams);

module.exports = router;