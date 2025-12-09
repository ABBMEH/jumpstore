document.addEventListener("DOMContentLoaded", () => {
  async function fetchWebsiteParams(forceFetch = false) {
    const cacheKey = "websiteParams";
    if (!forceFetch) {
      const cache = localStorage.getItem(cacheKey);
      const oneHour = 60 * 60 * 1000;

      // Vérifier le cache
      if (cache) {
        try {
          const { data, timestamp } = JSON.parse(cache);
          const now = Date.now();
          if (now - timestamp < oneHour)
            return data;
          
        } catch (err) {
          localStorage.removeItem(cacheKey);
        }
      }
    } else {
      localStorage.removeItem(cacheKey);
    }

    // Récupérer depuis l'API
    try {
      const response = await fetch(`${API_URL}/website-params`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Cache-Control": "no-cache",
        },
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`Erreur HTTP : ${response.status} ${response.statusText}`);
      }
      const data = await response.json();

      // Mettre en cache le résultat
      localStorage.setItem(cacheKey, JSON.stringify({ data, timestamp: Date.now() }));
      return data;
    } catch (err) {
      return null;
    }
  }

  async function loadFooter() {
    try {
      // Charger le HTML du pied de page
      const baseUrl = window.location.pathname.includes("pages/") ? "../../components/footer/" : "components/footer/";
      const footerUrl = `${baseUrl}footer.html`;

      const response = await fetch(footerUrl);
      if (!response.ok) {
        throw new Error(`Échec du chargement de footer.html : ${response.status} ${response.statusText}`);
      }
      const content = await response.text();
      const footerContainer = document.getElementById("footer-container");
      if (!footerContainer) {
        throw new Error("Conteneur de pied de page (#footer-container) non trouvé dans le DOM");
      }
      footerContainer.innerHTML = content;

      // Récupérer les paramètres du site et mettre à jour le pied de page
      const params = await fetchWebsiteParams();
      if (params) {
        const footerTextElement = document.querySelector(".footer-copyright");
        if (footerTextElement) {
          footerTextElement.textContent = params.footer_text || "© 2025 Store. Tous droits réservés.";
        }

        // Définir la variable CSS pour le thème
        document.documentElement.style.setProperty("--primary-color", params.color_theme || "#000");
      } else {
        document.documentElement.style.setProperty("--primary-color", "#000");
      }

      // Écouter les mises à jour des paramètres du site
      document.addEventListener("websiteParamsUpdated", async (event) => {
        const params = event.detail.params || (await fetchWebsiteParams(true));
        if (params) {
          const footerTextElement = document.querySelector(".footer-copyright");
          if (footerTextElement) {
            footerTextElement.textContent = params.footer_text || "© 2025 Store. Tous droits réservés.";
          }
          if (params.color_theme) {
            document.documentElement.style.setProperty("--primary-color", params.color_theme);
          }
        }
      });
    } catch (error) {
      document.body.insertAdjacentHTML(
        "beforeend",
        `
        <footer style="background: #000; color: #fff; padding: 10px; text-align: center;">
          <p>Erreur : Échec du chargement du pied de page. Veuillez rafraîchir la page.</p>
        </footer>`
      );
    }
  }

  loadFooter();
});