import { Modal } from "../../components/modal/modal.js";
import { ProductModule } from "./modules/product-module.js";
import { BrandModule } from "./modules/brand-module.js";
import { CategoryModule } from "./modules/category-module.js";
import { SizeTypeModule } from "./modules/size-type-module.js";

document.addEventListener("DOMContentLoaded", () => {
  // Objet pour stocker les instances des gestionnaires de modules
  let managers = {};
  // Instance du gestionnaire de modales
  let modalManager = null;
  // Ensemble pour suivre les onglets déjà chargés
  let loadedTabs = new Set();

  // Fonction d'initialisation principale
  const init = () => {
    // Initialisation du gestionnaire de modales
    modalManager = new Modal("modal-container", { closeOnOutsideClick: false });
    // Définition des gestionnaires pour chaque type de données
    managers = {
      products: () => new ProductModule(modalManager, false),
      brands: () => new BrandModule(modalManager, false),
      "product-categories": () => new CategoryModule(modalManager, false),
      sizetypes: () => new SizeTypeModule(modalManager, false),
    };
    // Configuration des événements pour les onglets
    setupTabEvents();
    // Chargement de l'onglet actif
    loadActiveTab();
  };

  // Charge l'onglet actif au démarrage
  const loadActiveTab = () => {
    // Recherche de l'onglet actuellement actif
    const activeTab = document.querySelector(".tab-btn.active");
    if (activeTab) {
      const tabId = activeTab.dataset.tab;
      // Initialisation de l'onglet actif
      initializeTab(tabId);
    }
  };

  // Initialise un onglet spécifique s'il n'a pas encore été chargé
  const initializeTab = (tabId) => {
    if (!loadedTabs.has(tabId) && managers[tabId]) {
      // Crée une instance du gestionnaire pour l'onglet
      managers[tabId] = managers[tabId]();
      // Ajoute l'onglet à la liste des onglets chargés
      loadedTabs.add(tabId);
      // Charge les données de l'onglet
      managers[tabId].loadData();
    }
  };

  // Configure les événements pour les boutons des onglets
  const setupTabEvents = () => {
    const tabButtons = document.querySelectorAll(".tab-btn");
    const tabContents = document.querySelectorAll(".tab-content");
    tabButtons.forEach((button) => {
      button.addEventListener("click", () => {
        // Supprime la classe active de tous les boutons
        tabButtons.forEach((btn) => btn.classList.remove("active"));
        // Supprime la classe active de tous les contenus
        tabContents.forEach((content) => content.classList.remove("active"));
        // Active le bouton cliqué
        button.classList.add("active");
        const tabId = button.dataset.tab;
        // Affiche le contenu de l'onglet correspondant
        const content = document.getElementById(`${tabId}-tab`);
        if (content) content.classList.add("active");
        // Initialise l'onglet cliqué
        initializeTab(tabId);
      });
    });
  };

  // Affiche un message de succès ou d'erreur
  let messageTimeout;
  const showMessage = (message, type = "success") => {
    clearTimeout(messageTimeout);
    const messageContainer = document.getElementById("success-message");
    if (messageContainer) {
      // Définit le texte et le type du message
      messageContainer.textContent = message;
      messageContainer.className = `success-message ${type}`;
      // Affiche le message
      messageContainer.style.display = "block";
      // Masque le message après 5 secondes
      messageTimeout = setTimeout(() => {
        messageContainer.style.display = "none";
      }, 5000);
    }
  };

  // Exposition de la fonction showMessage globalement
  window.showMessage = showMessage;

  // Vérifie l'état du DOM pour lancer l'initialisation
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
});