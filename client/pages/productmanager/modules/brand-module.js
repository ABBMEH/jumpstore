import { ApiClient } from "../../../utils/api.js";
import { Modal } from "../../../components/modal/modal.js";
import { SERVER_BASE_URL } from "../../../env.js";

export class BrandModule {
  constructor(modalManager, autoInitDataGrid = true) {
    this.modalManager = modalManager;
    this.dataGrid = null;
    this.autoInitDataGrid = autoInitDataGrid;

    if (autoInitDataGrid) {
      this.initDataGrid();
    }
  }

  // Initialise la grille de données pour afficher les marques
  initDataGrid() {
    if (this.dataGrid) return;

    try {
      this.dataGrid = new DataGrid("brands-datagrid", {
        columns: [
          { title: "Nom", field: "name" },
          { title: "URL texte", field: "url_text" },
          {
            title: "Navbar",
            field: "show_on_navbar",
            formatter: (value) => (value ? "Oui" : "Non"),
          },
          {
            title: "Homepage",
            field: "show_on_home",
            formatter: (value) => (value ? "Oui" : "Non"),
          },
          {
            title: "Statut",
            field: "is_active",
            formatter: (value) => (value ? "Actif" : "Inactif"),
          },
          {
            title: "Logo",
            field: "logo_url",
            formatter: (value) => value ? `<img src="${SERVER_BASE_URL}${value}" alt="Brand Logo" style="max-height: 20px;" />` : "Aucun",
          },
          {
            title: "Photos",
            field: "pictures",
            formatter: (value) => value.length ? `${value.length} photo(s)` : "Aucune",
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
      this.initFallbackDataGrid("brands-datagrid");
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

  // Charge les données des marques depuis l'API et les affiche dans la grille
  async loadData() {
    if (!this.dataGrid) {
      this.initDataGrid();
    }

    try {
      const brands = await ApiClient.get("/product/brands");
      if (this.dataGrid && typeof this.dataGrid.setData === "function") {
        this.dataGrid.setData(brands);
      }
    } catch (err) {
      showMessage("Erreur lors du chargement des marques", "error");
    }
  }

  // Affiche une modale pour ajouter ou modifier une marque
  showModal(brand = null) {
    const formContent = `
      <form id="brand-form" enctype="multipart/form-data">
        <input type="hidden" id="brand-id" />
        <div class="form-row">
          <div class="form-group">
            <label for="brand-name">Nom <span class="required">*</span></label>
            <input type="text" id="brand-name" required />
            <div class="error-message" id="brand-name-error" style="display: none; color: #dc3545; font-size: 12px; margin-top: 5px;"></div>
          </div>
          <div class="form-group">
            <label for="brand-url_text">URL texte <span class="required">*</span></label>
            <input type="text" id="brand-url_text" required />
            <div class="error-message" id="brand-url_text-error" style="display: none; color: #dc3545; font-size: 12px; margin-top: 5px;"></div>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group full-width">
            <label for="brand-description">Description</label>
            <textarea id="brand-description" rows="3"></textarea>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="brand-show_on_navbar">Afficher sur navbar</label>
            <input type="checkbox" id="brand-show_on_navbar" />
          </div>
          <div class="form-group">
            <label for="brand-show_on_home">Afficher sur homepage</label>
            <input type="checkbox" id="brand-show_on_home" />
          </div>
          <div class="form-group">
            <label for="brand-is_active">Actif</label>
            <input type="checkbox" id="brand-is_active" checked />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="brand-logo">Logo (PNG, JPG, JPEG, SVG, WebP)</label>
            <input type="file" id="brand-logo" name="logo" accept="image/png,image/jpeg,image/svg+xml,image/webp" />
            <div id="brand-logo-preview" style="margin-top: 10px;"></div>
            <div class="error-message" id="brand-logo-error" style="display: none; color: #dc3545; font-size: 12px; margin-top: 5px;"></div>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group full-width">
            <label for="brand-pictures">Nouvelles Images (PNG, JPG, JPEG, SVG, WebP, max 10)</label>
            <input type="file" id="brand-pictures" name="pictures" accept="image/png,image/jpeg,image/svg+xml,image/webp" multiple />
            <div id="brand-pictures-preview" style="margin-top: 10px;"></div>
            <small>Maximum 10 nouvelles images</small>
            <div class="error-message" id="brand-pictures-error" style="display: none; color: #dc3545; font-size: 12px; margin-top: 5px;"></div>
          </div>
        </div>
        <div class="form-row" id="existing-pictures-section" style="display: none;">
          <div class="form-group full-width">
            <label>Images Existantes (cochez pour supprimer)</label>
            <div id="existing-pictures-preview"></div>
            <input type="hidden" id="delete-picture-ids" name="delete_picture_ids" />
          </div>
        </div>
      </form>
    `;

    this.modalManager.show({
      title: brand ? "Modifier la marque" : "Ajouter une marque",
      bodyContent: formContent,
      buttons: [
        {
          id: "brand-cancel",
          label: "Annuler",
          class: "btn-secondary",
          onClick: (e) => {
            e.preventDefault();
            this.modalManager.hide();
          },
        },
        {
          id: "brand-submit",
          label: brand ? "Modifier" : "Ajouter",
          class: "btn-primary",
          onClick: (e) => this.handleSubmit(e, brand),
        },
      ],
    });

    if (brand) {
      this.populateForm(brand);
      this.setupExistingPicturesDeletion(brand.pictures || []);
    }
    this.modalManager.rebindFormEvents("brand-form", (e) => this.handleSubmit(e, brand));

    this.setupFilePreviews();
  }

  // Configure les aperçus pour les fichiers de logo et d'images (new uploads)
  setupFilePreviews() {
    const logoInput = document.getElementById("brand-logo");
    const logoPreview = document.getElementById("brand-logo-preview");
    if (logoInput && logoPreview) {
      logoInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (ev) => {
            logoPreview.innerHTML = `<img src="${ev.target.result}" alt="Preview" style="max-height: 100px;" />`;
          };
          reader.readAsDataURL(file);
        }
      });
    }

    const picturesInput = document.getElementById("brand-pictures");
    const picturesPreview = document.getElementById("brand-pictures-preview");
    if (picturesInput && picturesPreview) {
      picturesInput.addEventListener("change", (e) => {
        picturesPreview.innerHTML = "";
        Array.from(e.target.files).forEach((file) => {
          const reader = new FileReader();
          reader.onload = (ev) => {
            picturesPreview.innerHTML += `<img src="${ev.target.result}" alt="Preview" style="max-height: 100px; margin: 5px;" />`;
          };
          reader.readAsDataURL(file);
        });
      });
    }
  }

  // ajout des checkbox de suppression des images
  setupExistingPicturesDeletion(existingPictures) {
    const section = document.getElementById("existing-pictures-section");
    const previewContainer = document.getElementById("existing-pictures-preview");
    const deleteIdsInput = document.getElementById("delete-picture-ids");

    if (existingPictures.length === 0) {
      section.style.display = "none";
      return;
    }

    section.style.display = "block";
    previewContainer.innerHTML = existingPictures.map(pic => `
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
        <img src="${SERVER_BASE_URL}${pic.image_url}" alt="${pic.alt_text || 'Brand Image'}" style="max-height: 60px; max-width: 60px; object-fit: cover;" />
        <span style="flex: 1;">${pic.alt_text || 'Image'} (Type: ${pic.image_type})</span>
        <label style="display: flex; align-items: center; gap: 5px;">
          <input type="checkbox" class="delete-picture-checkbox" value="${pic.id}" />
          Supprimer
        </label>
      </div>
    `).join('');

    // event listener pour les checkbox
    const checkboxes = previewContainer.querySelectorAll(".delete-picture-checkbox");
    checkboxes.forEach(checkbox => {
      checkbox.addEventListener("change", () => {
        const checkedIds = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value);
        deleteIdsInput.value = checkedIds.join(',');
      });
    });
  }

  // Remplit le formulaire avec les données d'une marque existante
  populateForm(brand) {
    document.getElementById("brand-id").value = brand.id || "";
    document.getElementById("brand-name").value = brand.name || "";
    document.getElementById("brand-url_text").value = brand.url_text || "";
    document.getElementById("brand-description").value = brand.description || "";
    document.getElementById("brand-show_on_navbar").checked = brand.show_on_navbar || false;
    document.getElementById("brand-show_on_home").checked = brand.show_on_home || false;
    document.getElementById("brand-is_active").checked = brand.is_active !== undefined ? brand.is_active : true;

    const logoPreview = document.getElementById("brand-logo-preview");
    if (brand.logo_url) {
      logoPreview.innerHTML = `
        <div style="margin-bottom: 10px;">
          <img src="${SERVER_BASE_URL}${brand.logo_url}" alt="Current Logo" style="max-height: 20px; max-width: 100%;" />
          <p style="font-size: 12px; color: #666;">Logo actuel (remplacé si un nouveau fichier est sélectionné)</p>
        </div>
      `;
    } else {
      logoPreview.innerHTML = `<p style="font-size: 12px; color: #666;">Aucun logo actuel</p>`;
    }
  }

  // Valide les données du formulaire avant soumission
  validateForm() {
    let isValid = true;
    const nameInput = document.getElementById("brand-name");
    const urlTextInput = document.getElementById("brand-url_text");
    const logoInput = document.getElementById("brand-logo");
    const picturesInput = document.getElementById("brand-pictures");
    const nameError = document.getElementById("brand-name-error");
    const urlTextError = document.getElementById("brand-url_text-error");
    const logoError = document.getElementById("brand-logo-error");
    const picturesError = document.getElementById("brand-pictures-error");

    [nameError, urlTextError, logoError, picturesError].forEach(error => {
      error.style.display = "none";
      error.textContent = "";
    });

    if (!nameInput.value.trim()) {
      nameError.textContent = "Le nom est requis";
      nameError.style.display = "block";
      isValid = false;
    }

    if (!urlTextInput.value.trim()) {
      urlTextError.textContent = "L'URL texte est requise";
      urlTextError.style.display = "block";
      isValid = false;
    } else if (!/^[a-z0-9-]+$/i.test(urlTextInput.value.trim())) {
      urlTextError.textContent = "L'URL texte doit contenir uniquement des lettres, chiffres ou tirets";
      urlTextError.style.display = "block";
      isValid = false;
    }

    if (logoInput.files.length > 1) {
      logoError.textContent = "Un seul logo est autorisé";
      logoError.style.display = "block";
      isValid = false;
    } else if (logoInput.files.length === 1) {
      const file = logoInput.files[0];
      const validTypes = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"];
      if (!validTypes.includes(file.type)) {
        logoError.textContent = "Le logo doit être au format PNG, JPG, JPEG, SVG ou WebP";
        logoError.style.display = "block";
        isValid = false;
      }
    }

    if (picturesInput.files.length > 10) {
      picturesError.textContent = "Maximum 10 images autorisées";
      picturesError.style.display = "block";
      isValid = false;
    } else if (picturesInput.files.length > 0) {
      const validTypes = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"];
      for (let i = 0; i < picturesInput.files.length; i++) {
        if (!validTypes.includes(picturesInput.files[i].type)) {
          picturesError.textContent = "Les images doivent être au format PNG, JPG, JPEG, SVG ou WebP";
          picturesError.style.display = "block";
          isValid = false;
          break;
        }
      }
    }

    return isValid;
  }

  // Gère la soumission du formulaire pour ajouter ou modifier une marque
  async handleSubmit(e, brand) {
    e.preventDefault();
    if (!this.validateForm()) {
      return;
    }

    try {
      const submitButton = document.getElementById("brand-submit");
      submitButton.disabled = true;
      submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enregistrement...';

      const formData = new FormData();
      formData.append("name", document.getElementById("brand-name").value.trim());
      formData.append("url_text", document.getElementById("brand-url_text").value.trim().toLowerCase());
      formData.append("description", document.getElementById("brand-description").value.trim());
      formData.append("show_on_navbar", document.getElementById("brand-show_on_navbar").checked);
      formData.append("show_on_home", document.getElementById("brand-show_on_home").checked);
      formData.append("is_active", document.getElementById("brand-is_active").checked);

      const logoInput = document.getElementById("brand-logo");
      if (logoInput.files.length > 0) {
        formData.append("logo", logoInput.files[0]);
      } else if (brand && brand.logo_url) {
        // on conserve le logo par défaut si auccun nouveau logo n'a été fournis
        formData.append("logo_url", brand.logo_url);
      }

      const picturesInput = document.getElementById("brand-pictures");
      if (picturesInput.files.length > 0) {
        for (let i = 0; i < Math.min(picturesInput.files.length, 10); i++) {
          formData.append("pictures", picturesInput.files[i]);
          formData.append("image_types", "general");
          formData.append("alt_texts", `${document.getElementById("brand-name").value.trim()} image ${i + 1}`);
          formData.append("display_orders", i);
        }
      }

      const deleteIdsInput = document.getElementById("delete-picture-ids");
      if (deleteIdsInput) {
        const checkboxes = document.querySelectorAll(".delete-picture-checkbox");
        const checkedIds = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value);
        deleteIdsInput.value = checkedIds.join(',');
        if (checkedIds.length > 0) {
          formData.append("delete_picture_ids", deleteIdsInput.value);
        }
      }

      const brandId = brand ? brand.id : null;
      const url = brandId ? `/product/brands/${brandId}` : `/product/brands`;

      let response;
      if (brandId) {
        response = await ApiClient.put(url, formData, true);
      } else {
        response = await ApiClient.post(url, formData, true);
      }

      showMessage(`Marque ${brandId ? "modifiée" : "ajoutée"} avec succès`, "success");
      this.modalManager.hide();
      this.loadData();
    } catch (err) {
      let errorMessage = "Erreur lors de la sauvegarde de la marque";
      if (err.response) {
        const errorData = await err.response.json();
        errorMessage = errorData.error || errorMessage;
      }
      showMessage(errorMessage, "error");
    } finally {
      const submitButton = document.getElementById("brand-submit");
      submitButton.disabled = false;
      submitButton.innerHTML = brand ? "Modifier" : "Ajouter";
    }
  }

  // Charge les données d'une marque pour modification
  async edit(id) {
    try {
      const brand = await ApiClient.get(`/product/brands/${id}`);
      this.showModal(brand);
    } catch (err) {
      showMessage("Erreur lors du chargement de la marque", "error");
    }
  }

  // Affiche une modale pour confirmer la suppression d'une marque
  async delete(id) {
    this.modalManager.show({
      title: "Confirmer la suppression",
      bodyContent: "<p>Êtes-vous sûr de vouloir supprimer cette marque ? Cette action est irréversible.</p>",
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
              await ApiClient.delete(`/product/brands/${id}`, true);
              showMessage("Marque supprimée avec succès", "success");
              this.modalManager.hide();
              this.loadData();
            } catch (err) {
              showMessage("Erreur lors de la suppression de la marque", "error");
            }
          },
        },
      ],
    });
  }
}