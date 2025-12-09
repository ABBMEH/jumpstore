import { ApiClient } from "../../utils/api.js";

class DataGrid {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      throw new Error(`Container with id "${containerId}" not found`);
    }

    this.options = {
      columns: [],
      data: [],
      apiUrl: "",
      rowsPerPage: 10,
      sortField: null,
      sortDirection: "asc",
      selectable: false,
      rowActions: [],
      onAddClick: null,
      enableAddButton: true,
      useCookies: false,
      ...options,
    };

    this.currentPage = 1;
    this.filteredData = [];
    this.selectedRows = new Set();
    this.searchQuery = "";

    this.init();
  }

  // Initialise le composant DataGrid en appelant les méthodes de rendu, d'événements et de chargement des données
  init() {
    this.renderStructure();
    this.bindEvents();
    this.loadData();
  }

  // Affiche la structure HTML du DataGrid, y compris l'en-tête, le tableau et la pagination
  renderStructure() {
    this.container.innerHTML = `
      <div class="datagrid-header">
        <span id="item-count">0 éléments</span>
        <div class="header-controls">
          <div class="search-container">
            <input type="text" id="search-input" placeholder="Rechercher...">
            <button id="search-btn"><i class="fas fa-search"></i></button>
          </div>
          ${
            this.options.enableAddButton
              ? `
            <button id="add-item-btn" class="btn-primary"><i class="fas fa-plus"></i> Ajouter</button>
          `
              : ""
          }
        </div>
      </div>

      <div class="datagrid">
        <table id="datagrid-table">
          <thead>
            <tr>
              ${this.options.columns
                .map(
                  (col) =>
                    `<th data-sort="${col.field}" class="${this.options.sortField === col.field ? this.options.sortDirection : ""}">
                  ${col.title}
                </th>`
                )
                .join("")}
              ${this.options.rowActions.length > 0 ? "<th>Actions</th>" : ""}
            </tr>
          </thead>
          <tbody id="datagrid-body">
            <tr>
              <td colspan="${this.options.columns.length + (this.options.rowActions.length > 0 ? 1 : 0)}" class="loading">
                Chargement des données...
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="pagination">
        <button id="prev-page" disabled><i class="fas fa-chevron-left"></i></button>
        <span id="page-info">Page 1 sur 1</span>
        <button id="next-page" disabled><i class="fas fa-chevron-right"></i></button>
        <div class="pagination-controls">
          <select id="rows-per-page">
            <option value="10">10 lignes</option>
            <option value="25">25 lignes</option>
            <option value="50">50 lignes</option>
            <option value="100">100 lignes</option>
          </select>
        </div>
      </div>
    `;

    const rowsPerPageSelect = this.container.querySelector("#rows-per-page");
    if (rowsPerPageSelect) {
      rowsPerPageSelect.value = this.options.rowsPerPage;
    }
  }

  // Lie les événements aux éléments interactifs du DataGrid (tri, pagination, recherche, actions)
  bindEvents() {
    this.container.querySelectorAll("th[data-sort]").forEach((th) => {
      th.addEventListener("click", () => this.sortData(th.dataset.sort));
    });

    this.container.querySelector("#prev-page")?.addEventListener("click", () => this.previousPage());
    this.container.querySelector("#next-page")?.addEventListener("click", () => this.nextPage());

    this.container.querySelector("#rows-per-page")?.addEventListener("change", (e) => {
      this.options.rowsPerPage = parseInt(e.target.value);
      this.currentPage = 1;
      this.renderData();
    });

    this.container.querySelector("#search-btn")?.addEventListener("click", () => {
      const searchInput = this.container.querySelector("#search-input");
      if (searchInput) {
        this.searchQuery = searchInput.value.toLowerCase();
        this.currentPage = 1;
        this.applyFilters();
        this.renderData();
      }
    });

    if (this.options.enableAddButton && this.options.onAddClick && typeof this.options.onAddClick === "function") {
      this.container.querySelector("#add-item-btn")?.addEventListener("click", () => {
        this.options.onAddClick();
      });
    }

    if (this.options.selectable) {
      this.container.addEventListener("click", (e) => {
        const row = e.target.closest("tr[data-id]");
        if (row) {
          this.toggleRowSelection(row.dataset.id);
        }
      });
    }

    this.container.addEventListener("click", (e) => {
      const button = e.target.closest("button.btn-edit, button.btn-delete");
      if (button) {
        const id = button.dataset.id;
        if (button.classList.contains("btn-edit") && this.options.rowActions.find((a) => a.type === "edit")?.onClick) {
          this.options.rowActions.find((a) => a.type === "edit").onClick(id);
        } else if (button.classList.contains("btn-delete") && this.options.rowActions.find((a) => a.type === "delete")?.onClick) {
          this.options.rowActions.find((a) => a.type === "delete").onClick(id);
        }
      }
    });
  }

  // Charge les données à partir de l'API si spécifiée, applique les filtres et rend les données
  async loadData() {
    try {
      if (this.options.apiUrl) {
        this.options.data = await ApiClient.get(this.options.apiUrl, this.options.useCookies);
      }
      this.applyFilters();
      this.renderData();
    } catch (error) {
      this.showError(error.message);
    }
  }

  // Applique les filtres de recherche et de tri aux données
  applyFilters() {
    this.filteredData = [...this.options.data];

    if (this.searchQuery) {
      this.filteredData = this.filteredData.filter((item) =>
        this.options.columns.some((col) => {
          const value = this.getNestedValue(item, col.field);
          return value && typeof value === "string" && value.toLowerCase().includes(this.searchQuery);
        })
      );
    }

    if (this.options.sortField) {
      this.filteredData.sort((a, b) => {
        let valueA = this.getNestedValue(a, this.options.sortField);
        let valueB = this.getNestedValue(b, this.options.sortField);

        if (typeof valueA === "string") valueA = valueA.toLowerCase();
        if (typeof valueB === "string") valueB = valueB.toLowerCase();

        if (valueA < valueB) return this.options.sortDirection === "asc" ? -1 : 1;
        if (valueA > valueB) return this.options.sortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }
  }

  // Rend les données paginées dans le tableau et met à jour les informations de pagination
  renderData() {
    const tbody = this.container.querySelector("#datagrid-body");
    const itemCount = this.container.querySelector("#item-count");
    const pageInfo = this.container.querySelector("#page-info");
    const prevBtn = this.container.querySelector("#prev-page");
    const nextBtn = this.container.querySelector("#next-page");

    if (!tbody) return;

    if (itemCount) {
      itemCount.textContent = `${this.filteredData.length} élément${this.filteredData.length !== 1 ? "s" : ""}`;
    }

    const totalPages = Math.ceil(this.filteredData.length / this.options.rowsPerPage);
    if (this.currentPage > totalPages && totalPages > 0) this.currentPage = totalPages;
    if (this.currentPage < 1) this.currentPage = 1;

    const startIndex = (this.currentPage - 1) * this.options.rowsPerPage;
    const paginatedData = this.filteredData.slice(startIndex, startIndex + this.options.rowsPerPage);

    if (paginatedData.length === 0) {
      tbody.innerHTML = `<tr><td colspan="${this.options.columns.length + (this.options.rowActions.length > 0 ? 1 : 0)}" class="no-data">
        Aucune donnée trouvée
      </td></tr>`;
    } else {
      tbody.innerHTML = paginatedData
        .map(
          (item) => `
        <tr data-id="${item.id}" class="${this.selectedRows.has(item.id) ? "selected" : ""}">
          ${this.options.columns
            .map(
              (col) => `
            <td>${this.formatCellValue(this.getNestedValue(item, col.field), col, item)}</td>
          `
            )
            .join("")}
          ${
            this.options.rowActions.length > 0
              ? `
            <td class="actions">
              ${this.options.rowActions
                .map(
                  (action) => `
                <button class="btn-${action.type}" 
                        data-id="${item.id}"
                        title="${action.title}">
                  <i class="${action.icon}"></i>
                </button>
              `
                )
                .join("")}
            </td>
          `
              : ""
          }
        </tr>
      `
        )
        .join("");
    }

    if (pageInfo) {
      pageInfo.textContent = `Page ${this.currentPage} sur ${totalPages || 1}`;
    }
    if (prevBtn) {
      prevBtn.disabled = this.currentPage <= 1;
    }
    if (nextBtn) {
      nextBtn.disabled = this.currentPage >= totalPages;
    }
  }

  // Récupère une valeur imbriquée dans un objet à partir d'un chemin (ex. "user.name")
  getNestedValue(obj, path) {
    if (!path || !obj) return null;
    return path.split(".").reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : null;
    }, obj);
  }

  // Formate la valeur d'une cellule selon les règles de la colonne (ex. formatage des nombres, booléens)
  formatCellValue(value, column, item) {
    if (value === null || value === undefined || value === "") {
      return "";
    }

    if (column.formatter) {
      return column.formatter(value, item);
    }

    if (typeof value === "boolean") {
      return value ? "Oui" : "Non";
    }

    if (typeof value === "number" && column.field === "price") {
      return `€${value.toFixed(2)}`;
    }

    return value;
  }

  // Trie les données en fonction du champ spécifié et met à jour la direction du tri
  sortData(field) {
    if (this.options.sortField === field) {
      this.options.sortDirection = this.options.sortDirection === "asc" ? "desc" : "asc";
    } else {
      this.options.sortField = field;
      this.options.sortDirection = "asc";
    }

    this.container.querySelectorAll("th[data-sort]").forEach((th) => {
      th.classList.remove("asc", "desc");
      if (th.dataset.sort === field) {
        th.classList.add(this.options.sortDirection);
      }
    });

    this.applyFilters();
    this.renderData();
  }

  // Passe à la page précédente si possible
  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.renderData();
    }
  }

  // Passe à la page suivante si possible
  nextPage() {
    const totalPages = Math.ceil(this.filteredData.length / this.options.rowsPerPage);
    if (this.currentPage < totalPages) {
      this.currentPage++;
      this.renderData();
    }
  }

  // Active ou désactive la sélection d'une ligne en fonction de son identifiant
  toggleRowSelection(id) {
    if (this.selectedRows.has(id)) {
      this.selectedRows.delete(id);
    } else {
      this.selectedRows.add(id);
    }
    this.renderData();
  }

  // Retourne la liste des identifiants des lignes sélectionnées
  getSelectedRows() {
    return Array.from(this.selectedRows);
  }

  // Rafraîchit les données en rechargeant depuis l'API ou en réappliquant les filtres
  refresh() {
    this.loadData();
  }

  // Affiche un message d'erreur dans le tableau
  showError(message) {
    const tbody = this.container.querySelector("#datagrid-body");
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="${this.options.columns.length + (this.options.rowActions.length > 0 ? 1 : 0)}" class="error">
        ${message}
      </td></tr>`;
    }
  }

  // Remplace les données actuelles par de nouvelles données et met à jour l'affichage
  setData(newData) {
    this.options.data = newData;
    this.applyFilters();
    this.renderData();
  }

  // Ajoute une nouvelle ligne aux données et met à jour l'affichage
  addRow(rowData) {
    this.options.data.push(rowData);
    this.applyFilters();
    this.renderData();
  }

  // Met à jour une ligne existante avec de nouvelles données en fonction de son identifiant
  updateRow(id, newData) {
    const index = this.options.data.findIndex((item) => item.id === id);
    if (index !== -1) {
      this.options.data[index] = { ...this.options.data[index], ...newData };
      this.applyFilters();
      this.renderData();
    }
  }

  // Supprime une ligne en fonction de son identifiant et met à jour l'affichage
  deleteRow(id) {
    this.options.data = this.options.data.filter((item) => item.id !== id);
    this.applyFilters();
    this.renderData();
  }
}

if (typeof window !== "undefined") {
  window.DataGrid = DataGrid;
}