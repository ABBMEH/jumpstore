import { ApiClient } from "../../../utils/api.js";
import { Modal } from "../../../components/modal/modal.js";
import { SERVER_BASE_URL } from "../../../env.js";

export class ProductModule {
  constructor(modalManager, autoInitDataGrid = true) {
    this.modalManager = modalManager;
    this.dataGrid = null;
    this.autoInitDataGrid = autoInitDataGrid;
    this.currentProduct = null;
    this.sizes = [];
    this.sizeTypes = []; 
    this.sizeTypeSizesMap = new Map();
    if (autoInitDataGrid) {
      this.initDataGrid();
    }
  }

  // Initialise la grille de données pour afficher les produits
  initDataGrid() {
    if (this.dataGrid) return;
    try {
      this.dataGrid = new DataGrid("products-datagrid", {
        columns: [
          { title: "Nom", field: "name" },
          {
            title: "Prix",
            field: "price",
            formatter: (value) =>
              value !== null && value !== undefined
                ? `€${parseFloat(value).toFixed(2)}`
                : "€0.00",
          },
          { title: "Marque", field: "brand.name" },
          { title: "Type de Taille", field: "size_type.name" },
          {
            title: "Catégories",
            field: "categories",
            formatter: (categories) =>
              categories && Array.isArray(categories)
                ? categories.map((cat) => cat.name).join(", ")
                : "Aucune",
          },
          {
            title: "Statut",
            field: "is_active",
            formatter: (value) => (value ? "Actif" : "Inactif"),
          },
          {
            title: "Stock total",
            field: "variants",
            formatter: (variants) => {
              if (!variants || !Array.isArray(variants)) return "0";
              const total = variants.reduce(
                (sum, variant) => sum + (variant.stock_quantity || 0),
                0
              );
              if (total === 0) return '<span class="out-of-stock">Rupture</span>';
              if (total <= 5)
                return `<span class="low-stock">${total} (Faible)</span>`;
              return total.toString();
            },
          },
          {
            title: "Image",
            field: "pictures",
            formatter: (pictures) => {
              if (pictures && Array.isArray(pictures) && pictures.length > 0) {
                return `<img src="${SERVER_BASE_URL}${pictures[0].image_url}" alt="${pictures[0].alt_text || 'Product image'}" style="max-height: 20px;" />`;
              }
              return '<span style="color: #666;">Aucune image</span>';
            },
          },
        ],
        rowActions: [
          {
            type: "edit",
            icon: "fas fa-edit",
            title: "Modifier",
            onClick: (id) => this.edit(id),
          },
          {
            type: "delete",
            icon: "fas fa-trash",
            title: "Supprimer",
            onClick: (id) => this.delete(id),
          },
        ],
        rowsPerPage: 10,
        sortField: "name",
        sortDirection: "asc",
        onAddClick: () => this.showModal(),
      });
    } catch (error) {
      this.initFallbackDataGrid("products-datagrid");
    }
  }

  // Initialise une grille de secours en cas d'échec de chargement de DataGrid
  initFallbackDataGrid(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = `
        <div style="padding: 20px; text-align: center; color: #666;">
          <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 16px;"></i>
          <p>Composant DataGrid non chargé</p>
          <button class="btn-primary" onclick="location.reload()">Recharger la page</button>
        </div>
      `;
    }
  }

  // Charge les données des produits depuis l'API et les affiche dans la grille
  async loadData() {
    if (!this.dataGrid) {
      this.initDataGrid();
    }
    try {
      const products = await ApiClient.get("/product/products/all", true);
      if (this.dataGrid && typeof this.dataGrid.setData === "function") {
        this.dataGrid.setData(products);
      }
    } catch (err) {
      showMessage("Erreur lors du chargement des produits", "error");
    }
  }

  // Affiche une modale pour ajouter ou modifier un produit
  async showModal(product = null) {
    this.currentProduct = product;
    const formContent = `
      <form id="product-form" enctype="multipart/form-data">
        <input type="hidden" id="product-id" />
        <div class="form-row">
          <div class="form-group">
            <label for="name">Nom <span class="required">*</span></label>
            <input type="text" id="name" required />
            <div class="error-message" id="name-error" style="display: none; color: #dc3545; font-size: 12px; margin-top: 5px;"></div>
          </div>
          <div class="form-group">
            <label for="url_text">URL texte <span class="required">*</span></label>
            <input type="text" id="url_text" required />
            <div class="error-message" id="url_text-error" style="display: none; color: #dc3545; font-size: 12px; margin-top: 5px;"></div>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="description">Description</label>
            <textarea id="description" rows="3"></textarea>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="price">Prix (€) <span class="required">*</span></label>
            <input type="number" id="price" step="0.01" required />
            <div class="error-message" id="price-error" style="display: none; color: #dc3545; font-size: 12px; margin-top: 5px;"></div>
          </div>
          <div class="form-group">
            <label for="promo_price">Prix promo (€)</label>
            <input type="number" id="promo_price" step="0.01" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="cost">Coût (€)</label>
            <input type="number" id="cost" step="0.01" />
          </div>
          <div class="form-group">
            <label for="barcode">Code-barres</label>
            <input type="text" id="barcode" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="category_ids">Catégories <span class="required">*</span></label>
            <div class="filter-subcategories">
              <button type="button" class="combobox-trigger" aria-expanded="false">Sélectionner des catégories</button>
              <div class="combobox-content" id="category_ids">
                <p>Sélectionnez une ou plusieurs catégories</p>
              </div>
            </div>
            <div class="error-message" id="category_ids-error" style="display: none; color: #dc3545; font-size: 12px; margin-top: 5px;"></div>
          </div>
          <div class="form-group">
            <label for="brand_id">Marque <span class="required">*</span></label>
            <select id="brand_id" required>
              <option value="">Sélectionner une marque</option>
            </select>
            <div class="error-message" id="brand_id-error" style="display: none; color: #dc3545; font-size: 12px; margin-top: 5px;"></div>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="size_type_id">Type de Taille <span class="required">*</span></label>
            <select id="size_type_id" required>
              <option value="">Sélectionner un type de taille</option>
            </select>
            <div class="error-message" id="size_type_id-error" style="display: none; color: #dc3545; font-size: 12px; margin-top: 5px;"></div>
          </div>
          <div class="form-group">
            <label for="weight">Poids (kg)</label>
            <input type="number" id="weight" step="0.01" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="is_active">Actif</label>
            <input type="checkbox" id="is_active" checked />
          </div>
          <div class="form-group">
            <label for="is_highlight">Mise en avant</label>
            <input type="checkbox" id="is_highlight" />
          </div>
          <div class="form-group">
            <label for="is_used">Occasion</label>
            <input type="checkbox" id="is_used" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group full-width">
            <label for="product-pictures">Images (PNG, JPG, JPEG, SVG, WebP, max 10)</label>
            <input type="file" id="product-pictures" name="p-pictures" accept="image/png,image/jpeg,image/svg+xml,image/webp" multiple />
            <small>Maximum 10 images. Les images actuelles seront remplacées si de nouvelles sont sélectionnées.</small>
            <div id="product-pictures-preview" style="margin-top: 10px; display: flex; flex-wrap: wrap; gap: 10px;"></div>
            <div class="error-message" id="product-pictures-error" style="display: none; color: #dc3545; font-size: 12px; margin-top: 5px;"></div>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group full-width">
            <label>Tailles et Stocks <span class="required">*</span></label>
            <div id="sizes-container"></div>
            <div class="error-message" id="sizes-error" style="display: none; color: #dc3545; font-size: 12px; margin-top: 5px;"></div>
          </div>
        </div>
      </form>
    `;
    this.modalManager.show({
      title: product ? "Modifier le produit" : "Ajouter un produit",
      bodyContent: formContent,
      closeOnOutsideClick: false,
      buttons: [
        {
          id: "product-cancel",
          label: "Annuler",
          class: "btn-secondary",
          onClick: (e) => {
            e.preventDefault();
            this.modalManager.hide();
          },
        },
        {
          id: "product-submit",
          label: product ? "Modifier" : "Ajouter",
          class: "btn-primary",
          onClick: (e) => this.handleSubmit(e, product),
        },
      ],
    });
    await this.populateSelects();
    const comboboxTrigger = document.querySelector(".filter-subcategories .combobox-trigger");
    const comboboxContent = document.querySelector(".filter-subcategories .combobox-content");
    if (comboboxTrigger && comboboxContent) {
      comboboxTrigger.addEventListener("click", () => {
        const isOpen = comboboxContent.classList.toggle("open");
        comboboxTrigger.setAttribute("aria-expanded", isOpen);
      });
      comboboxContent.addEventListener("click", (e) => {
        if (e.target.type === "checkbox") {
          this.updateComboboxTriggerText();
        }
      });
    }
    const sizeTypeSelect = document.getElementById("size_type_id");
    if (sizeTypeSelect) {
      sizeTypeSelect.addEventListener("change", () => this.handleSizeTypeChange());
    }
    const picturesInput = document.getElementById("product-pictures");
    const picturesPreview = document.getElementById("product-pictures-preview");
    if (picturesInput && picturesPreview) {
      picturesInput.addEventListener("change", (e) => {
        picturesPreview.innerHTML = "";
        const files = Array.from(e.target.files).slice(0, 10);
        files.forEach((file) => {
          const reader = new FileReader();
          reader.onload = (ev) => {
            const img = document.createElement("img");
            img.src = ev.target.result;
            img.alt = "Image preview";
            img.style.maxHeight = "100px";
            img.style.borderRadius = "4px";
            picturesPreview.appendChild(img);
          };
          reader.readAsDataURL(file);
        });
      });
    }
    if (product) {
      this.populateForm(product);
    }
  }

  // Met à jour le texte du bouton de déclenchement du combobox
  updateComboboxTriggerText() {
    const comboboxTrigger = document.querySelector(".filter-subcategories .combobox-trigger");
    const checkedCheckboxes = document.querySelectorAll(".filter-subcategories .combobox-content input[type='checkbox']:checked");
    const selectedCategories = Array.from(checkedCheckboxes).map(cb => cb.nextElementSibling.textContent);
    comboboxTrigger.textContent = selectedCategories.length > 0 
      ? selectedCategories.join(", ")
      : "Sélectionner des catégories";
  }

  // Gère le changement de type de taille pour mettre à jour les tailles disponibles
  async handleSizeTypeChange() {
    const sizeTypeId = parseInt(document.getElementById("size_type_id").value);
    const sizesContainer = document.getElementById("sizes-container");
    const sizesError = document.getElementById("sizes-error");
    if (!sizeTypeId) {
      sizesContainer.innerHTML = "<p>Sélectionnez un type de taille pour afficher les tailles disponibles.</p>";
      this.sizes = [];
      return;
    }
    try {
      const sizes = await ApiClient.get(`/product/sizes/size-type/${sizeTypeId}`);
      this.sizes = sizes;
      sizesContainer.innerHTML = sizes
        .map(
          (size) => `
        <div class="size-item">
          <label for="size-${size.id}">${size.name}</label>
          <input type="number" id="size-${size.id}" name="size-${size.id}" min="0" value="0" class="size-quantity" />
        </div>
      `
        )
        .join("");
      if (this.currentProduct && this.currentProduct.variants) {
        this.currentProduct.variants.forEach((variant) => {
          const input = document.getElementById(`size-${variant.size_id}`);
          if (input) input.value = variant.stock_quantity || 0;
        });
      }
    } catch (error) {
      sizesContainer.innerHTML = "<p>Erreur lors du chargement des tailles.</p>";
      sizesError.textContent = "Erreur lors du chargement des tailles";
      sizesError.style.display = "block";
    }
  }

  // Remplit le formulaire avec les données d'un produit existant
  async populateForm(product) {
    document.getElementById("product-id").value = product.id || "";
    document.getElementById("name").value = product.name || "";
    document.getElementById("url_text").value = product.url_text || "";
    document.getElementById("description").value = product.description || "";
    document.getElementById("price").value = product.price || "";
    document.getElementById("promo_price").value = product.promo_price || "";
    document.getElementById("cost").value = product.cost || "";
    document.getElementById("barcode").value = product.barcode || "";
    document.getElementById("weight").value = product.weight || "";
    document.getElementById("size_type_id").value = product.size_type?.id || "";
    document.getElementById("is_active").checked = product.is_active || false;
    document.getElementById("is_highlight").checked = product.is_highlight || false;
    document.getElementById("is_used").checked = product.is_used || false;

    // gestion du preview des images
    const picturesPreview = document.getElementById("product-pictures-preview");
    if (product.id) {
      try {
        const pictures = await ApiClient.get(`/product/products/${product.id}/pictures`);
        picturesPreview.innerHTML = pictures.length > 0
          ? pictures
              .map(
                (pic) => `
                  <div style="position: relative;">
                    <img src="${pic.image_url}" alt="${pic.alt_text || 'Product image'}" style="max-height: 100px; border-radius: 4px;" />
                    <p style="font-size: 12px; color: #666;">Ordre: ${pic.display_order}</p>
                  </div>
                `
              )
              .join("")
          : '<p style="font-size: 12px; color: #666;">Aucune image actuelle</p>';
      } catch (error) {
        picturesPreview.innerHTML = '<p style="font-size: 12px; color: #666;">Erreur lors du chargement des images</p>';
      }
    } else {
      picturesPreview.innerHTML = '<p style="font-size: 12px; color: #666;">Aucune image actuelle</p>';
    }
  }

  // Définit les valeurs des listes déroulantes et checkboxes pour un produit existant
  setComboboxValues(product) {
    const brandSelect = document.getElementById("brand_id");
    if (brandSelect && product.brand_id) {
      brandSelect.value = product.brand_id;
    }
    if (product.categories) {
      product.categories.forEach((category) => {
        const checkbox = document.querySelector(`.filter-subcategories .combobox-content input[value="${category.id}"]`);
        if (checkbox) {
          checkbox.checked = true;
        }
      });
    }
    this.updateComboboxTriggerText();
  }

  // Remplit les listes déroulantes avec les données des marques, catégories et types de taille
  async populateSelects() {
    try {
      const [brands, productCategories, sizeTypes] = await Promise.all([
        ApiClient.get("/product/brands"),
        ApiClient.get("/product/product-categories"),
        ApiClient.get("/product/size-types"),
      ]);
      this.sizeTypes = sizeTypes;

      for (const sizeType of sizeTypes) {
        const sizes = await ApiClient.get(`/product/sizes/size-type/${sizeType.id}`);
        this.sizeTypeSizesMap.set(sizeType.id, sizes);
      }
      this.populateBrandSelect(brands);
      this.populateCategorySelect(productCategories);
      this.populateSizeTypeSelect(sizeTypes);
      if (this.currentProduct) {
        this.setComboboxValues(this.currentProduct);
        document.getElementById("size_type_id").value = this.currentProduct.size_type?.id || "";
        this.handleSizeTypeChange();
      }
    } catch (error) {
      showMessage("Erreur lors du chargement des options du formulaire", "error");
    }
  }

  // Remplit la liste déroulante des marques
  populateBrandSelect(brands) {
    const select = document.getElementById("brand_id");
    if (select) {
      select.innerHTML = '<option value="">Sélectionner une marque</option>';
      brands.forEach((brand) => {
        const option = document.createElement("option");
        option.value = brand.id;
        option.textContent = brand.name;
        select.appendChild(option);
      });
      if (this.currentProduct && this.currentProduct.brand_id) {
        select.value = this.currentProduct.brand_id;
      }
    }
  }

  // Remplit la liste déroulante des types de taille
  populateSizeTypeSelect(sizeTypes) {
    const select = document.getElementById("size_type_id");
    if (select) {
      select.innerHTML = '<option value="">Sélectionner un type de taille</option>';
      sizeTypes.forEach((sizeType) => {
        const sizes = this.sizeTypeSizesMap.get(sizeType.id) || [];
        const sizeNames = sizes.map((size) => size.name).join(", ");
        const option = document.createElement("option");
        option.value = sizeType.id;
        option.textContent = sizeNames ? `${sizeType.name} (${sizeNames})` : sizeType.name;
        select.appendChild(option);
      });
      if (this.currentProduct && this.currentProduct.size_type?.id) {
        select.value = this.currentProduct.size_type.id;
      }
    }
  }

  // Remplit la liste des catégories avec des checkboxes
  populateCategorySelect(productCategories) {
    const comboboxContent = document.querySelector(".filter-subcategories .combobox-content");
    if (comboboxContent) {
      comboboxContent.innerHTML = "";
      if (!productCategories.length) {
        comboboxContent.innerHTML = "<p>Aucune catégorie disponible</p>";
        return;
      }
      productCategories.forEach((category) => {
        const div = document.createElement("div");
        div.className = "checkbox-item";
        div.innerHTML = `
          <input type="checkbox" id="cat-${category.id}" value="${category.id}" aria-label="Catégorie ${category.name}">
          <label for="cat-${category.id}">${category.name}</label>
        `;
        comboboxContent.appendChild(div);
      });
      if (this.currentProduct && this.currentProduct.categories) {
        this.currentProduct.categories.forEach((category) => {
          const checkbox = comboboxContent.querySelector(`input[value="${category.id}"]`);
          if (checkbox) {
            checkbox.checked = true;
          }
        });
      }
      this.updateComboboxTriggerText();
    }
  }

  // Valide les données du formulaire avant soumission
  validateForm() {
    let isValid = true;
    document.querySelectorAll(".error-message").forEach((el) => {
      el.style.display = "none";
      el.textContent = "";
    });
    const requiredFields = [
      { id: "name", message: "Le nom est requis" },
      { id: "url_text", message: "L'URL texte est requise" },
      { id: "price", message: "Le prix est requis" },
      { id: "brand_id", message: "La marque est requise" },
      { id: "category_ids", message: "Au moins une catégorie est requise" },
      { id: "size_type_id", message: "Le type de taille est requis" },
    ];
    requiredFields.forEach((field) => {
      if (field.id === "category_ids") {
        const checkedCheckboxes = document.querySelectorAll(".filter-subcategories .combobox-content input[type='checkbox']:checked");
        if (checkedCheckboxes.length === 0) {
          const errorElement = document.getElementById("category_ids-error");
          if (errorElement) {
            errorElement.textContent = field.message;
            errorElement.style.display = "block";
          }
          isValid = false;
        }
      } else {
        const element = document.getElementById(field.id);
        if (!element.value.trim()) {
          const errorElement = document.getElementById(`${field.id}-error`);
          if (errorElement) {
            errorElement.textContent = field.message;
            errorElement.style.display = "block";
          }
          isValid = false;
        }
      }
    });
    const price = document.getElementById("price");
    const priceError = document.getElementById("price-error");
    if (price.value && parseFloat(price.value) < 0) {
      if (priceError) {
        priceError.textContent = "Le prix doit être positif";
        priceError.style.display = "block";
      }
      isValid = false;
    }
    const promoPrice = document.getElementById("promo_price");
    const promoPriceError = document.getElementById("promo_price-error");
    if (promoPrice.value && parseFloat(promoPrice.value) < 0) {
      if (promoPriceError) {
        promoPriceError.textContent = "Le prix promo doit être positif";
        promoPriceError.style.display = "block";
      }
      isValid = false;
    }
    const cost = document.getElementById("cost");
    const costError = document.getElementById("cost-error");
    if (cost.value && parseFloat(cost.value) < 0) {
      if (costError) {
        costError.textContent = "Le coût doit être positif";
        costError.style.display = "block";
      }
      isValid = false;
    }
    const picturesInput = document.getElementById("product-pictures");
    const picturesError = document.getElementById("product-pictures-error");
    if (picturesInput.files.length > 10) {
      picturesError.textContent = "Maximum 10 images autorisées";
      picturesError.style.display = "block";
      isValid = false;
    }
    if (picturesInput.files.length > 0) {
      const validTypes = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"];
      Array.from(picturesInput.files).forEach((file) => {
        if (!validTypes.includes(file.type) || file.size > 5 * 1024 * 1024) {
          picturesError.textContent = "Image invalide (PNG/JPG/SVG/WebP, max 5MB)";
          picturesError.style.display = "block";
          isValid = false;
        }
      });
    }
    const sizesContainer = document.getElementById("sizes-container");
    const sizesError = document.getElementById("sizes-error");
    let hasValidStock = false;
    if (this.sizes.length > 0) {
      this.sizes.forEach((size) => {
        const input = document.getElementById(`size-${size.id}`);
        if (input && parseInt(input.value) > 0) {
          hasValidStock = true;
        }
      });
      if (!hasValidStock) {
        sizesError.textContent =
          "Au moins une taille doit avoir une quantité positive";
        sizesError.style.display = "block";
        isValid = false;
      }
    }
    return isValid;
  }

  // Gère la soumission du formulaire pour ajouter ou modifier un produit
  async handleSubmit(e, product) {
    e.preventDefault();
    if (!this.validateForm()) {
      return;
    }
    try {
      const formData = new FormData();
      formData.append("name", document.getElementById("name").value);
      formData.append("url_text", document.getElementById("url_text").value);
      formData.append("description", document.getElementById("description").value);
      formData.append("price", parseFloat(document.getElementById("price").value));
      const promoPriceValue = document.getElementById("promo_price").value;
      if (promoPriceValue) {
        formData.append("promo_price", parseFloat(promoPriceValue));
      }
      const costValue = document.getElementById("cost").value;
      if (costValue) {
        formData.append("cost", parseFloat(costValue));
      }
      const barcodeValue = document.getElementById("barcode").value;
      if (barcodeValue) {
        formData.append("barcode", barcodeValue);
      }
      formData.append(
        "brand_id",
        parseInt(document.getElementById("brand_id").value)
      );
      formData.append(
        "size_type_id",
        parseInt(document.getElementById("size_type_id").value)
      );
      const categoryIds = Array.from(
        document.querySelectorAll(".filter-subcategories .combobox-content input[type='checkbox']:checked")
      ).map((checkbox) => parseInt(checkbox.value));
      formData.append("category_ids", JSON.stringify(categoryIds));
      const weightValue = document.getElementById("weight").value;
      if (weightValue) {
        formData.append("weight", parseFloat(weightValue));
      }
      formData.append("is_active", document.getElementById("is_active").checked);
      formData.append(
        "is_highlight",
        document.getElementById("is_highlight").checked
      );
      formData.append("is_used", document.getElementById("is_used").checked);
      const variants = this.sizes
        .map((size) => {
          const input = document.getElementById(`size-${size.id}`);
          return {
            size_id: size.id,
            stock_quantity: parseInt(input.value) || 0,
          };
        })
        .filter((variant) => variant.stock_quantity > 0);
      formData.append("variants", JSON.stringify(variants));
      const picturesInput = document.getElementById("product-pictures");
      if (picturesInput.files.length > 0) {
        for (let i = 0; i < Math.min(picturesInput.files.length, 10); i++) {
          formData.append("p-pictures", picturesInput.files[i]);
        }
      }
      const productId = product ? product.id : null;
      const url = productId ? `/product/products/${productId}` : `/product/products`;
      if (productId) {
        await ApiClient.put(url, formData, true);
      } else {
        await ApiClient.post(url, formData, true);
      }
      showMessage(
        `Produit ${productId ? "modifié" : "ajouté"} avec succès`,
        "success"
      );
      this.modalManager.hide();
      this.loadData();
    } catch (err) {
      let errorMessage = "Erreur lors de la sauvegarde du produit";
      if (err.message && err.message.includes("HTTP error")) {
        const errorResponse = await err.response?.json();
        if (errorResponse && errorResponse.message) {
          errorMessage = errorResponse.message;
        }
      }
      showMessage(errorMessage, "error");
    }
  }

  // Charge les données d'un produit pour modification
  async edit(id) {
    try {
      const product = await ApiClient.get(`/product/products/${id}`);
      this.showModal(product);
    } catch (err) {
      showMessage("Erreur lors du chargement du produit", "error");
    }
  }

  // Affiche une modale pour confirmer la suppression d'un produit
  async delete(id) {
    this.modalManager.show({
      title: "Confirmer la suppression",
      bodyContent: "<p>Êtes-vous sûr de vouloir supprimer ce produit ? Cette action est irréversible.</p>",
      buttons: [
        {
          id: "delete-cancel",
          label: "Annuler",
          class: "btn-secondary",
          onClick: () => this.modalManager.hide(),
        },
        {
          id: "delete-confirm",
          label: "Supprimer",
          class: "btn-primary",
          onClick: async () => {
            try {
              await ApiClient.delete(`/product/products/${id}`, true);
              showMessage("Produit supprimé avec succès", "success");
              this.modalManager.hide();
              this.loadData();
            } catch (err) {
              showMessage("Erreur lors de la suppression du produit", "error");
            }
          },
        },
      ],
    });
  }
}