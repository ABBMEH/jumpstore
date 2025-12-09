import { API_URL, SERVER_BASE_URL } from "../../env.js";
import { ApiClient } from "../../utils/api.js";

document.addEventListener("DOMContentLoaded", () => {
  // Liste complète des produits
  let products = [];
  // Liste des produits filtrés
  let filteredProducts = [];
  // Prix maximum global par défaut
  let globalMaxPrice = 100;
  // Nombre de produits par lot pour le chargement paresseux
  const productsPerBatch = 8;
  // Lot actuel pour le chargement paresseux
  let currentBatch = 0;
  // Observateur pour le chargement paresseux
  let observer = null;
  // Temporisateur pour débouncer les mises à jour des filtres
  let debounceTimeout = null;
  // Stocke toutes les catégories et sous-catégories
  let allCategories = [];

  // Vérifie si la page est shop.html
  const isShopPage = document.getElementById("sort-by") !== null;
  if (!isShopPage) {
    return;
  }

  // Récupère les paramètres de l'URL
  function getQueryParams() {
    const params = new URLSearchParams(window.location.search);
    const maxPriceSlider = document.getElementById("max-price-slider");
    const urlMaxPrice = parseFloat(params.get("maxPrice"));
    // Priorise le paramètre d'URL si valide, sinon utilise la valeur du slider ou globalMaxPrice
    const maxPrice = urlMaxPrice && !isNaN(urlMaxPrice) ? Math.min(urlMaxPrice, globalMaxPrice) : (maxPriceSlider?.value ? parseFloat(maxPriceSlider.value) : globalMaxPrice);
    const queryParams = {
      sortBy: params.get("sortBy") || "",
      brand: params.get("brand") || "",
      category: params.get("category") || "",
      subcategories: params.get("subcategories") ? params.get("subcategories").split(",").filter(s => s.trim() !== "") : [],
      minPrice: parseFloat(params.get("minPrice")) || 0,
      maxPrice,
    };
    return queryParams;
  }

  // Initialise les contrôles de filtrage
  function initializeFilters() {
    const { sortBy, brand, category, subcategories, minPrice, maxPrice } = getQueryParams();
    const sortBySelect = document.getElementById("sort-by");
    const brandSelect = document.getElementById("filter-brand");
    const categorySelect = document.getElementById("filter-category");
    const subcategoriesContainer = document.getElementById("filter-subcategories");
    const minPriceSlider = document.getElementById("min-price-slider");
    const maxPriceSlider = document.getElementById("max-price-slider");
    const minPriceValue = document.getElementById("min-price-value");
    const maxPriceValue = document.getElementById("max-price-value");

    if (sortBySelect) sortBySelect.value = sortBy;
    if (brandSelect) brandSelect.value = brand;
    if (categorySelect) categorySelect.value = category;
    if (minPriceSlider) {
      minPriceSlider.value = minPrice;
      minPriceSlider.max = globalMaxPrice;
    }
    if (maxPriceSlider) {
      maxPriceSlider.max = globalMaxPrice;
      maxPriceSlider.value = maxPrice;
    }
    if (minPriceValue) minPriceValue.textContent = `${minPrice.toFixed(2).replace(".", ",")} EUR`;
    if (maxPriceValue) maxPriceValue.textContent = `${maxPrice.toFixed(2).replace(".", ",")} EUR`;

    // Remplit les sous-catégories après la sélection de la catégorie
    if (category) {
      fetchSubcategories(category, subcategories);
    } else {
      subcategoriesContainer.innerHTML = '<p>Sélectionnez une catégorie pour voir les sous-catégories</p>';
      updateComboboxTriggerText([]);
    }
  }

  // Met à jour le texte du déclencheur de la combobox
  function updateComboboxTriggerText(selectedSubcategories) {
    const comboboxTrigger = document.querySelector(".filter-subcategories .combobox-trigger");
    if (!comboboxTrigger) return;
    if (selectedSubcategories.length > 0) {
      comboboxTrigger.textContent = selectedSubcategories.join(", ");
    } else {
      comboboxTrigger.textContent = "Sous-catégories";
    }
  }

  // Récupère les marques et remplit la liste déroulante
  async function fetchBrands() {
    const brandSelect = document.getElementById("filter-brand");
    if (!brandSelect) return;

    try {
      const brands = await ApiClient.get("/product/brands");
      if (!Array.isArray(brands) || brands.length === 0) {
        brandSelect.innerHTML = '<option value="">Filtrer par marque</option>';
        return;
      }
      brandSelect.innerHTML = '<option value="">Filtrer par marque</option>';
      brands.forEach((brand) => {
        const option = document.createElement("option");
        option.value = brand.name;
        option.textContent = brand.name;
        brandSelect.appendChild(option);
      });
      const { brand } = getQueryParams();
      if (brand) {
        brandSelect.value = brand;
      }
    } catch (err) {
      brandSelect.innerHTML = '<option value="">Filtrer par marque</option>';
      console.error("Erreur lors de la récupération des marques :", err.message);
    }
  }

  // Récupère les catégories principales et remplit la liste déroulante
  async function fetchCategories() {
    const categorySelect = document.getElementById("filter-category");
    if (!categorySelect) return;

    try {
      allCategories = await ApiClient.get("/product/product-categories");
      if (!Array.isArray(allCategories) || allCategories.length === 0) {
        categorySelect.innerHTML = '<option value="">Filtrer par catégorie</option>';
        return;
      }
      const mainCategories = allCategories.filter(category => category.parent_id === null);
      categorySelect.innerHTML = '<option value="">Filtrer par catégorie</option>';
      mainCategories.forEach((category) => {
        const option = document.createElement("option");
        option.value = category.name;
        option.textContent = category.name;
        categorySelect.appendChild(option);
      });
      const { category } = getQueryParams();
      if (category) {
        categorySelect.value = category;
      }
    } catch (err) {
      categorySelect.innerHTML = '<option value="">Filtrer par catégorie</option>';
      console.error("Erreur lors de la récupération des catégories :", err.message);
    }
  }

  // Récupère les sous-catégories basées sur la catégorie sélectionnée
  async function fetchSubcategories(categoryName, selectedSubcategories = []) {
    const subcategoriesContainer = document.getElementById("filter-subcategories");
    if (!subcategoriesContainer) return;

    try {
      // filtres par défaut
      if (!categoryName) {
        subcategoriesContainer.innerHTML = '<p>Sélectionnez une catégorie pour voir les sous-catégories</p>';
        updateComboboxTriggerText([]);
        return;
      }
      if (!allCategories.length) {
        allCategories = await ApiClient.get("/product/product-categories");
      }
      const selectedCategory = allCategories.find(cat => cat.name.toLowerCase() === categoryName.toLowerCase() && cat.parent_id === null);
      if (!selectedCategory) {
        subcategoriesContainer.innerHTML = '<p>Aucune sous-catégorie disponible</p>';
        updateComboboxTriggerText([]);
        return;
      }
      const subcategories = allCategories.filter(cat => cat.parent_id === selectedCategory.id);
      if (!subcategories.length) {
        subcategoriesContainer.innerHTML = '<p>Aucune sous-catégorie disponible</p>';
        updateComboboxTriggerText([]);
        return;
      }
      subcategoriesContainer.innerHTML = '';
      subcategories.forEach((subcat) => {
        const div = document.createElement("div");
        div.className = "checkbox-item";
        div.innerHTML = `
          <input type="checkbox" id="subcat-${subcat.id}" value="${subcat.name}" ${selectedSubcategories.includes(subcat.name) ? 'checked' : ''} aria-label="Sous-catégorie ${subcat.name}">
          <label for="subcat-${subcat.id}">${subcat.name}</label>
        `;
        subcategoriesContainer.appendChild(div);
      });
      // Met à jour le texte du déclencheur basé sur les sous-catégories sélectionnées
      updateComboboxTriggerText(selectedSubcategories);

      // Ajoute des écouteurs d'événements aux cases à cocher
      subcategoriesContainer.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
          clearTimeout(debounceTimeout);
          debounceTimeout = setTimeout(() => {
            const selected = Array.from(subcategoriesContainer.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
            updateComboboxTriggerText(selected);
            updateURL();
            fetchProducts();
          }, 300);
        });
      });
    } catch (err) {
      subcategoriesContainer.innerHTML = '<p>Erreur lors du chargement des sous-catégories</p>';
      updateComboboxTriggerText([]);
      console.error("Erreur dans fetchSubcategories :", err.message);
    }
  }

  // Met à jour l'URL avec les paramètres de filtrage
  function updateURL(maxPriceOverride = null) {
    const sortBy = document.getElementById("sort-by")?.value || "";
    const brand = document.getElementById("filter-brand")?.value || "";
    const category = document.getElementById("filter-category")?.value || "";
    const subcategories = Array.from(document.querySelectorAll('#filter-subcategories input[type="checkbox"]:checked')).map(cb => cb.value);
    const minPrice = parseFloat(document.getElementById("min-price-slider")?.value || 0);
    const maxPrice = maxPriceOverride !== null ? maxPriceOverride : parseFloat(document.getElementById("max-price-slider")?.value || globalMaxPrice);
    const params = new URLSearchParams();
    if (sortBy) params.set("sortBy", sortBy);
    if (brand) params.set("brand", brand);
    if (category) params.set("category", category);
    if (subcategories.length > 0) params.set("subcategories", subcategories.join(","));
    params.set("minPrice", minPrice);
    params.set("maxPrice", maxPrice);
    const newURL = `${window.location.pathname}?${params.toString()}`;
    window.history.pushState({}, "", newURL);
  }

  // Transforme un produit de l'API en structure attendue par le frontend
  function transformProduct(apiProduct) {
    const categoryName = apiProduct.categories && apiProduct.categories.length > 0 ? apiProduct.categories[0].name : "Unknown";
    return {
      id: apiProduct.id,
      name: apiProduct.name,
      description: apiProduct.description,
      price: parseFloat(apiProduct.promo_price || apiProduct.price),
      original_price: apiProduct.promo_price !== null ? parseFloat(apiProduct.price) : null,
      brand: apiProduct.brand?.name || "",
      logo_url: apiProduct.brand?.logo_url ? `${SERVER_BASE_URL}${apiProduct.brand.logo_url.toLowerCase()}` : null,
      category: categoryName,
      subcategories: apiProduct.categories ? apiProduct.categories.map(cat => cat.name) : [],
      soldes: apiProduct.promo_price !== null,
      images: apiProduct.pictures?.map((pic) => `${SERVER_BASE_URL}${pic.image_url.toLowerCase()}`) || [],
    };
  }

  // Supprime les produits en double basés sur leur ID
  function removeDuplicateProducts(apiProducts) {
    const seenIds = new Set();
    const uniqueProducts = [];
    apiProducts.forEach(product => {
      if (!seenIds.has(product.id)) {
        seenIds.add(product.id);
        uniqueProducts.push(product);
      }
    });
    return uniqueProducts;
  }

  // Récupère les produits depuis l'API et met à jour le slider de prix max
  async function fetchProducts() {
    const grid = document.querySelector(".grid");
    if (grid) {
      grid.innerHTML = "<p>Chargement des produits...</p>";
    }
    try {
      const { category, subcategories } = getQueryParams();
      let apiProducts;
      // Prépare le corps de la requête POST
      const filterData = {};
      if (category) {
        filterData.category = category;
      }
      if (subcategories.length > 0) {
        filterData.subcategories = subcategories.join(",");
      }
      // Utilise une requête POST vers /product/products/filter
      apiProducts = await ApiClient.post("/product/products/filter", filterData);
      if (!Array.isArray(apiProducts)) {
        throw new Error("La réponse de l'API n'est pas un tableau");
      }

      // Stocke l'ancienne valeur de globalMaxPrice
      const previousMaxPrice = globalMaxPrice;
      // Gère le cas où aucun produit n'est retourné
      if (apiProducts.length === 0) {
        products = [];
        globalMaxPrice = 100;
      } else {
        // Supprime les doublons avant traitement
        apiProducts = removeDuplicateProducts(apiProducts);
        products = apiProducts.map(transformProduct);
        // Calcule le prix maximum global à partir de tous les produits
        globalMaxPrice = Math.ceil(Math.max(...products.map(p => p.price))) || 100;
      }
      const maxPriceSlider = document.getElementById("max-price-slider");
      const maxPriceValue = document.getElementById("max-price-value");

      if (maxPriceSlider) {
        maxPriceSlider.max = globalMaxPrice;
        // Récupère le paramètre maxPrice de l'URL
        const params = new URLSearchParams(window.location.search);
        const urlMaxPrice = parseFloat(params.get("maxPrice"));
        // Si globalMaxPrice augmente ou si aucun paramètre d'URL maxPrice n'est spécifié, repositionne le slider
        if (globalMaxPrice > previousMaxPrice || !urlMaxPrice || isNaN(urlMaxPrice)) {
          maxPriceSlider.value = globalMaxPrice;
        } else {
          // Sinon, respecte le paramètre d'URL, limité à globalMaxPrice
          maxPriceSlider.value = Math.min(urlMaxPrice, globalMaxPrice);
        }
        maxPriceValue.textContent = `${parseFloat(maxPriceSlider.value).toFixed(2).replace(".", ",")} EUR`;
        // Met à jour l'URL avec la nouvelle valeur du slider
        updateURL(parseFloat(maxPriceSlider.value));
      }
      filterProducts();
    } catch (err) {
      if (grid) {
        grid.innerHTML = "<p>Impossible de charger les produits. Veuillez réessayer plus tard.</p>";
      }
      console.error("Erreur dans fetchProducts :", {
        message: err.message,
        stack: err.stack,
        queryParams: getQueryParams()
      });
    }
  }

  // Configure l'observateur pour le lazy loading
  function setupIntersectionObserver() {
    if (observer) {
      observer.disconnect();
    }
    const grid = document.querySelector(".grid");
    if (!grid) return;

    let sentinel = document.getElementById("load-more-sentinel");
    if (!sentinel) {
      sentinel = document.createElement("div");
      sentinel.id = "load-more-sentinel";
      sentinel.style.height = "1px";
      sentinel.style.marginTop = "20px";
      grid.appendChild(sentinel);
    }
    observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          sentinel.classList.add("loading");
          loadMoreProducts();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(sentinel);
  }

  // Charge le lot suivant de produits
  function loadMoreProducts() {
    const grid = document.querySelector(".grid");
    const sentinel = document.getElementById("load-more-sentinel");
    if (!grid || !sentinel) return;

    const startIndex = currentBatch * productsPerBatch;
    const endIndex = Math.min(startIndex + productsPerBatch, filteredProducts.length);
    const newProducts = filteredProducts.slice(startIndex, endIndex);

    if (newProducts.length > 0) {
      newProducts.forEach((product) => {
        const productElement = createProductElement(product);
        grid.insertBefore(productElement, sentinel);
      });
      currentBatch++;
    }
    const productCount = document.getElementById("product-count");
    if (productCount) {
      productCount.textContent = `${filteredProducts.length} produits`;
    }
    if (endIndex >= filteredProducts.length) {
      sentinel.classList.remove("loading");
      sentinel.remove();
      if (observer) observer.disconnect();
    } else {
      sentinel.classList.remove("loading");
    }
  }

  // Crée un élément DOM pour un produit
  function createProductElement(product) {
    const productElement = document.createElement("div");
    productElement.className = "product";
    productElement.dataset.id = product.id;
    productElement.dataset.price = product.price;
    productElement.dataset.brand = product.brand;
    productElement.dataset.category = product.category;
    productElement.dataset.soldes = product.soldes;
    const imgUrl = product.images && product.images.length > 0 ? product.images[0] : "";
    const altText = `${product.brand} - ${product.name} - ${product.description}`;
    const priceHtml = product.soldes && product.original_price ? `<p><span class="promo-price">${product.price.toFixed(2).replace(".", ",")} EUR</span> <s class="original-price">${product.original_price.toFixed(2).replace(".", ",")} EUR</s></p>` : `<p>${product.price.toFixed(2).replace(".", ",")} EUR</p>`;
    const logoHtml = product.logo_url ? `<img src="${product.logo_url}" alt="logo ${product.brand} " class="brand-logo" />` : "";
    productElement.innerHTML = `
      <img src="${imgUrl}" alt="${altText}" class="product-image" />
      ${logoHtml}
      <h3>${product.brand} - ${product.name}</h3>
      ${priceHtml}
    `;
    productElement.addEventListener("mouseover", () => {
      if (product.images && product.images.length > 1) {
        const productImage = productElement.querySelector(".product-image");
        productImage.src = product.images[1];
      }
    });
    productElement.addEventListener("mouseout", () => {
      const productImage = productElement.querySelector(".product-image");
      productImage.src = imgUrl;
    });
    return productElement;
  }

  // Filtre et trie les produits
  function filterProducts() {
    const { sortBy, brand, minPrice, maxPrice } = getQueryParams();
    let sortedProducts = [...products];
    if (sortBy === "price-asc") {
      sortedProducts.sort((a, b) => a.price - b.price);
    } else if (sortBy === "price-desc") {
      sortedProducts.sort((a, b) => b.price - a.price);
    }
    filteredProducts = sortedProducts.filter((product) => {
      const matchesBrand = !brand || product.brand.toLowerCase() === brand.toLowerCase();
      const matchesPrice = product.price >= minPrice && product.price <= maxPrice;
      return matchesBrand && matchesPrice;
    });

    if (!document.querySelector(".grid")) {
      return;
    }
    const grid = document.querySelector(".grid");
    grid.innerHTML = "";
    currentBatch = 0;
    if (filteredProducts.length === 0) {
      grid.innerHTML = "<p>Aucun produit ne correspond aux filtres sélectionnés.</p>";
      const productCount = document.getElementById("product-count");
      if (productCount) {
        productCount.textContent = `0 produits`;
      }
      return;
    }

    const firstBatch = filteredProducts.slice(0, productsPerBatch);

    firstBatch.forEach((product) => {
      const productElement = createProductElement(product);
      grid.appendChild(productElement);
    });
    currentBatch = 1;
    if (filteredProducts.length > productsPerBatch) {
      const sentinel = document.createElement("div");
      sentinel.id = "load-more-sentinel";
      sentinel.style.height = "1px";
      sentinel.style.marginTop = "20px";
      grid.appendChild(sentinel);
      setupIntersectionObserver();
    }
    const productCount = document.getElementById("product-count");
    if (productCount) {
      productCount.textContent = `${filteredProducts.length} produits`;
    }
  }

  // Filtre par catégorie
  window.filterByCategory = function (event, category) {
    if (event && typeof event.preventDefault === "function") {
      event.preventDefault();
    }
    const categorySelect = document.getElementById("filter-category");
    if (categorySelect) {
      categorySelect.value = category || (typeof event === "string" ? event : "");
      fetchSubcategories(category || "");
      updateURL();
      fetchProducts();
    } else {
      window.location.href = `${window.location.origin}/pages/shop/shop.html?category=${category || (typeof event === "string" ? event : "")}`;
    }
  }

  // Filtre par sous-catégorie
  window.filterBySubcategory = function () {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
      updateURL();
      fetchProducts();
    }, 300);
  }

  // Réinitialise les filtres
  window.resetFilters = function () {
    const sortBy = document.getElementById("sort-by");
    const brand = document.getElementById("filter-brand");
    const category = document.getElementById("filter-category");
    const subcategoriesContainer = document.getElementById("filter-subcategories");
    const minPriceSlider = document.getElementById("min-price-slider");
    const maxPriceSlider = document.getElementById("max-price-slider");
    const minPriceValue = document.getElementById("min-price-value");
    const maxPriceValue = document.getElementById("max-price-value");

    if (sortBy) sortBy.value = "";
    if (brand) brand.value = "";
    if (category) category.value = "";
    if (subcategoriesContainer) subcategoriesContainer.innerHTML = '<p>Sélectionnez une catégorie pour voir les sous-catégories</p>';
    if (minPriceSlider) {
      minPriceSlider.value = 0;
      minPriceSlider.max = globalMaxPrice;
    }
    if (maxPriceSlider) {
      maxPriceSlider.value = globalMaxPrice;
      maxPriceSlider.max = globalMaxPrice;
    }
    if (minPriceValue) minPriceValue.textContent = "0,00 EUR";
    if (maxPriceValue) maxPriceValue.textContent = `${globalMaxPrice.toFixed(2).replace(".", ",")} EUR`;
    updateComboboxTriggerText([]);
    window.history.pushState({}, "", window.location.pathname);
    fetchProducts();
  }

  // Met à jour l'affichage des valeurs des curseurs de prix
  function updatePriceValues() {
    const minPriceSlider = document.getElementById("min-price-slider");
    const maxPriceSlider = document.getElementById("max-price-slider");
    const minPriceValue = document.getElementById("max-price-value");
    const maxPriceValue = document.getElementById("max-price-value");
    if (minPriceSlider && minPriceValue) {
      minPriceValue.textContent = `${parseFloat(minPriceSlider.value).toFixed(2).replace(".", ",")} EUR`;
    }
    if (maxPriceSlider && maxPriceValue) {
      maxPriceValue.textContent = `${parseFloat(maxPriceSlider.value).toFixed(2).replace(".", ",")} EUR`;
    }
  }

  // Configure les écouteurs d'événements
  function setupEventListeners() {
    const sortBy = document.getElementById("sort-by");
    const brand = document.getElementById("filter-brand");
    const category = document.getElementById("filter-category");
    const minPriceSlider = document.getElementById("min-price-slider");
    const maxPriceSlider = document.getElementById("max-price-slider");
    const applyFilter = document.getElementById("apply-filter");
    const clearAll = document.getElementById("clear-all");
    const comboboxTrigger = document.querySelector(".filter-subcategories .combobox-trigger");

    if (sortBy) {
      sortBy.addEventListener("change", () => {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
          updateURL();
          fetchProducts();
        }, 300);
      });
    }
    if (brand) {
      brand.addEventListener("change", () => {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
          updateURL();
          fetchProducts();
        }, 300);
      });
    }
    if (category) {
      category.addEventListener("change", () => {
        const categoryValue = category.value;
        fetchSubcategories(categoryValue);
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
          // Réinitialise la sélection des sous-catégories lors du changement de catégorie
          const subcategoriesContainer = document.getElementById("filter-subcategories");
          if (subcategoriesContainer) {
            subcategoriesContainer.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
              checkbox.checked = false;
            });
            updateComboboxTriggerText([]);
          }
          updateURL();
          fetchProducts();
        }, 300);
      });
    }
    if (minPriceSlider) {
      minPriceSlider.addEventListener("input", () => {
        updatePriceValues();
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
          updateURL();
          fetchProducts();
        }, 300);
      });
    }
    if (maxPriceSlider) {
      maxPriceSlider.addEventListener("input", () => {
        updatePriceValues();
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
          updateURL();
          fetchProducts();
        }, 300);
      });
    }
    if (applyFilter) {
      applyFilter.addEventListener("click", () => {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
          updateURL();
          fetchProducts();
        }, 300);
      });
    }
    if (clearAll) {
      clearAll.addEventListener("click", () => {
        resetFilters();
      });
    }
    if (comboboxTrigger) {
      comboboxTrigger.addEventListener("click", () => {
        const content = document.querySelector(".filter-subcategories .combobox-content");
        const isOpen = content.classList.toggle("open");
        comboboxTrigger.setAttribute("aria-expanded", isOpen);
      });
    }
    window.addEventListener("popstate", () => {
      initializeFilters();
      fetchProducts();
    });
  }

  // Initialise la page
  async function init() {
    initializeFilters();
    updatePriceValues();
    setupEventListeners();
    await fetchBrands();
    await fetchCategories();
    await fetchProducts();
  }

  init();
});