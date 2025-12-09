const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Définition des répertoires pour les uploads
const uploadDir = path.join(__dirname, "../../Uploads");
const brandDir = path.join(uploadDir, "brands");
const productDir = path.join(uploadDir, "products");
const logoDir = path.join(uploadDir, "logos");
const categoryDir = path.join(uploadDir, "product-categories");

// Création des répertoires s'ils n'existent pas
[uploadDir, brandDir, productDir, logoDir, categoryDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configuration du stockage pour Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Détermine le répertoire en fonction du type de fichier
    if (file.fieldname === "logo") {
      cb(null, logoDir);
    } else if (file.fieldname === "pictures") {
      cb(null, brandDir);
    } else if (file.fieldname === "p-pictures") {
      cb(null, productDir);
    } else if (file.fieldname === "image") {
      cb(null, categoryDir);
    }
  },
  filename: (req, file, cb) => {
    // Génère un nom de fichier unique avec un suffixe aléatoire
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

// Filtre pour limiter les types de fichiers acceptés
const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true); // Accepte le fichier
  } else {
    cb(new Error("Invalid file type. Only PNG, JPG, JPEG, SVG, and WebP are allowed."), false); // Rejette le fichier
  }
};

// Configuration finale de Multer
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limite à 5MB
});

module.exports = upload;