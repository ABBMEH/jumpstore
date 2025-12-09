import { ApiClient } from "../../utils/api.js";


document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("login-form");
  const errorMessage = document.getElementById("error-message");

  // Vérification de l'existence du formulaire de connexion
  if (!loginForm)
    return;
  
  // Vérification de l'existence de l'élément pour afficher les erreurs
  if (!errorMessage)
    return;
  
  // Fonction pour effectuer une requête de connexion
  const loginRequest = async (email, password, retryCount = 1, maxRetries = 2) => {
    try {
      const data = await ApiClient.post(
        "/auth/login",
        { email, password },
        true
      );

      // Vérification des données utilisateur reçues
      const user = data.user;
      if (!user || !user.email || !user.role) {
        throw new Error(data.error);
      }

      // Redirection selon le rôle de l'utilisateur
      if (user.role === "Administrateur") {
        window.location.href = "/pages/adminpanel/adminpanel.html";
      } else {
        window.location.href = "/index.html";
      }
    } catch (err) {
      // Gestion des erreurs réseau ou CORS
      errorMessage.textContent = err.message.includes("Failed to fetch")
        ? "Erreur de connexion au serveur. Vérifiez votre connexion réseau ou la configuration CORS."
        : err.message;
      errorMessage.style.display = "block";

      throw err;
    }
  };

  // Gestion de la soumission du formulaire
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    // Validation de base des entrées
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errorMessage.textContent = "Veuillez entrer un email valide";
      errorMessage.style.display = "block";
      setTimeout(() => {
        errorMessage.style.display = "none";
      }, 5000);
      return;
    }
    if (!password) {
      errorMessage.textContent = "Veuillez entrer un mot de passe";
      errorMessage.style.display = "block";
      setTimeout(() => {
        errorMessage.style.display = "none";
      }, 5000);
      return;
    }

    // call de la requête de connexion
    await loginRequest(email, password);
  });
});