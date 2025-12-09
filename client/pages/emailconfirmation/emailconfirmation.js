import { ApiClient } from "../../utils/api.js";

document.addEventListener("DOMContentLoaded", async () => {
  const confirmationMessage = document.getElementById("confirmation-message");
  const errorMessage = document.getElementById("error-message");

  // Vérification de l'existence des éléments d'affichage
  if (!confirmationMessage || !errorMessage)
    return;
  

  // Extraire le token des paramètres d'URL
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token");

  if (!token) {
    errorMessage.textContent = "Aucun token de confirmation fourni.";
    errorMessage.style.display = "block";
    return;
  }

  try {
    // Appel API pour confirmer l'email
    const response = await ApiClient.get(`/users/confirm-email?token=${token}`, true);

    // Vérification de la réponse
    if (response.error) {
      throw new Error(response.error);
    }

    if (response.message === "Email confirmé avec succès") {
      confirmationMessage.textContent = "Votre email a été confirmé avec succès ! Vous allez être redirigé vers la page de connexion.";
      confirmationMessage.style.display = "block";
      setTimeout(() => {
        window.location.href = "/pages/login/login.html";
      }, 3000);
    } else {
      throw new Error("Confirmation invalide. Veuillez réessayer.");
    }
  } catch (err) {
    errorMessage.textContent =
      err.message.includes("Failed to fetch")
        ? "Erreur de connexion au serveur. Vérifiez votre connexion réseau ou la configuration CORS."
        : err.message || "Une erreur est survenue lors de la confirmation de l'email.";
    errorMessage.style.display = "block";
  }
});