const xss = require("xss");
const sanitizeHtml = require("sanitize-html");
const fs = require("fs");

// In-memory blacklist for IPs that attempt XSS attacks
const ipBlacklist = new Set();

// Configuration pour le sanitizer XSS
const xssOptions = {
  whiteList: {},
  stripIgnoreTag: true,
  stripIgnoreTagBody: ["script"],
  css: false,
};

// Configuration pour sanitization SVG
const svgSanitizeOptions = {
  allowedTags: ["svg", "path", "circle", "rect", "g", "line", "polyline", "polygon"],
  allowedAttributes: {
    "*": ["fill", "stroke", "width", "height", "viewBox", "d", "cx", "cy", "r", "x", "y"],
  },
};

// Fonction pour détecter les tentatives XSS
function detectXSS(original, sanitized, ip) {
  if (typeof original === "string" && original !== sanitized) {
    console.warn(`Tentative XSS détectée depuis l'IP ${ip} à ${new Date().toISOString()}: Input original: "${original}", Sanitized: "${sanitized}"`);
    ipBlacklist.add(ip);
    return true;
  }
  return false;
}

// Fonction de sanitization récursive pour les objets et tableaux
function deepSanitize(data, ip) {
  if (typeof data === "string") {
    const sanitized = xss(data, xssOptions);
    detectXSS(data, sanitized, ip);
    return sanitized;
  }

  if (Array.isArray(data)) {
    return data.map((item) => deepSanitize(item, ip));
  }

  if (typeof data === "object" && data !== null) {
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = deepSanitize(value, ip);
    }
    return sanitized;
  }

  return data;
}

// Middleware de sécurité
const securityMiddleware = (req, res, next) => {
  try {
    // Récupérer l'IP du client
    const clientIp = req.ip || req.connection.remoteAddress;

    // Vérifier si l'IP est dans la blacklist
    if (ipBlacklist.has(clientIp)) {
      console.warn(`Requête bloquée depuis l'IP bannie ${clientIp} à ${new Date().toISOString()}`);
      return res.status(403).json({ error: "Accès interdit : IP bannie en raison d'une tentative XSS" });
    }

    // Sanitize les paramètres URL
    if (req.params) {
      req.params = deepSanitize(req.params, clientIp);
    }

    // Sanitize la query string
    if (req.query) {
      req.query = deepSanitize(req.query, clientIp);
    }

    // Sanitize le body
    if (req.body) {
      req.body = deepSanitize(req.body, clientIp);
    }

    // Sanitize les headers, en excluant Authorization
    if (req.headers) {
      const headers = { ...req.headers };
      if (headers.authorization) {
        delete headers.authorization;
      }
      req.headers = { ...deepSanitize(headers, clientIp), authorization: req.headers.authorization };
    }

    // Sanitize les fichiers uploadés (SVG uniquement)
    if (req.files || req.file) {
      const files = req.files || (req.file ? [req.file] : []);
      for (const file of files) {
        if (file.mimetype === "image/svg+xml") {
          // Lire le contenu du fichier
          const fileContent = file.buffer
            ? file.buffer.toString("utf8")
            : fs.readFileSync(file.path, "utf8");
          // Sanitizer le contenu SVG
          const sanitizedContent = sanitizeHtml(fileContent, svgSanitizeOptions);
          // Détecter XSS dans les fichiers SVG
          detectXSS(fileContent, sanitizedContent, clientIp);
          // Si le fichier est sur disque, réécrire le contenu sanitizé
          if (!file.buffer) {
            fs.writeFileSync(file.path, sanitizedContent);
          } else {
            // Mettre à jour le buffer pour les fichiers en mémoire
            file.buffer = Buffer.from(sanitizedContent, "utf8");
          }
        }
      }
    }

    // Headers de sécurité supplémentaires
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self' " +
        process.env.CLIENT_URL
    );

    next();
  } catch (err) {
    console.error("Erreur dans securityMiddleware:", err.message);
    res.status(500).json({ error: "Erreur lors de la sanitization des données" });
  }
};

module.exports = securityMiddleware;