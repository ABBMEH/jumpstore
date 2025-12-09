import { ApiClient } from "../../utils/api.js";
import { SERVER_BASE_URL } from "../../env.js";

document.addEventListener("DOMContentLoaded", () => {
  // Désactiver le clic droit sur la vidéo
  const video = document.querySelector(".hero-video video");
  if (video) {
    video.addEventListener("contextmenu", (e) => {
      e.preventDefault();
    });
  }

  // Fonction pour charger les catégories et marques
  async function loadItems() {
    const container = document.getElementById("items-container");
    // Vérification de l'existence du conteneur
    if (!container)
      return;

    // Affichage de l'état de chargement
    container.innerHTML = '<div style="text-align: center; padding: 20px;"><i class="fas fa-spinner fa-spin"></i> Chargement...</div>';
    
    try {
      // Récupération simultanée des catégories et des marques
      const [categories, brands] = await Promise.all([
        ApiClient.get(`/product/product-categories`),
        ApiClient.get(`/product/brands`)
      ]);
      
      // Filtrage des catégories actives avec ajout du type
      const activeCategories = categories
        .filter(category => category.is_active)
        .map(item => ({ ...item, type: 'category' }));
      
      // Filtrage des marques actives avec ajout du type
      const activeBrands = brands
        .filter(brand => brand.is_active)
        .map(item => ({ ...item, type: 'brand' }));
      
      // Tri des catégories par ordre (si disponible) ou par nom
      activeCategories.sort((a, b) => (a.order || 0) - (b.order || 0) || a.name.localeCompare(b.name));
      
      // Tri des marques par nom
      activeBrands.sort((a, b) => a.name.localeCompare(b.name));
      
      // Combinaison des catégories et marques
      const items = [...activeCategories, ...activeBrands];
      
      // Gestion du cas où aucun élément actif n'est trouvé
      if (items.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 20px;">Aucun élément actif trouvé.</p>';
        return;
      }
      
      // Génération des blocs HTML pour les éléments
      container.innerHTML = items
        .map(item => {
          if (item.type === 'category' && item.is_active && item.show_on_home) {
            // Création d'un bloc pour une catégorie
            return `
              <div class="category-block"
                   style="background-image: url(${item.image_url ? `${SERVER_BASE_URL}${item.image_url.toLowerCase()}` : `https://placehold.co/400x400?text=${encodeURIComponent(item.name)}`})"
                   onclick="window.filterByCategory(event, '${item.name}')"
                   data-category-name="${item.name}"
                   role="button"
                   aria-label="Naviguer vers la liste des produits de la catégorie ${item.name}"
                   tabindex="0">
                <h3>${item.name}</h3>
              </div>
            `;
          } else if(item.is_active && item.show_on_home){
            // Création d'un bloc pour une marque
            return `
              <div class="brand-block"
                   onclick="window.filterByBrand(event, '${item.name}')"
                   data-brand-name="${item.name}"
                   role="button"
                   aria-label="Naviguer vers la liste des produits de la marque ${item.name}"
                   tabindex="0">
                <img src="${
                  item.pictures && item.pictures[0]?.image_url 
                    ? `${SERVER_BASE_URL}${item.pictures[0].image_url.toLowerCase()}` 
                    : `https://placehold.co/400x400?text=${encodeURIComponent(item.name)}`
                }" alt="${item.name}" loading="lazy" />
              </div>
            `;
          }
        })
        .join("");
      
      // Ajout de l'accessibilité clavier pour les blocs
      document.querySelectorAll(".category-block, .brand-block").forEach(block => {
        block.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            const categoryName = block.getAttribute("data-category-name");
            const brandName = block.getAttribute("data-brand-name");
            // Redirection selon le type d'élément (catégorie ou marque)
            if (categoryName) {
              window.filterByCategory(e, categoryName);
            } else if (brandName) {
              window.filterByBrand(e, brandName);
            }
          }
        });
      });
    } catch (error) {
      // Gestion des erreurs lors du chargement
      container.innerHTML = '<p style="text-align: center; padding: 20px; color: #dc3545;">Erreur lors du chargement des éléments.</p>';
    }
  }

  // Redirige vers la page boutique avec filtre par catégorie
  window.filterByCategory = (event, categoryName) => {
    event.preventDefault();
    window.location.href = `/pages/shop/shop.html?category=${encodeURIComponent(categoryName)}`;
  };

  // Redirige vers la page boutique avec filtre par marque
  window.filterByBrand = (event, brandName) => {
    event.preventDefault();
    window.location.href = `/pages/shop/shop.html?brand=${encodeURIComponent(brandName)}`;
  };

  // Lancement du chargement des éléments au chargement de la page
  loadItems();
});