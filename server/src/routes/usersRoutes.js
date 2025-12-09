const express = require("express");
const userController = require("../controllers/userController");
const { authMiddleware, adminMiddleware } = require("../middleware/authMiddleware");
// Initialisation du routeur Express
const router = express.Router();
// Route pour récupérer tous les types d'utilisateurs (admin uniquement)
router.get("/user-types", authMiddleware, adminMiddleware, userController.getAllUserTypes);
// Route pour l'inscription d'un utilisateur
router.post("/register", userController.createUser);
// Route pour confirmer l'email
router.get("/confirm-email", userController.confirmEmail);
// Route pour la création d'un utilisateur par un admin
router.post("/admin/create", authMiddleware, adminMiddleware, userController.createAdminUser);
// Route pour mettre à jour son propre profil
router.put("/profile", authMiddleware, userController.updateOwnProfile);
// Route pour récupérer tous les utilisateurs (admin uniquement)
router.get("/", authMiddleware, adminMiddleware, userController.getAllUsers);
// Route pour récupérer un utilisateur par ID (admin uniquement)
router.get("/:id", authMiddleware, adminMiddleware, userController.getUserById);
// Route pour mettre à jour un utilisateur (admin uniquement)
router.put("/:id", authMiddleware, adminMiddleware, userController.updateUser);
// Route pour supprimer un utilisateur (admin uniquement)
router.delete("/:id", authMiddleware, adminMiddleware, userController.deleteUser);
module.exports = router;