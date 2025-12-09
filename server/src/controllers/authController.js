const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const User = require("../models/User");
const { SECRET_KEY, NODE_ENV, COOKIE_SAMESITE } = process.env;

// Fonction utilitaire pour valider et obtenir la valeur SameSite
const getSameSiteConfig = () => {
  const validSameSiteValues = ['Strict', 'Lax', 'None'];
  
  if (!COOKIE_SAMESITE)
    return undefined;

  if(NODE_ENV !== 'production')
    return 'Lax';

  // Valeur par défaut : 'Lax'
  const sameSite = COOKIE_SAMESITE || 'Lax';

  if (!validSameSiteValues.includes(COOKIE_SAMESITE)) {
    console.warn(`Valeur invalide pour COOKIE_SAMESITE: ${COOKIE_SAMESITE}. Aucun attribut sameSite ne sera inclus.`);
    return undefined;
  }
  return sameSite;
};

// Connexion d'un utilisateur
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    // Vérification des champs obligatoires
    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis' });
    }
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }
    // Vérification du mot de passe
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }
    if (!SECRET_KEY) {
      return res.status(500).json({ error: 'Configuration serveur incorrecte' });
    }
    // Génération du token JWT
    const token = jwt.sign({ id: user.id, role: user.role }, SECRET_KEY, { expiresIn: '1h' });
    
    // Configuration du cookie
    const cookieOptions = {
      httpOnly: true,
      secure: NODE_ENV === 'production',
      maxAge: 3600000,
    };
    
    // Ajouter sameSite uniquement si défini et valide
    const sameSite = getSameSiteConfig();
    if (sameSite) {
      cookieOptions.sameSite = sameSite;
    }


    // Définir le cookie
    res.cookie('token', token, cookieOptions);
    
    // Préparation des données utilisateur validées
    const validatedUser = {
      id: user.id,
      firstname: user.firstname && typeof user.firstname === 'string' ? user.firstname : 'Unknown',
      lastname: user.lastname && typeof user.lastname === 'string' ? user.lastname : 'Unknown',
      email: user.email,
      role: user.role || 'Utilisateur',
      avatar: user.avatar || '/imgs/default_avatar.webp',
    };
    res.json({
      message: 'Connexion réussie',
      user: validatedUser,
    });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// Déconnexion d'un utilisateur
const logout = async (req, res) => {
  try {
    // Configuration du cookie
    const cookieOptions = {
      httpOnly: true,
      secure: NODE_ENV === 'production',
    };
    
    // Ajouter sameSite uniquement si défini et valide
    const sameSite = getSameSiteConfig();
    if (sameSite) {
      cookieOptions.sameSite = sameSite;
    }

    // Suppression du cookie de token
    res.clearCookie('token', cookieOptions);
    res.json({ message: 'Déconnexion réussie' });
  } catch (err) {
    console.error('Erreur lors de la déconnexion:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// Vérification de l'authentification
const checkAuth = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }
    // Validation des données utilisateur
    const validatedUser = { ...user };
    if (!user.firstname || typeof user.firstname !== "string") {
      validatedUser.firstname = "Unknown";
    }
    if (!user.lastname) {
      validatedUser.lastname = "Unknown";
    }
    res.json({
      message: "Vérification d'authentification réussie",
      user: {
        id: validatedUser.id,
        firstname: validatedUser.firstname,
        lastname: validatedUser.lastname,
        email: validatedUser.email,
        role: validatedUser.role,
        newsletter_subscription: validatedUser.newsletter_subscription,
        terms_accepted: validatedUser.terms_accepted,
        avatar: validatedUser.avatar || "/imgs/default_avatar.webp",
      },
      isAdmin: validatedUser.role === "Administrateur",
    });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
};

module.exports = { login, logout, checkAuth };