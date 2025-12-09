import { ApiClient } from "../../../utils/api.js";

export class SizeTypeModule {
  constructor(modalManager, autoInitDataGrid = true) {
    this.modalManager = modalManager;
    this.dataGrid = null;
    this.autoInitDataGrid = autoInitDataGrid;
    this.currentSizeType = null;

    if (autoInitDataGrid) {
      this.initDataGrid();
    }
  }

  // Initialise la grille de données pour afficher les types de taille
  initDataGrid() {
    if (this.dataGrid) return;

    try {
      this.dataGrid = new DataGrid("sizetypes-datagrid", {
        columns: [
          { title: "Nom", field: "name" },
          { title: "Tailles", field: "sizes", formatter: (value) => value.map(size => size.name).join(", ") },
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
      this.initFallbackDataGrid("sizetypes-datagrid");
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

  // Charge les données des types de taille depuis l'API et les affiche dans la grille
  async loadData() {
    if (!this.dataGrid) {
      this.initDataGrid();
    }

    try {
      const sizeTypes = await ApiClient.get("/product/size-types");
      if (this.dataGrid && typeof this.dataGrid.setData === "function") {
        this.dataGrid.setData(sizeTypes);
      }
    } catch (err) {
      showMessage("Erreur lors du chargement des types de taille", "error");
    }
  }

  // Affiche une modale pour ajouter ou modifier un type de taille
  async showModal(sizeType = null) {
    this.currentSizeType = sizeType;

    const formContent = `
      <form id="size-type-form">
        <input type="hidden" id="size-type-id" />
        <div class="form-row">
          <div class="form-group">
            <label for="size-type-name">Nom *</label>
            <input type="text" id="size-type-name" required />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="size-type-sizes">Tailles (exemple : XS; S; M;)</label>
            <textarea id="size-type-sizes" rows="3"></textarea>
          </div>
        </div>
      </form>
    `;

    this.modalManager.show({
      title: sizeType ? "Modifier le type de taille" : "Ajouter un type de taille",
      bodyContent: formContent,
      buttons: [
        {
          id: "size-type-cancel",
          label: "Annuler",
          class: "btn-secondary",
          onClick: (e) => {
            e.preventDefault();
            this.modalManager.hide();
          },
        },
        {
          id: "size-type-submit",
          label: sizeType ? "Modifier" : "Ajouter",
          class: "btn-primary",
          onClick: (e) => this.handleSubmit(e, sizeType),
        },
      ],
    });

    if (sizeType) {
      this.populateForm(sizeType);
    }
  }

  // Remplit le formulaire avec les données d'un type de taille existant
  async populateForm(sizeType) {
    document.getElementById("size-type-id").value = sizeType.id || "";
    document.getElementById("size-type-name").value = sizeType.name || "";
    document.getElementById("size-type-sizes").value = sizeType.sizes ? sizeType.sizes.map(size => size.name).join(", ") : "";

    this.modalManager.rebindFormEvents("size-type-form", (e) => this.handleSubmit(e, sizeType));
  }

  // Gère la soumission du formulaire pour ajouter ou modifier un type de taille
  async handleSubmit(e, sizeType) {
    e.preventDefault();
    try {
      const Data = {
        name: document.getElementById("size-type-name").value,
        sizes: document.getElementById("size-type-sizes").value,
      };

      const sizeTypeId = sizeType ? sizeType.id : null;
      const url = sizeTypeId ? `/product/size-types/${sizeTypeId}` : `/product/size-types`;

      if (sizeTypeId) {
        await ApiClient.put(url, Data, true);
      } else {
        await ApiClient.post(url, Data, true);
      }

      showMessage(`Type de taille ${sizeTypeId ? "modifié" : "ajouté"} avec succès`, "success");
      this.modalManager.hide();
      this.loadData();
    } catch (err) {
      showMessage("Erreur lors de la sauvegarde du type de taille", "error");
    }
  }

  // Charge les données d'un type de taille pour modification
  async edit(id) {
    try {
      const sizeType = await ApiClient.get(`/product/size-types/${id}`);
      this.showModal(sizeType);
    } catch (err) {
      showMessage("Erreur lors du chargement du type de taille", "error");
    }
  }

  // Affiche une modale pour confirmer la suppression d'un type de taille
  async delete(id) {
    this.modalManager.show({
      title: "Confirmer la suppression",
      bodyContent: "<p>Êtes-vous sûr de vouloir supprimer ce type de taille ? Cette action est irréversible.</p>",
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
              await ApiClient.delete(`/product/size-types/${id}`, true);
              showMessage("Type de taille supprimé avec succès", "success");
              this.modalManager.hide();
              this.loadData();
            } catch (err) {
              showMessage("Erreur lors de la suppression du type de taille", "error");
            }
          },
        },
      ],
    });
  }
}