require("dotenv").config();
const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/usersRoutes");
const productManagement_routes = require("./routes/productManagementRoutes");
const websiteParamsRoutes = require("./routes/websiteParamsRoutes");
const { initDB } = require("./utils/db");
const path = require("path");
const securityMiddleware = require('./middleware/securityMiddleware');

// Initialisation de l'application Express
const app = express();
const PORT = process.env.SERVER_PORT;

// Configuration du rate limiter : 1500 requettes toutes les 10 minutes par ip
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 1500,
  message: {
    error: "Trop de requêtes depuis cette IP, veuillez réessayer plus tard"
  },
  standardHeaders: true, // Inclut les en-têtes RateLimit-*
  legacyHeaders: false,
});

// Liste des origines autorisées pour CORS
const allowedOrigins = [`${process.env.CLIENT_URL}`];
app.use(
  cors({
    // Vérifie si l'origine est autorisée
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true, // Autorise les cookies cross-origin
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // Méthodes HTTP autorisées
    allowedHeaders: ["Content-Type", "Authorization", "Cache-Control"], // En-têtes autorisés
    exposedHeaders: ["Set-Cookie"], // Expose le cookie dans les réponses
  })
);

// Applique le rate limiter à toutes les routes
app.use(limiter);

// Middleware pour parser les requêtes JSON
app.use(express.json());
// Middleware pour parser les cookies
app.use(cookieParser());
// Sert les fichiers statiques depuis le dossier uploads
app.use("/uploads", express.static(path.join(__dirname, "../Uploads")));

// Initialisation de la base de données
initDB()
  .then(() => {
    console.log("Base de données initialisée");
  })
  .catch((err) => {
    console.error("Erreur lors de l'initialisation de la DB:", err);
  });

// middleware pour sanitize les requettes entrantes
app.use(securityMiddleware);

// Définition des routes de l'API
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/product", productManagement_routes);
app.use("/api/website-params", websiteParamsRoutes);

// Gestion globale des erreurs
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Erreur serveur" });
});

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`Serveur lancé et en écoute sur le port ${PORT}`);
});