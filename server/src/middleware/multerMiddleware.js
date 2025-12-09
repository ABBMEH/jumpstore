const upload = require("../utils/multer");

// Middleware pour gérer les uploads de fichiers pour les marques
const brandFileUpload = upload.fields([
  { name: "logo", maxCount: 1 },
  { name: "pictures", maxCount: 10 },
]);

// Middleware pour gérer les uploads de fichiers pour les produits
const productFileUpload = upload.fields([{ name: "p-pictures", maxCount: 10 }]);

// Middleware pour gérer l'upload d'une seule image pour les catégories de produits
const productCategoryFileUpload = upload.single("image");

module.exports = {
  brandFileUpload,
  productFileUpload,
  productCategoryFileUpload,
};