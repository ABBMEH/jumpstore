import { API_URL } from "../../env.js";
import { ApiClient } from "../../utils/api.js";

// Masquer la page jusqu'à la vérification de l'authentification
document.body.style.display = "none";

document.addEventListener("DOMContentLoaded", () => {
  // Fonction pour afficher un message d'erreur ou de succès
  const showMessage = (message, isError = true) => {
    const messageElement = document.getElementById("message");
    if (messageElement) {
      messageElement.textContent = message;
      messageElement.className = `message ${isError ? "error-message" : "success-message"}`;
      messageElement.style.display = "block";
      setTimeout(() => {
        messageElement.style.display = "none";
      }, 5000);
    }
  };

  // Vérifie si l'utilisateur est authentifié et a le rôle d'administrateur
  const checkAuth = async () => {
    try {
      // Utilisation de ApiClient pour vérifier l'authentification
      const response = await ApiClient.get("/auth/check", true);
      if (response.user && response.user.email && response.user.role) {
        if (response.user.role !== "Administrateur") {
          // Si l'utilisateur n'est pas administrateur, redirection vers la page de connexion
          window.location.href = "/pages/login/login.html?reason=not_admin";
          return null;
        }
        // Authentification réussie, afficher la page
        document.body.style.display = "";
        return response.user;
      } else {
        window.location.href = "/pages/login/login.html?reason=invalid_data";
        return null;
      }
    } catch (err) {
      window.location.href = "/pages/login/login.html?reason=auth_error";
      return null;
    }
  };

  // Récupère les paramètres du site via l'API
  const fetchWebsiteParams = async () => {
    try {
      // Appel à l'API pour obtenir les paramètres du site
      const data = await ApiClient.get("/website-params", true);
      return data;
    } catch (err) {
      console.error("Erreur dans fetchWebsiteParams:", err.message);
      showMessage("Impossible de charger les paramètres du site. Veuillez réessayer.", true);
      return null;
    }
  };

  // Remplit le formulaire avec les paramètres récupérés
  const populateForm = (params) => {
    const footerTextInput = document.getElementById("footer-text");
    const colorThemeInput = document.getElementById("color-theme");
    if (params) {
      if (footerTextInput) footerTextInput.value = params.footer_text || "";
      if (colorThemeInput) colorThemeInput.value = params.color_theme || "#000000";
    }
  };

  // Envoie une requête PUT pour mettre à jour les paramètres du site
  const saveWebsiteParams = async (footer_text, color_theme) => {
    try {
      // Création du corps de la requête
      const body = {};
      if (footer_text) body.footer_text = footer_text.trim();
      if (color_theme) body.color_theme = color_theme;

      // Vérification que le corps contient au moins un champ
      if (Object.keys(body).length === 0) {
        showMessage("Veuillez fournir au moins un champ à mettre à jour.", true);
        return;
      }

      // Envoi de la requête de mise à jour via ApiClient
      const data = await ApiClient.put("/website-params", body, true);
      // Suppression du cache localStorage pour websiteParams
      localStorage.removeItem("websiteParams");
      // Déclenchement d'un événement personnalisé pour notifier les autres composants
      const event = new CustomEvent("websiteParamsUpdated", {
        detail: { params: data.params },
      });
      document.dispatchEvent(event);
      showMessage("Paramètres du site mis à jour avec succès.", false);
      populateForm(data.params);
    } catch (err) {
      showMessage(err.message, true);
    }
  };

  // Configure l'écouteur d'événements pour le formulaire
  const setupFormListener = () => {
    // Sélection de l'élément du formulaire dans le DOM
    const form = document.getElementById("website-params-form");
    if (form) {
      // Ajout d'un écouteur pour l'événement submit
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        // Récupération des valeurs des champs du formulaire
        const footerTextInput = document.getElementById("footer-text");
        const colorThemeInput = document.getElementById("color-theme");
        const footer_text = footerTextInput?.value;
        const color_theme = colorThemeInput?.value;
        // Appel de la fonction pour sauvegarder les paramètres
        await saveWebsiteParams(footer_text, color_theme);
      });
    }
  };

  // Initialisation de la page
  (async () => {
    // Vérification de l'authentification de l'utilisateur
    const user = await checkAuth();
    if (user) {
      // Récupération des paramètres du site
      const params = await fetchWebsiteParams();
      // Remplissage du formulaire avec les paramètres
      populateForm(params);
      // Configuration des écouteurs d'événements
      setupFormListener();
    }
  })();
});