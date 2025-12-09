import { API_URL } from "../../env.js";
import { ApiClient } from "../../utils/api.js";

// Cacher le corps de la page jusqu'à l'authentification
document.body.style.display = "none";

document.addEventListener("DOMContentLoaded", () => {
  // Mettre à jour l'interface utilisateur avec les données de l'utilisateur
  const updateUserInterface = (user) => {
    const userNameElement = document.getElementById("user-name");
    const userRoleElement = document.getElementById("user-role");
    const userAvatarElement = document.getElementById("user-avatar-img");
    const homeItem = document.getElementById("home-item");
    const mobileUserAvatarImg = document.getElementById("mobile-user-avatar-img");
    const mobileHomeItem = document.getElementById("mobile-home-item");
    // Vérifier si l'utilisateur existe avant de mettre à jour
    if (user) {
      if (userNameElement) userNameElement.textContent = `${user.firstName} ${user.lastName}`.trim() || "Utilisateur";
      if (userRoleElement) userRoleElement.textContent = user.role || "Utilisateur";
      if (userAvatarElement) userAvatarElement.src = user.avatar || "/imgs/default_avatar.webp";
      // Afficher les éléments spécifiques aux administrateurs
      if (homeItem && user.role === "Administrateur") {
        homeItem.style.display = "table-row";
      }
      if (mobileUserAvatarImg) mobileUserAvatarImg.src = user.avatar || "/imgs/default_avatar.webp";
      if (mobileHomeItem && user.role === "Administrateur") {
        mobileHomeItem.style.display = "table-row";
      }
    }
  };

  // Afficher un message d'erreur temporaire
  const showError = (message) => {
    const errorMessage = document.getElementById("error-message");
    if (errorMessage) {
      errorMessage.textContent = message;
      errorMessage.style.display = "block";
      // Cacher le message après 5 secondes
      setTimeout(() => {
        errorMessage.style.display = "none";
      }, 5000);
    }
  };

  // Vérifier l'authentification de l'utilisateur
  const checkAuth = async () => {
    try {
      const data = await ApiClient.get("/auth/check", true);
      // Vérifier si les données de l'utilisateur sont complètes
      if (data.user && data.user.email && data.user.role) {
        if (data.user.role !== "Administrateur") {
          // Rediriger si l'utilisateur n'est pas administrateur
          window.location.href = "/pages/login/login.html?reason=not_admin";
          return null;
        }
        // Authentification réussie, afficher la page
        document.body.style.display = "";
        return data.user;
      } else {
        // Données utilisateur incomplètes
        window.location.href = "/pages/login/login.html?reason=invalid_data";
        return null;
      }
    } catch (err) {
      window.location.href = "/pages/login/login.html?reason=auth_error";
      return null;
    }
  };

  // Gérer la déconnexion de l'utilisateur
  const logout = async () => {
    // Demander confirmation avant déconnexion
    if (confirm("Êtes-vous sûr de vouloir vous déconnecter ?")) {
      try {
        await ApiClient.get("/auth/logout", true);
        // Rediriger vers la page de connexion après déconnexion
        window.location.href = "/pages/login/login.html";
      } catch (err) {
        showError("Erreur lors de la déconnexion. Veuillez réessayer.");
      }
    }
  };

  // Configurer les écouteurs pour la navigation au clavier des boutons admin
  const setupAdminButtonListeners = () => {
    const adminButtons = document.querySelectorAll(".admin-button");
    adminButtons.forEach((button) => {
      button.addEventListener("keydown", (event) => {
        // Simuler un clic sur Entrée ou Espace
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          button.click();
        }
      });
    });
  };

  // Fonctions dépréciées pour compatibilité
  window.getCurrentUser = async function () {
    // Avertissement pour utilisation dépréciée
    return await checkAuth();
  };

  window.isUserLoggedIn = async function () {
    // Vérifier si l'utilisateur est connecté
    const user = await checkAuth();
    return !!user;
  };

  // Exécuter la vérification d'authentification et configurer les écouteurs
  (async () => {
    const user = await checkAuth();
    if (user) {
      // Attacher l'écouteur pour le bouton de déconnexion
      const logoutButton = document.getElementById("logout-button");
      if (logoutButton) {
        logoutButton.addEventListener("click", logout);
      }
      // Configurer la navigation au clavier pour les boutons admin
      setupAdminButtonListeners();
      // Mettre à jour l'interface avec les données utilisateur
      updateUserInterface(user);
    }
  })();
});