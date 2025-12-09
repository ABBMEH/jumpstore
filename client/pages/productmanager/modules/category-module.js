import { ApiClient } from "../../../utils/api.js";
import { Modal } from "../../../components/modal/modal.js";
import { SERVER_BASE_URL } from "../../../env.js";

export class CategoryModule {
  constructor(modalManager, autoInitDataGrid = true) {
    this.modalManager = modalManager;
    this.dataGrid = null;
    this.autoInitDataGrid = autoInitDataGrid;
    this.currentProductCategory = null;
    this.topLevelCategories = [];
    if (autoInitDataGrid) {
      this.init();
    }
  }

  // Initialisation
  async init() {
    try {
      await this.fetchTopLevelCategories();
      this.initDataGrid();
    } catch (err) {
      console.error("Error initializing CategoryModule:", err);
      showMessage("Erreur lors de l'initialisation du module des catégories", "error");
    }
  }

  // recuperation des catégories principales
  async fetchTopLevelCategories() {
    try {
      const allCategories = await ApiClient.get("/product/product-categories");
      this.topLevelCategories = allCategories.filter(cat => !cat.parent_id) || [];
    } catch (err) {
      console.error("Error fetching top-level categories:", err);
      this.topLevelCategories = [];
    }
  }

  // Initialise la grille de données pour afficher les catégories
  initDataGrid() {
    if (this.dataGrid) return;
    try {
      this.dataGrid = new DataGrid("product-categories-datagrid", {
        columns: [
          { title: "Nom", field: "name", sortable: true },
          { title: "URL Slug", field: "url_text", sortable: true },
          { title: "Parent", field: "parent_name", sortable: false },
          { title: "Navbar", field: "show_on_navbar", formatter: (value) => (value ? "Oui" : "Non") },
          { title: "Accueil", field: "show_on_home", formatter: (value) => (value ? "Oui" : "Non") },
          { title: "Actif", field: "is_active", formatter: (value) => (value ? "Actif" : "Inactif") },
          { title: "Ordre", field: "order", sortable: true },
          { 
            title: "Image", 
            field: "image_url", 
            formatter: (value) => (value ? `<img src="${SERVER_BASE_URL}${value}" alt="Preview" style="max-height: 20px;" />` : "Aucune") 
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
      this.initFallbackDataGrid("product-categories-datagrid");
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

  // Charge les données des catégories depuis l'API et les affiche dans la grille
  async loadData() {
    if (!this.dataGrid) {
      this.initDataGrid();
    }
    try {
      // Ensure topLevelCategories is populated
      if (this.topLevelCategories.length === 0) {
        await this.fetchTopLevelCategories();
      }
      const categories = await ApiClient.get("/product/product-categories");
      // Flatten hierarchical data for grid (include parent_name)
      const flatCategories = categories.map(cat => ({
        ...cat,
        parent_name: cat.parent_id ? this.resolveParentName(cat.parent_id) : "N/A",
      }));
      if (this.dataGrid && typeof this.dataGrid.setData === "function") {
        this.dataGrid.setData(flatCategories);
      }
    } catch (err) {
      console.error("Error in loadData:", err);
      showMessage("Erreur lors du chargement des catégories", "error");
    }
  }

  // récupération du nom des catégories parent
  resolveParentName(parentId) {
    const parent = this.topLevelCategories.find(cat => cat.id === parseInt(parentId));
    return parent ? parent.name : "Inconnu";
  }

  // Affiche un modal pour ajouter ou modifier une catégorie
  async showModal(productCategory = null) {
    this.currentProductCategory = productCategory;

    if (this.topLevelCategories.length === 0) {
      await this.fetchTopLevelCategories();
    }

    const formContent = `
      <form id="product-category-form" enctype="multipart/form-data">
        <input type="hidden" id="product-category-id" />
        <div class="form-row">
          <div class="form-group">
            <label for="product-category-name">Nom <span class="required">*</span></label>
            <input type="text" id="product-category-name" required />
            <div class="error-message" id="product-category-name-error"></div>
          </div>
          <div class="form-group">
            <label for="product-category-url-text">URL Slug <span class="required">*</span></label>
            <input type="text" id="product-category-url-text" required pattern="[a-z0-9-]+"/>
            <div class="error-message" id="product-category-url-text-error"></div>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="product-category-parent">Catégorie Parente</label>
            <select id="product-category-parent">
              <option value="">-- Aucune --</option>
              ${this.topLevelCategories.map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>
              <input type="checkbox" id="show-on-navbar" /> Afficher dans la Navbar
            </label>
          </div>
          <div class="form-group">
            <label>
              <input type="checkbox" id="show-on-home" /> Afficher sur l'Accueil
            </label>
          </div>
          <div class="form-group">
            <label>
              <input type="checkbox" id="is_active" checked /> Actif
            </label>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="order">Ordre <span class="required">*</span></label>
            <input type="number" id="order" required min="0" />
            <div class="error-message" id="order-error"></div>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group full-width">
            <label for="category-image">Image (PNG, JPG, JPEG, SVG, WebP)</label>
            <input type="file" id="category-image" name="image" accept="image/png,image/jpeg,image/svg+xml,image/webp" />
            <small>Image optionnelle (max 5MB) - L'image actuelle sera conservée si aucune nouvelle n'est sélectionnée</small>
            <div id="category-image-preview" style="margin-top: 10px;"></div>
            <div class="error-message" id="category-image-error"></div>
          </div>
        </div>
      </form>
    `;
    this.modalManager.show({
      title: productCategory ? "Modifier la catégorie" : "Ajouter une catégorie",
      bodyContent: formContent,
      buttons: [
        {
          id: "product-category-cancel",
          label: "Annuler",
          class: "btn-secondary",
          onClick: (e) => {
            e.preventDefault();
            this.modalManager.hide();
          },
        },
        {
          id: "product-category-submit",
          label: productCategory ? "Modifier" : "Ajouter",
          class: "btn-primary",
          onClick: (e) => this.handleSubmit(e, productCategory),
        },
      ],
    });

    // events listener de vérification sur les inputs
    const nameInput = document.getElementById("product-category-name");
    const urlTextInput = document.getElementById("product-category-url-text");
    nameInput.addEventListener("input", (e) => {
      if (!urlTextInput.value.trim()) {
        const slug = e.target.value.trim().toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
        urlTextInput.value = slug;
      }
    });
    urlTextInput.addEventListener("input", (e) => {
      e.target.value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-');
    });

    // preview des images
    const imageInput = document.getElementById("category-image");
    const imagePreview = document.getElementById("category-image-preview");
    if (imageInput && imagePreview) {
      imageInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (ev) => {
            imagePreview.innerHTML = `<img src="${ev.target.result}" alt="Preview" style="max-height: 100px; border-radius: 4px;" />`;
          };
          reader.readAsDataURL(file);
        }
      });
    }
    this.modalManager.rebindFormEvents("product-category-form", (e) => this.handleSubmit(e, productCategory));

    if (productCategory) {
      this.populateForm(productCategory);
    }
    
  }

  // Remplit le formulaire avec les données d'une catégorie existante
  populateForm(productCategory) {
    document.getElementById("product-category-id").value = productCategory.id || "";
    document.getElementById("product-category-name").value = productCategory.name || "";
    document.getElementById("product-category-url-text").value = productCategory.url_text || "";
    document.getElementById("product-category-parent").value = productCategory.parent_id || "";
    document.getElementById("show-on-navbar").checked = productCategory.show_on_navbar || false;
    document.getElementById("show-on-home").checked = productCategory.show_on_home || false;
    document.getElementById("is_active").checked = productCategory.is_active !== undefined ? productCategory.is_active : true;
    document.getElementById("order").value = productCategory.order || 0;

    // Preserve current image preview
    const imagePreview = document.getElementById("category-image-preview");
    if (productCategory.image_url) {
      imagePreview.innerHTML = `
        <div style="margin-bottom: 10px;">
          <img src="${SERVER_BASE_URL}${productCategory.image_url}" alt="Current Image" style="max-height: 100px; border-radius: 4px;" />
          <p style="font-size: 12px; color: #666;">Image actuelle (remplacée si un nouveau fichier est sélectionné)</p>
        </div>
      `;
    } else {
      imagePreview.innerHTML = `<p style="font-size: 12px; color: #666;">Aucune image actuelle</p>`;
    }
  }

  // Valide les données du formulaire avant soumission
  validateForm() {
    let isValid = true;
    const errors = {
      name: document.getElementById("product-category-name-error"),
      urlText: document.getElementById("product-category-url-text-error"),
      order: document.getElementById("order-error"),
      image: document.getElementById("category-image-error"),
    };
    Object.values(errors).forEach(error => {
      if (error) {
        error.style.display = "none";
        error.textContent = "";
      }
    });

    const name = document.getElementById("product-category-name").value.trim();
    const urlText = document.getElementById("product-category-url-text").value.trim();
    const order = parseInt(document.getElementById("order").value);
    const imageFile = document.getElementById("category-image").files[0];

    if (!name) {
      errors.name.textContent = "Le nom est requis";
      errors.name.style.display = "block";
      isValid = false;
    }
    if (!urlText || !/^[a-z0-9-]+$/.test(urlText)) {
      errors.urlText.textContent = "URL Slug invalide (minuscules, tirets uniquement)";
      errors.urlText.style.display = "block";
      isValid = false;
    }
    if (isNaN(order) || order < 0) {
      errors.order.textContent = "L'ordre doit être un nombre positif";
      errors.order.style.display = "block";
      isValid = false;
    }
    if (imageFile) {
      const validTypes = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"];
      if (!validTypes.includes(imageFile.type) || imageFile.size > 5 * 1024 * 1024) {
        errors.image.textContent = "Image invalide (PNG/JPG/SVG/WebP, max 5MB)";
        errors.image.style.display = "block";
        isValid = false;
      }
    }

    return isValid;
  }

  // Gère la soumission du formulaire pour ajouter ou modifier une catégorie
  async handleSubmit(e, productCategory) {
    e.preventDefault();
    if (!this.validateForm()) return;

    try {
      const submitButton = document.getElementById("product-category-submit");
      submitButton.disabled = true;
      submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enregistrement...';

      const formData = new FormData();
      formData.append("name", document.getElementById("product-category-name").value.trim());
      formData.append("url_text", document.getElementById("product-category-url-text").value.trim());
      formData.append("parent_id", document.getElementById("product-category-parent").value || "");
      formData.append("show_on_navbar", document.getElementById("show-on-navbar").checked);
      formData.append("show_on_home", document.getElementById("show-on-home").checked);
      formData.append("is_active", document.getElementById("is_active").checked);
      formData.append("order", document.getElementById("order").value);

      const imageInput = document.getElementById("category-image");
      if (imageInput.files.length > 0) {
        formData.append("image", imageInput.files[0]);
      } else {
        // Preserve current image_url if no new file
        if (productCategory && productCategory.image_url) {
          formData.append("image_url", productCategory.image_url);
        }
      }

      const productCategoryId = productCategory ? productCategory.id : null;
      const url = productCategoryId 
        ? `/product/product-categories/${productCategoryId}` 
        : `/product/product-categories`;

      if (productCategoryId) {
        await ApiClient.put(url, formData, true);
      } else {
        await ApiClient.post(url, formData, true);
      }

      showMessage(`Catégorie ${productCategoryId ? "modifiée" : "ajoutée"} avec succès`, "success");
      this.modalManager.hide();
      this.loadData();
    } catch (err) {
      let errorMessage = "Erreur lors de la sauvegarde de la catégorie";
      if (err.response) {
        try {
          const errorResponse = await err.response.json();
          errorMessage = errorResponse.error || errorResponse.message || errorMessage;
        } catch {}
      }
      showMessage(errorMessage, "error");
    } finally {
      const submitButton = document.getElementById("product-category-submit");
      submitButton.disabled = false;
      submitButton.innerHTML = productCategory ? "Modifier" : "Ajouter";
    }
  }

  // Charge les données d'une catégorie pour modification
  async edit(id) {
    try {
      const productCategory = await ApiClient.get(`/product/product-categories/${id}`);
      this.showModal(productCategory);
    } catch (err) {
      showMessage("Erreur lors du chargement de la catégorie", "error");
    }
  }

  // Affiche une modale pour confirmer la suppression d'une catégorie
  async delete(id) {
    this.modalManager.show({
      title: "Confirmer la suppression",
      bodyContent: "<p>Êtes-vous sûr de vouloir supprimer cette catégorie ? Les sous-catégories et associations produits seront supprimées.</p>",
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
              await ApiClient.delete(`/product/product-categories/${id}`, true);
              showMessage("Catégorie supprimée avec succès", "success");
              this.modalManager.hide();
              this.loadData();
            } catch (err) {
              showMessage("Erreur lors de la suppression de la catégorie", "error");
            }
          },
        },
      ],
    });
  }
}