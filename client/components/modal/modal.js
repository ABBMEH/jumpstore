export class Modal {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      throw new Error(`Modal container with id "${containerId}" not found`);
    }

    // Options par défaut pour le contenu et comportement du modal
    this.options = {
      title: "",
      bodyContent: "",
      buttons: [],
      onClose: null,
      onShow: null,
      closeOnOutsideClick: true,
      titleSelector: "#modal-title",
      bodySelector: "#modal-body",
      footerSelector: "#modal-footer",
      closeButtonSelector: ".modal-close",
      ...options,
    };

    // Initialisation du modal
    this.init();
  }

  init() {
    // Rendu initial du contenu
    this.render();
    // Liaison des événements de base
    this.bindEvents();
    // Liaison des boutons
    this.bindButtonEvents();
  }

  render() {
    const titleElement = this.container.querySelector(this.options.titleSelector);
    const bodyElement = this.container.querySelector(this.options.bodySelector);
    const footerElement = this.container.querySelector(this.options.footerSelector);

    // Vérification des éléments DOM essentiels
    if (!titleElement || !bodyElement || !footerElement) {
      throw new Error(`Modal elements (${this.options.titleSelector}, ${this.options.bodySelector}, ${this.options.footerSelector}) not found. Ensure modal structure is correct.`);
    }

    titleElement.textContent = this.options.title;
    bodyElement.innerHTML = this.options.bodyContent;

    // Reconstruction des boutons
    footerElement.innerHTML = "";
    this.options.buttons.forEach((btn) => {
      const button = document.createElement("button");
      button.className = btn.class || "btn-primary";
      button.id = btn.id || "";
      button.textContent = btn.label;
      if (btn.onClick) {
        button.addEventListener("click", btn.onClick);
      }
      footerElement.appendChild(button);
    });
  }

  // Liaison des événements de fermeture
  bindEvents() {
    // Supprimer tout écouteur d'événements précédent sur le conteneur
    const newContainer = this.container.cloneNode(true);
    this.container.parentNode.replaceChild(newContainer, this.container);
    this.container = newContainer;

    // Gestion du bouton de fermeture
    const closeButton = this.container.querySelector(this.options.closeButtonSelector);
    if (closeButton) {
      closeButton.addEventListener("click", () => {
        this.hide();
        if (this.options.onClose) {
          this.options.onClose();
        }
      });
    }

    // Gestion du clic extérieur
    this.container.addEventListener("click", (e) => {
      if (this.options.closeOnOutsideClick && e.target === this.container) {
        this.hide();
        if (this.options.onClose) {
          this.options.onClose();
        }
      }
    });
  }

  // Liaison des événements sur les boutons
  bindButtonEvents() {
    this.options.buttons.forEach((btn) => {
      const buttonElement = this.container.querySelector(`#${btn.id}`);
      if (buttonElement && btn.onClick) {
        // Clone pour reset event listeners
        const newButton = buttonElement.cloneNode(true);
        buttonElement.parentNode.replaceChild(newButton, buttonElement);
        newButton.addEventListener("click", btn.onClick);
      }
    });
  }

  // Re-liaison d'événements pour un form (optionnel)
  rebindFormEvents(formId, submitHandler) {
    try {
      const form = this.container.querySelector(`#${formId}`);
      if (form && submitHandler) {
        const newForm = form.cloneNode(true);
        form.parentNode.replaceChild(newForm, form);
        newForm.addEventListener("submit", submitHandler);
      }
    } catch (error) {
      console.error("Erreur in Modal.rebindFormEvents:", error);
    }
  }

  // Affichage du modal
  show(options = {}) {
    try {
      if (options) {
        this.options = { ...this.options, ...options };
        this.render();
        this.bindButtonEvents();
      }

      this.container.style.display = "flex";
      this.container.classList.add("show");

      // Callback onShow après rendu complet
      if (this.options.onShow && typeof this.options.onShow === "function") {
        setTimeout(() => {
          this.options.onShow();
        }, 100);
      }
    } catch (error) {
      console.error("Erreur in Modal.show:", error);
    }
  }

  // Masquage du modal
  hide() {
    this.container.style.display = "none";
    this.container.classList.remove("show");
  }

  // Vérifie si le modal est visible
  isVisible() {
    return this.container.classList.contains("show");
  }

  // Mise à jour du contenu du modal
  update(options = {}) {
    this.options = { ...this.options, ...options };
    this.render();
    this.bindButtonEvents();
  }
}

if (typeof window !== "undefined") {
  window.Modal = Modal;
}