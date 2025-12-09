const User = require("../models/User");
const jwt = require("jsonwebtoken");

const userController = {
  // Récupérer tous les utilisateurs
  getAllUsers: async (req, res) => {
    try {
      const users = await User.findAll();
      res.json(users);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  // Récupérer un utilisateur par ID
  getUserById: async (req, res) => {
    try {
      const user = await User.findById(req.params.id);
      res.json(user);
    } catch (err) {
      res.status(404).json({ error: err.message });
    }
  },

  // Récupérer tous les types d'utilisateurs
  getAllUserTypes: async (req, res) => {
    try {
      const userTypes = await User.findAllUserTypes();
      res.json(userTypes);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  // Créer un utilisateur standard
  createUser: async (req, res) => {
    try {
      const user = await User.createUser(req.body);
      res.status(201).json({ message: "Utilisateur créé. Veuillez vérifier votre email pour confirmer votre compte.", user });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },

  // Créer un utilisateur par un admin
  createAdminUser: async (req, res) => {
    try {
      const user = await User.createAdminUser(req.body);
      res.status(201).json({ message: "Utilisateur créé par l'admin. Veuillez vérifier votre email pour confirmer votre compte.", user });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },

  // Mettre à jour son propre profil
  updateOwnProfile: async (req, res) => {
    try {
      const userId = req.user.id;
      const user = await User.update(userId, req.body);
      res.json({ message: "Profil mis à jour avec succès", user});
    } catch (err) {
      res.status(400).json({ error: "Erreur lors de la mise à jour du profil utilisateur" });
    }
  },

  // Mettre à jour un utilisateur (admin uniquement)
  updateUser: async (req, res) => {
    try {
      const user = await User.update(req.params.id, req.body);
      res.json(user);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },

  // Supprimer un utilisateur
  deleteUser: async (req, res) => {
    try {
      await User.delete(req.params.id);
      res.json({ message: "Utilisateur supprimé" });
    } catch (err) {
      res.status(404).json({ error: err.message });
    }
  },

  // Confirmer l'email
  confirmEmail: async (req, res) => {
    try {
      const { token } = req.query;
      if (!token) {
        return res.status(400).json({ error: "Token requis" });
      }
      const user = await User.confirmEmail(token);
      res.json({ message: "Email confirmé avec succès", "useremail": user.email });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },
};

module.exports = userController;