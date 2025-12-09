import { API_URL } from "../../env.js";
import { ApiClient } from "../../utils/api.js";

document.addEventListener("DOMContentLoaded", () => {
  // Récupération des éléments du DOM
  const registerForm = document.getElementById("register-form");
  const errorMessage = document.getElementById("error-message");
  const successMessage = document.getElementById("success-message");

  // Fonction pour afficher un message d'erreur ou de succès
  const showMessage = (message, type = "error") => {
    // Cacher les deux messages avant d'afficher le nouveau
    errorMessage.style.display = "none";
    successMessage.style.display = "none";
    const element = type === "error" ? errorMessage : successMessage;
    element.textContent = message;
    element.style.display = "block";
  };

  // Validation du mot de passe avec des critères spécifiques
  const validatePassword = (password) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[@$!%*?&]/.test(password);
    if (password.length < minLength) {
      return "Le mot de passe doit contenir au moins 8 caractères";
    }
    if (!hasUpperCase) {
      return "Le mot de passe doit contenir au moins une lettre majuscule";
    }
    if (!hasLowerCase) {
      return "Le mot de passe doit contenir au moins une lettre minuscule";
    }
    if (!hasNumbers) {
      return "Le mot de passe doit contenir au moins un chiffre";
    }
    if (!hasSpecialChar) {
      return "Le mot de passe doit contenir au moins un caractère spécial (@$!%*?&)";
    }
    return null;
  };

  // Validation des champs booléens
  const validateBoolean = (value, fieldName) => {
    if (value === undefined) return `Le champ ${fieldName} est requis`;
    if (typeof value !== "boolean") return `Le champ ${fieldName} doit être une case à cocher`;
    return null;
  };

  // Validation complète du formulaire
  const validateForm = (formData) => {
    const { firstname, lastname, email, password, confirmPassword, terms_accepted, newsletter_subscription } = formData;
    // Vérification des champs obligatoires
    if (!firstname || !lastname || !email || !password || !confirmPassword) {
      return "Tous les champs obligatoires doivent être remplis";
    }
    // Validation du format de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return "Veuillez entrer une adresse email valide";
    }
    // Vérification du mot de passe
    const passwordError = validatePassword(password);
    if (passwordError) {
      return passwordError;
    }
    // Vérification de la correspondance des mots de passe
    if (password !== confirmPassword) {
      return "Les mots de passe ne correspondent pas";
    }
    // Vérification de l'acceptation des conditions
    const termsError = validateBoolean(terms_accepted, "acceptation des conditions");
    if (termsError) {
      return termsError;
    }
    if (!terms_accepted) {
      return "Vous devez accepter les conditions d'utilisation et la politique de confidentialité";
    }
    // Vérification de la newsletter (boolean)
    const newsletterError = validateBoolean(newsletter_subscription, "abonnement à la newsletter");
    if (newsletterError) {
      return newsletterError;
    }
    //le formulaire est valide donc on return null
    return null;
  };

  // Gestion de la soumission du formulaire
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    // Récupération des données du formulaire
    const formData = {
      firstname: document.getElementById("firstname").value.trim(),
      lastname: document.getElementById("lastname").value.trim(),
      email: document.getElementById("email").value.trim(),
      password: document.getElementById("password").value,
      confirmPassword: document.getElementById("confirm-password").value,
      terms_accepted: document.getElementById("terms").checked,
      newsletter_subscription: document.getElementById("newsletter").checked,
    };
    // Validation des données
    const validationError = validateForm(formData);
    if (validationError) {
      showMessage(validationError);
      return;
    }
    // Gestion du bouton de soumission
    const submitButton = registerForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = "Création en cours...";
    try {
      // Envoi de la requête d'inscription via ApiClient
      const data = await ApiClient.post(
        "/users/register",
        {
          firstname: formData.firstname,
          lastname: formData.lastname,
          email: formData.email,
          password: formData.password,
          newsletter_subscription: formData.newsletter_subscription,
          terms_accepted: formData.terms_accepted,
        }
      );
      if(data.error)
      {
        showMessage(data.error);
        submitButton.disabled = false;
        submitButton.textContent = "Créer mon compte";
      }
      else
      {
        // Affichage du message de succès et redirection
        showMessage("Compte créé avec succès ! Redirection...", "success");
        setTimeout(() => {
          window.location.href = "../login/login.html";
        }, 2000);
      }
    } catch (err) {
      showMessage("Une erreur inattendue s'est produite. Veuillez réessayer.");
      submitButton.disabled = false;
      submitButton.textContent = "Créer mon compte";
    }
  });
  // Validation en temps réel des mots de passe
  const passwordInput = document.getElementById("password");
  const confirmPasswordInput = document.getElementById("confirm-password");
  const validatePasswordsMatch = () => {
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    if (password && confirmPassword && password !== confirmPassword) {
      confirmPasswordInput.setCustomValidity("Les mots de passe ne correspondent pas");
    } else {
      confirmPasswordInput.setCustomValidity("");
    }
  };
  // Ajout des écouteurs pour la validation en temps réel
  passwordInput.addEventListener("input", validatePasswordsMatch);
  confirmPasswordInput.addEventListener("input", validatePasswordsMatch);
});