import { API_URL } from "../../env.js";
import { ApiClient } from "../../utils/api.js";

// Objet global pour stocker les paramètres du site, y compris les données utilisateur
const websiteParams = {
  user: null,
};

// Masquer le corps de la page jusqu'à vérification de l'authentification
document.body.style.display = "none";

document.addEventListener("DOMContentLoaded", () => {
  // Afficher un message d'erreur à l'utilisateur
  const showError = (message) => {
    const errorInput = document.getElementById("error-input");
    const successMessage = document.getElementById("success-message");
    if (errorInput && successMessage) {
      successMessage.style.display = "none"; // Cacher le message de succès
      errorInput.value = message;
      errorInput.style.display = "block";
    }
  };

  // Afficher un message de succès
  const showSuccess = (message) => {
    const errorInput = document.getElementById("error-input");
    const successMessage = document.getElementById("success-message");
    if (errorInput && successMessage) {
      errorInput.style.display = "none"; // Cacher le message d'erreur
      successMessage.textContent = message;
      successMessage.style.display = "block";
      setTimeout(() => {
        successMessage.style.display = "none";
      }, 3000);
    }
  };

  // Vérifier l'authentification de l'utilisateur
  const checkAuth = async () => {
    try {
      const data = await ApiClient.get("/auth/check", true);
      if (data.user && data.user.email && data.user.role) {
        // Authentification réussie, afficher la page
        document.body.style.display = "";
        websiteParams.user = data.user; // Stocker toutes les données utilisateur
        return data.user;
      } else {
        // Données utilisateur incomplètes
        window.location.href = "/pages/login/login.html?reason=invalid_data";
        return null;
      }
    } catch (err) {
      console.error("Erreur lors de la vérification de l'authentification :", err);
      window.location.href = "/pages/login/login.html?reason=auth_error";
      return null;
    }
  };

  // Remplir le formulaire avec les données utilisateur
  const populateForm = (user) => {
    const firstnameInput = document.getElementById("firstname");
    const lastnameInput = document.getElementById("lastname");
    const emailInput = document.getElementById("email");
    const newsletterInput = document.getElementById("newsletter");
    if (user) {
      if (firstnameInput) firstnameInput.value = user.firstname || "";
      if (lastnameInput) lastnameInput.value = user.lastname || "";
      if (emailInput) emailInput.value = user.email || "";
      if (newsletterInput) newsletterInput.checked = user.newsletter_subscription || false;
    }
  };

  // Basculer la visibilité d'un champ de mot de passe
  const togglePasswordVisibility = (inputId, toggleId) => {
    const input = document.getElementById(inputId);
    const toggle = document.getElementById(toggleId);
    if (input && toggle) {
      const isPassword = input.type === "password";
      input.type = isPassword ? "text" : "password";
      if(isPassword)
      {
        toggle.classList.toggle("fa-eye", false)
        toggle.classList.toggle("fa-eye-slash", true);
      }
      else
      {
        toggle.classList.toggle("fa-eye", true)
        toggle.classList.toggle("fa-eye-slash", false);
      }
      
      toggle.setAttribute("aria-label", isPassword ? "Masquer le mot de passe" : "Afficher le mot de passe");
    }
  };

  // Basculer la visibilité des champs de nouveau mot de passe et confirmation
  const toggleNewPasswordVisibility = () => {
    const newPasswordInput = document.getElementById("newPassword");
    const confirmNewPasswordInput = document.getElementById("confirmNewPassword");
    const toggleNewPassword = document.getElementById("toggleNewPassword");
    const toggleConfirmNewPassword = document.getElementById("toggleConfirmNewPassword");
    if (newPasswordInput && confirmNewPasswordInput && toggleNewPassword && toggleConfirmNewPassword) {
      const isPassword = newPasswordInput.type === "password";
      newPasswordInput.type = isPassword ? "text" : "password";
      confirmNewPasswordInput.type = isPassword ? "text" : "password";
      if(isPassword)
      {
        toggleNewPassword.classList.toggle("fa-eye", false)
        toggleNewPassword.classList.toggle("fa-eye-slash", true);
        toggleConfirmNewPassword.classList.toggle("fa-eye", false)
        toggleConfirmNewPassword.classList.toggle("fa-eye-slash", true);
      }
      else
      {
        toggleNewPassword.classList.toggle("fa-eye", true)
        toggleNewPassword.classList.toggle("fa-eye-slash", false);
        toggleConfirmNewPassword.classList.toggle("fa-eye", true)
        toggleConfirmNewPassword.classList.toggle("fa-eye-slash", false);
      }

      const label = isPassword ? "Masquer le nouveau mot de passe" : "Afficher le nouveau mot de passe";
      toggleNewPassword.setAttribute("aria-label", label);
      toggleConfirmNewPassword.setAttribute("aria-label", label);
    }
  };

  // Configurer les boutons de bascule pour les mots de passe
  const setupPasswordToggles = () => {
    const toggleCurrentPassword = document.getElementById("toggleCurrentPassword");
    const toggleNewPassword = document.getElementById("toggleNewPassword");
    const toggleConfirmNewPassword = document.getElementById("toggleConfirmNewPassword");

    if (toggleCurrentPassword) {
      toggleCurrentPassword.addEventListener("click", () => togglePasswordVisibility("currentPassword", "toggleCurrentPassword"));
      toggleCurrentPassword.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          togglePasswordVisibility("currentPassword", "toggleCurrentPassword");
        }
      });
    }

    if (toggleNewPassword) {
      toggleNewPassword.addEventListener("click", toggleNewPasswordVisibility);
      toggleNewPassword.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          toggleNewPasswordVisibility();
        }
      });
    }

    if (toggleConfirmNewPassword) {
      toggleConfirmNewPassword.addEventListener("click", toggleNewPasswordVisibility);
      toggleConfirmNewPassword.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          toggleNewPasswordVisibility();
        }
      });
    }
  };

  // Gérer la soumission du formulaire de mise à jour du profil
  const handleFormSubmit = async (event) => {
    event.preventDefault();
    // Clear the error input on button click
    const errorInput = document.getElementById("error-input");
    if (errorInput) {
      errorInput.value = "";
      errorInput.style.display = "none";
    }

    const firstname = document.getElementById("firstname").value.trim();
    const lastname = document.getElementById("lastname").value.trim();
    const email = document.getElementById("email").value.trim();
    const currentPassword = document.getElementById("currentPassword").value.trim();
    const newPassword = document.getElementById("newPassword").value.trim();
    const confirmNewPassword = document.getElementById("confirmNewPassword").value.trim();
    const newsletter = document.getElementById("newsletter").checked;

    // Vérifier qu'au moins un champ est rempli
    if (!firstname && !lastname && !email && !newPassword && !confirmNewPassword && newsletter === websiteParams.user.newsletter_subscription) {
      showError("Veuillez remplir au moins un champ pour effectuer une mise à jour");
      return;
    }

    const updateData = {};
    const currentUser = websiteParams.user || {};

    // Inclure le prénom si modifié
    if (firstname && firstname !== currentUser.firstname) {
      updateData.firstname = firstname;
    }

    // Inclure le nom si modifié
    if (lastname && lastname !== currentUser.lastname) {
      updateData.lastname = lastname;
    }

    // Vérifier la mise à jour de l'email
    if (email && email !== currentUser.email) {
      if (!currentPassword) {
        showError("Le mot de passe actuel est requis pour modifier l'email");
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showError("Veuillez entrer un email valide");
        return;
      }
      updateData.email = email;
      updateData.currentPassword = currentPassword;
    }

    // Vérifier la mise à jour du mot de passe
    if (newPassword || confirmNewPassword) {
      if (newPassword !== confirmNewPassword) {
        showError("Les nouveaux mots de passe ne correspondent pas");
        return;
      }
      if (!currentPassword) {
        showError("Le mot de passe actuel est requis pour modifier le mot de passe");
        return;
      }
      if (!newPassword) {
        showError("Le nouveau mot de passe ne peut pas être vide");
        return;
      }
      updateData.newPassword = newPassword;
      updateData.confirmNewPassword = confirmNewPassword;
      updateData.currentPassword = currentPassword;
    }

    // Inclure l'abonnement à la newsletter si modifié
    if (newsletter !== currentUser.newsletter_subscription) {
      updateData.newsletter_subscription = newsletter;
    }

    // Vérifier si des modifications ont été apportées
    if (Object.keys(updateData).length === 0) {
      showError("Aucune modification détectée");
      return;
    }

      const responseData = await ApiClient.put("/users/profile", updateData, true);
      if (responseData.error) {
        showError(responseData.error);
        return;
      }


      // Afficher un message de succès
      if(responseData.message === "Profil mis à jour avec succès")
        showSuccess("Profil mis à jour avec succès");

      // Mettre à jour les données utilisateur
      websiteParams.user = responseData.user;

      // Mettre à jour l'interface de la barre de navigation
      const user = responseData.user;
      const userNameElement = document.getElementById("user-name");
      const userRoleElement = document.getElementById("user-role");
      const userAvatarElement = document.getElementById("user-avatar-img");
      const mobileUserAvatarImg = document.getElementById("mobile-user-avatar-img");
      if (userNameElement) userNameElement.textContent = `${user.firstname || ""} ${user.lastname || ""}`.trim() || "Utilisateur";
      if (userRoleElement) userRoleElement.textContent = user.role || "Utilisateur";
      if (userAvatarElement) userAvatarElement.src = user.avatar || "/imgs/default_avatar.webp";
      if (mobileUserAvatarImg) mobileUserAvatarImg.src = user.avatar || "/imgs/default_avatar.webp";

      // Vider les champs de mot de passe après mise à jour
      document.getElementById("currentPassword").value = "";
      document.getElementById("newPassword").value = "";
      document.getElementById("confirmNewPassword").value = "";
  };

  // Initialiser l'authentification et le formulaire
  (async () => {
    const user = await checkAuth();
    if (user) {
      populateForm(user);
      const profileForm = document.getElementById("profile-form");
      if (profileForm) {
        profileForm.addEventListener("submit", handleFormSubmit);
      }
      setupPasswordToggles();
    }
  })();
});