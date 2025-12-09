import { API_URL } from "../../env.js";

document.addEventListener("DOMContentLoaded", () => {
  // Fonction pour détecter l'orientation de l'appareil (portrait ou paysage)
  function getOrientation() {
    return window.matchMedia("(orientation: portrait)").matches ? "portrait" : "landscape";
  }

  // Fonction pour définir la hauteur de la fenêtre (viewport height) pour compatibilité avec iOS Safari
  function setViewportHeight() {
    // Récupère l'orientation actuelle
    const orientation = getOrientation();
    // Clé unique pour le cache par orientation
    const cacheKey = `viewportHeight-${orientation}`;
    // Vérifie si une hauteur est déjà en cache
    const cache = localStorage.getItem(cacheKey);
    let vh;

    // Vérifie si le cache existe et est valide
    if (cache) {
      try {
        const { height, timestamp } = JSON.parse(cache);
        const oneDay = 24 * 60 * 60 * 1000; // Cache valide pendant 24 heures
        if (Date.now() - timestamp < oneDay) {
          vh = height; // Utilise la hauteur en cache si elle est encore valide
        }
      } catch (err) {
        // Supprime le cache invalide en cas d'erreur
        localStorage.removeItem(cacheKey); 
      }
    }

    // Si aucun cache valide, calcule et stocke la nouvelle hauteur
    if (!vh) {
      // Hauteur actuelle de la fenêtre
      vh = window.innerHeight;

      // Enregistre la hauteur et l'heure actuelle
      localStorage.setItem(cacheKey, JSON.stringify({
        height: vh,
        timestamp: Date.now() 
      }));
    }

    // Définit une propriété CSS personnalisée pour la hauteur de la fenêtre
    document.documentElement.style.setProperty('--viewport-height', `${vh}px`);
  }

  // Définit la hauteur initiale de la fenêtre
  setViewportHeight();

  // Met à jour la hauteur lors d'un changement d'orientation
  window.addEventListener('orientationchange', setViewportHeight);

  // Supprime le cache à la fin de la session (optionnel, pour gérer les mises à jour du navigateur ou les changements d'appareil)
  window.addEventListener('beforeunload', () => {
    localStorage.removeItem(`viewportHeight-portrait`);
    localStorage.removeItem(`viewportHeight-landscape`);
  });

  // Fonction pour récupérer les paramètres du site web depuis l'API ou le cache
  async function fetchWebsiteParams(forceFetch = false) {
    // Clé pour le cache des paramètres dans le localstorage
    const cacheKey = "websiteParams"; 
    if (!forceFetch) {
      // Vérifie le cache existant
      const cache = localStorage.getItem(cacheKey); 
      const oneHour = 60 * 60 * 1000; // Cache valide pendant 1 heure
      if (cache) {
        try {
          const { data, timestamp } = JSON.parse(cache);
          const now = Date.now();
          if (now - timestamp < oneHour) {
            // Retourne les données en cache si elles sont valides
            return data;
          }
        } catch (err) {
          // Supprime le cache invalide
          localStorage.removeItem(cacheKey); 
        }
      }
    } else {
      // Force la suppression du cache si forceFetch est true
      localStorage.removeItem(cacheKey);
    }
    try {
      // Effectue une requête GET pour récupérer les paramètres du site
      const response = await fetch(`${API_URL}/website-params`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Cache-Control": "no-cache",
        },
        credentials: "include", // Inclut les cookies pour l'authentification
      });
      if (response.status === 403) {
        window.location.href = "/pages/banned/banned.html";
        return null;
      }
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      // Stocke les données dans le cache avec un horodatage
      localStorage.setItem(cacheKey, JSON.stringify({ data, timestamp: Date.now() }));
      return data;
    } catch (err) {
      return null;
    }
  }

  // Fonction pour vérifier l'état de l'authentification de l'utilisateur
  async function checkAuth() {
    try {
      // Effectue une requête GET pour vérifier l'authentification
      const response = await fetch(`${API_URL}/auth/check`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        credentials: "include", // Inclut les cookies pour l'authentification
      });
      if (response.status === 403) {
        window.location.href = "/pages/banned/banned.html";
        return null;
      }
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      return data.user || null;
    } catch (err) {
      return null;
    }
  }

  // Fonction pour charger la barre de navigation (navbar)
  async function loadNavbar() {
    try {
      // Vérifie si la page actuelle est banned.html
      const isBannedPage = window.location.pathname.includes("banned.html");
      
      // Détermine le chemin de la navbar en fonction de l'emplacement de la page
      const baseUrl = window.location.pathname.includes("pages/") ? "../../components/navbar/" : "components/navbar/";
      const navbarUrl = `${baseUrl}navbar.html`;
      // Charge le contenu HTML de la navbar
      const response = await fetch(navbarUrl);
      if (!response.ok) {
        throw new Error(`Échec du chargement de navbar.html: ${response.status} ${response.statusText}`);
      }
      const content = await response.text();
      const navbarContainer = document.getElementById("navbar-container");
      if (!navbarContainer) {
        throw new Error("Conteneur de la navbar (#navbar-container) introuvable dans le DOM");
      }
      // Insère le contenu HTML dans le conteneur de la navbar
      navbarContainer.innerHTML = content;

      if (isBannedPage) {
        // Sur banned.html, applique une couleur par défaut et saute les appels API
        document.documentElement.style.setProperty("--primary-color", "#000");
        return; // Arrête l'exécution pour éviter les appels API
      }

      // Récupère les paramètres du site pour appliquer le thème de couleur
      const params = await fetchWebsiteParams();
      if (params) {
        document.documentElement.style.setProperty("--primary-color", params.color_theme || "#000");
      } else {
        document.documentElement.style.setProperty("--primary-color", "#000"); // Couleur par défaut
      }
      // Écoute les mises à jour des paramètres du site
      document.addEventListener("websiteParamsUpdated", async (event) => {
        const params = event.detail.params || (await fetchWebsiteParams(true));
        if (params && params.color_theme) {
          document.documentElement.style.setProperty("--primary-color", params.color_theme);
        }
      });
      // Initialise la barre de navigation
      await initializeNavbar();
    } catch (error) {
      // Affiche un message d'erreur si le chargement de la navbar échoue
      document.querySelector("header").innerHTML = `
        <div style="background: #000; color: #fff; padding: 10px; text-align: center;">
          <p>Erreur: La barre de navigation n'a pas pu être chargée. Veuillez rafraîchir la page.</p>
        </div>`;
    }
  }

  // Fonction pour initialiser la barre de navigation
  async function initializeNavbar() {
    // Sélectionne les éléments du DOM nécessaires
    const userSection = document.getElementById("user-section");
    const dropdownMenu = document.getElementById("user-dropdown-menu");
    const loginLink = document.getElementById("login-link");
    const userAvatarImg = document.getElementById("user-avatar-img");
    const userName = document.getElementById("user-name");
    const userRole = document.getElementById("user-role");
    const homeItem = document.getElementById("home-item");
    const logo = document.querySelector(".logo img");
    const burgerMenu = document.getElementById("burger-menu");
    const navLinks = document.getElementById("nav-links");
    const mobileUserSection = document.getElementById("mobile-user-section");
    const mobileUserAvatar = document.getElementById("mobile-user-avatar");
    const mobileUserDropdownMenu = document.getElementById("mobile-user-dropdown-menu");
    const mobileUserAvatarImg = document.getElementById("mobile-user-avatar-img");
    const mobileHomeItem = document.getElementById("mobile-home-item");
    const navbarError = document.getElementById("navbar-error");

    // Variable d'état qui indique si le menu mobile est ouvert
    let isMenuOpen = false;
    // Variable d'état qui indique si le menu déroulant mobile est ouvert
    let isMobileDropdownOpen = false;
    // Variable d'état qui indique si le menu a été ouvert au moins une fois
    let hasMenuBeenOpened = false;
    if (navLinks) {
      // Désactive les animations initiales du menu
      navLinks.classList.add("no-animation"); 
    }

    // Affiche un message d'erreur dans la navbar
    function showError(message) {
      if (navbarError) {
        navbarError.textContent = message;
        navbarError.style.backgroundColor = "#ffe6e6";
        navbarError.style.color = "#d32f2f";
        navbarError.style.border = "1px solid #d32f2f";
        navbarError.style.display = "block";
        // Masque le message après 5 secondes
        setTimeout(() => {
          navbarError.style.display = "none";
        }, 5000);
      }
    }

    // Affiche un message de succès dans la navbar
    function showSuccess(message) {
      if (navbarError) {
        navbarError.textContent = message;
        navbarError.style.backgroundColor = "#e6ffe6";
        navbarError.style.color = "#2e7d32";
        navbarError.style.border = "1px solid #2e7d32";
        navbarError.style.display = "block";
        // Masque le message après 5 secondes
        setTimeout(() => {
          navbarError.style.display = "none";
        }, 5000);
      }
    }

    // Ajuste les chemins des liens pour inclure l'origine de l'URL
    function adjustLinkPaths() {
      const links = dropdownMenu ? dropdownMenu.querySelectorAll("a[href]") : [];
      const navLinks = document.querySelectorAll(".nav-links a[href]");
      const mobileLinks = document.querySelectorAll(".mobile-dropdown a[href]");
      // Corrige les liens commençant par "/" en ajoutant l'origine
      links.forEach((link) => {
        let href = link.getAttribute("href");
        if (href.startsWith("/")) {
          const correctedHref = `${window.location.origin}${href}`;
          link.setAttribute("href", correctedHref);
        }
      });
      navLinks.forEach((link) => {
        let href = link.getAttribute("href");
        const onclick = link.getAttribute("onclick");
        if (href.startsWith("/") && !onclick) {
          const correctedHref = `${window.location.origin}${href}`;
          link.setAttribute("href", correctedHref);
        }
      });
      mobileLinks.forEach((link) => {
        let href = link.getAttribute("href");
        if (href.startsWith("/")) {
          const correctedHref = `${window.location.origin}${href}`;
          link.setAttribute("href", correctedHref);
        }
      });
    }

    // Ouvre/ferme le menu déroulant de l'utilisateur
    function toggleDropdown(event) {
      event.stopPropagation();
      if (dropdownMenu) {
        const isOpen = dropdownMenu.classList.toggle("show");
        userSection.setAttribute("aria-expanded", isOpen.toString());
        if (isOpen) {
          const firstItem = dropdownMenu.querySelector("a[tabindex='0']");
          // Focus le premier élément du menu
          if (firstItem) firstItem.focus();
        }
      }
    }

    // Ouvre/ferme le menu déroulant mobile
    function toggleMobileDropdown(event) {
      event.stopPropagation();
      isMobileDropdownOpen = !isMobileDropdownOpen;
      if (mobileUserDropdownMenu) {
        mobileUserDropdownMenu.classList.toggle("show");
        mobileUserSection.setAttribute("aria-expanded", isMobileDropdownOpen.toString());
        if (isMobileDropdownOpen) {
          const firstItem = mobileUserDropdownMenu.querySelector("a[tabindex='0']");
          // Focus le premier élément du menu
          if (firstItem) firstItem.focus();
        }
      }
    }

    // Ferme le menu déroulant mobile
    function closeMobileDropdown() {
      if (isMobileDropdownOpen) {
        isMobileDropdownOpen = false;
        if (mobileUserDropdownMenu) {
          mobileUserDropdownMenu.classList.remove("show");
          mobileUserSection.setAttribute("aria-expanded", "false");
        }
      }
    }

    // Gère les clics en dehors des menus pour les fermer
    function handleClickOutside(event) {
      if (userSection && dropdownMenu && !userSection.contains(event.target) && !dropdownMenu.contains(event.target)) {
        const wasOpen = dropdownMenu.classList.contains("show");
        dropdownMenu.classList.remove("show");
        userSection.setAttribute("aria-expanded", "false");
        if (wasOpen) {
          userSection.focus();
        }
      }
      if (mobileUserSection && mobileUserDropdownMenu && !mobileUserSection.contains(event.target) && !mobileUserDropdownMenu.contains(event.target)) {
        const wasMobileOpen = isMobileDropdownOpen;
        closeMobileDropdown();
        if (wasMobileOpen) {
          mobileUserSection.focus();
        }
      }
    }

    // Ouvre/ferme le menu mobile
    function toggleMobileMenu() {
      isMenuOpen = !isMenuOpen;
      burgerMenu.classList.toggle("active");
      navLinks.classList.toggle("active");
      // Bloque/débloque le défilement
      document.body.style.overflow = isMenuOpen ? "hidden" : ""; 
      if (isMenuOpen && !hasMenuBeenOpened) {
        hasMenuBeenOpened = true;
        if (navLinks) {
          // Active les animations après la première ouverture
          navLinks.classList.remove("no-animation");
        }
      }
      closeMobileDropdown();
    }

    // Ferme le menu mobile
    function closeMobileMenu() {
      if (isMenuOpen) {
        isMenuOpen = false;
        burgerMenu.classList.remove("active");
        navLinks.classList.remove("active");
        document.body.style.overflow = "";
        burgerMenu.focus();
      }
    }

    // Gère les clics sur les liens du menu mobile pour fermer le menu
    function handleMobileMenuClick(event) {
      if (event.target.tagName === "A") {
        setTimeout(() => {
          closeMobileMenu();
        }, 300);
      }
    }

    // Gère la touche Échap pour fermer les menus
    function handleEscapeKey(event) {
      if (event.key === "Escape") {
        if (isMenuOpen) closeMobileMenu();
        if (isMobileDropdownOpen) closeMobileDropdown();
        if (dropdownMenu.classList.contains("show")) {
          dropdownMenu.classList.remove("show");
          userSection.setAttribute("aria-expanded", "false");
          userSection.focus();
        }
      }
    }

    // Gère les interactions clavier pour la navigation dans les menus
    function handleKeyDown(event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        if (event.target === userSection) {
          toggleDropdown(event);
        } else if (event.target === mobileUserSection) {
          toggleMobileDropdown(event);
        } else if (event.target.classList.contains("dropdown-item")) {
          event.target.click();
        }
      } else if (event.target.classList.contains("dropdown-item") && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
        event.preventDefault();
        const menu = event.target.closest(".user-dropdown-menu");
        const items = Array.from(menu.querySelectorAll("a[tabindex='0']"));
        const currentIndex = items.indexOf(event.target);
        let nextIndex;
        if (event.key === "ArrowDown") {
          nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        } else {
          nextIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        }
        // Focalise l'élément suivant/précédent
        items[nextIndex].focus();
      }
    }

    // Récupère les catégories de produits pour la navbar
    async function fetchCategories() {
      try {
        const response = await fetch(`${API_URL}/product/product-categories/navbar`, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          credentials: "include",
        });
        if (response.status === 403) {
          window.location.href = "/pages/banned/banned.html";
          return [];
        }
        if (!response.ok) {
          throw new Error(`Erreur HTTP: ${response.status} ${response.statusText}`);
        }
        const categories = await response.json();
        // Retourne un tableau vide si les données ne sont pas valides
        return Array.isArray(categories) ? categories : [];
      } catch (err) {
        return [];
      }
    }

    // Crée des boutons pour les catégories dans la navbar
    async function createCategoryButtons(categories) {
      if (categories.length === 0) {
        return;
      }
      const desktopCategoryButtons = document.getElementById("category-buttons");
      if (desktopCategoryButtons) {
        // Vide le conteneur
        desktopCategoryButtons.innerHTML = "";
        // Trie les catégories par ordre
        const sortedCategories = categories.sort((a, b) => a.order - b.order); 
        sortedCategories.forEach((category) => {
          const button = document.createElement("li");
          button.className = "category-button";
          button.innerHTML = `<a href="#" onclick="window.filterByCategory(event, '${category.name}')">${category.name}</a>`;
          // Ajoute le bouton au conteneur
          desktopCategoryButtons.appendChild(button);
        });
      }
    }

    // Met à jour l'interface utilisateur en fonction de l'état de l'authentification
    function updateUserInterface(user) {
      const isLoginPage = window.location.pathname.includes("login.html");
      const isRegisterPage = window.location.pathname.includes("register.html");
      const isEmailConfirmationPage = window.location.pathname.includes("emailconfirmation.html");
      if (user && !isLoginPage && !isRegisterPage && !isEmailConfirmationPage) {
        const fullName = `${user.firstname || ""} ${user.lastname || ""}`.trim() || "Utilisateur";
        // Masque le lien de connexion
        if (loginLink) loginLink.style.display = "none";
        // Affiche la section utilisateur
        if (userSection) userSection.style.display = "flex";
        // Affiche le nom complet
        if (userName) userName.textContent = fullName;
        // Affiche le rôle
        if (userRole) userRole.textContent = user.role || "Utilisateur";
        // Affiche l'avatar
        if (userAvatarImg) userAvatarImg.src = user.avatar || "/imgs/default_avatar.webp"; 
        if (homeItem && user.role === "Administrateur") {
          // Affiche l'élément "home" pour les admins
          homeItem.style.display = "table-row"; 
        }
        // Affiche la section utilisateur mobile
        if (mobileUserSection) mobileUserSection.style.display = "block";
        // Affiche l'avatar mobile
        if (mobileUserAvatarImg) mobileUserAvatarImg.src = user.avatar || "/imgs/default_avatar.webp";
        if (mobileHomeItem && user.role === "Administrateur") {
          // Affiche l'élément "home" mobile pour les admins
          mobileHomeItem.style.display = "table-row"; 
        }
      } else {
        // Affiche le lien de connexion
        if (loginLink) loginLink.style.display = "list-item"; 
        // Masque la section utilisateur
        if (userSection) userSection.style.display = "none";
        // Masque la section utilisateur mobile
        if (mobileUserSection) mobileUserSection.style.display = "none";
        // Redirige vers la page de connexion si l'utilisateur n'est pas authentifié
        if (!isLoginPage && !isRegisterPage && !isEmailConfirmationPage && !window.location.pathname.includes("shop.html") && !window.location.pathname.includes("index.html") && !window.location.pathname.includes("home.html")) {
          window.location.href = `${window.location.origin}/pages/login/login.html`;
        }
      }
    }

    // Fonction pour déconnecter l'utilisateur
    window.logout = async function () {
      try {
        const response = await fetch(`${API_URL}/auth/logout`, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          credentials: "include",
        });
        if (response.status === 403) {
          window.location.href = "/pages/banned/banned.html";
          return;
        }
        if (!response.ok) {
          throw new Error(`Erreur HTTP: ${response.status} ${response.statusText}`);
        }
        // Supprime le cookie de token
        document.cookie = "token=; expires=Thu, 01 Jan 2000 00:00:00 GMT; path=/";
        updateUserInterface(null);
        closeMobileMenu();
        closeMobileDropdown();
        showSuccess("Déconnexion réussie");
        window.location.href = "/pages/home/home.html";
      } catch (err) {
        showError("Erreur lors de la déconnexion. Veuillez réessayer.");
      }
    };

    // Réinitialise les filtres et redirige vers la page d'accueil lors du clic sur le logo
    window.resetFiltersOnLogoClick = function (event) {
      if (event && typeof event.preventDefault === "function") {
        event.preventDefault();
      }
      closeMobileMenu();
      closeMobileDropdown();
      window.location.href = `${window.location.origin}/pages/home/home.html`;
    };

    // Filtre les produits par catégorie
    window.filterByCategory = function (event, category) {
      if (event && typeof event.preventDefault === "function") {
        event.preventDefault();
      }
      closeMobileMenu();
      closeMobileDropdown();
      const categorySelect = document.getElementById("filter-category");
      // Si sur la page shop.html, met à jour le filtre de catégorie
      if (categorySelect && window.location.pathname.includes("shop.html") && typeof window.updateURL === "function" && typeof window.filterProducts === "function") {
        categorySelect.value = category || "";
        const changeEvent = new Event("change");
        categorySelect.dispatchEvent(changeEvent);
        window.updateURL();
        window.filterProducts();
      } else {
        // Sinon, redirige vers shop.html avec le paramètre de catégorie
        const params = new URLSearchParams();
        params.set("category", category || "");
        window.location.href = `${window.location.origin}/pages/shop/shop.html?${params.toString()}`;
      }
    };

    // Ajoute les écouteurs d'événements pour les interactions avec la navbar
    if (userSection) {
      userSection.addEventListener("click", toggleDropdown);
      userSection.addEventListener("keydown", handleKeyDown);
    }
    if (logo) {
      logo.addEventListener("click", resetFiltersOnLogoClick);
    }
    if (burgerMenu) {
      burgerMenu.addEventListener("click", toggleMobileMenu);
    }
    if (navLinks) {
      navLinks.addEventListener("click", handleMobileMenuClick);
    }
    if (mobileUserSection) {
      mobileUserSection.addEventListener("click", toggleMobileDropdown);
      mobileUserSection.addEventListener("keydown", handleKeyDown);
    }
    if (dropdownMenu) {
      dropdownMenu.querySelectorAll(".dropdown-item").forEach(item => {
        item.addEventListener("keydown", handleKeyDown);
      });
    }
    if (mobileUserDropdownMenu) {
      mobileUserDropdownMenu.querySelectorAll(".dropdown-item").forEach(item => {
        item.addEventListener("keydown", handleKeyDown);
      });
    }
    document.addEventListener("click", handleClickOutside);
    document.addEventListener("keydown", handleEscapeKey);

    // Vérifie l'authentification et met à jour l'interface si ce n'est pas la page de confirmation d'email
    const isEmailConfirmationPage = window.location.pathname.includes("emailconfirmation.html");
    if (!isEmailConfirmationPage) {
      const user = await checkAuth();
      updateUserInterface(user);
      adjustLinkPaths();
    }

    // Charge et affiche les catégories dans la navbar
    const categories = await fetchCategories();
    await createCategoryButtons(categories);
  }

  // Lance le chargement de la barre de navigation
  loadNavbar();
});