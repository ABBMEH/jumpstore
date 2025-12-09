import { API_URL } from "../../env.js";
import { ApiClient } from "../../utils/api.js";
import { Modal } from "../../components/modal/modal.js";

document.addEventListener("DOMContentLoaded", () => {
  let usersDataGrid = null;
  let currentUsers = [];
  let modal = null;
  let deleteModal = null;
  let currentUser = null;
  let token = null;
  // Récupère la valeur d'un cookie par son nom
  const getCookie = (name) => {
    const cookies = document.cookie.split(";").map((cookie) => cookie.trim());
    const cookie = cookies.find((c) => c.startsWith(`${name}=`));
    return cookie ? cookie.split("=")[1] : null;
  };
  // Met à jour l'interface utilisateur du navbar avec les infos de l'utilisateur
  const updateUserInterface = (user) => {
    const userNameElement = document.getElementById("user-name");
    const userRoleElement = document.getElementById("user-role");
    const userAvatarElement = document.getElementById("user-avatar-img");
    const homeItem = document.getElementById("home-item");
    const mobileUserAvatarImg = document.getElementById("mobile-user-avatar-img");
    const mobileHomeItem = document.getElementById("mobile-home-item");
    const userSection = document.getElementById("user-section");
    const loginLink = document.getElementById("login-link");
    const mobileUserSection = document.getElementById("mobile-user-section");
    if (user) {
      const fullName = `${user.firstname || ""} ${user.lastname || ""}`.trim() || "Utilisateur";
      if (userNameElement) userNameElement.textContent = fullName;
      if (userRoleElement) userRoleElement.textContent = user.role || "Utilisateur";
      if (userAvatarElement) userAvatarElement.src = user.avatar || "/imgs/default_avatar.webp";
      if (homeItem && user.role === "Administrateur") {
        homeItem.style.display = "table-row";
      }
      if (mobileUserAvatarImg) mobileUserAvatarImg.src = user.avatar || "/imgs/default_avatar.webp";
      if (mobileHomeItem && user.role === "Administrateur") {
        mobileHomeItem.style.display = "table-row";
      }
      if (loginLink) loginLink.style.display = "none";
      if (userSection) userSection.style.display = "flex";
      if (mobileUserSection) mobileUserSection.style.display = "block";
    } else {
      if (loginLink) loginLink.style.display = "list-item";
      if (userSection) userSection.style.display = "none";
      if (mobileUserSection) mobileUserSection.style.display = "none";
    }
  };
  // Affiche un message de succès ou d'erreur
  const showMessage = (message, type = "success") => {
    if (type === "error" && modal && modal.container.classList.contains('show')) {
      const errorContainer = document.getElementById("form-error-message");
      if (errorContainer) {
        errorContainer.textContent = message;
        errorContainer.style.display = "block";
      }
    } else {
      const messageContainer = document.getElementById("success-message");
      if (messageContainer) {
        messageContainer.textContent = message;
        messageContainer.className = type === "success" ? "success-message" : "error-message";
        messageContainer.style.display = "block";
        setTimeout(() => {
          messageContainer.style.display = "none";
          messageContainer.textContent = "";
        }, 7000);
      }
    }
  };
  // Valide le mot de passe selon les règles backend
  const validatePassword = (password) => {
    if (!password) return true;
    const passwordRegex = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[@$!%*?&])[A-Za-z0-9@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return "Le mot de passe doit contenir au moins 8 caractères, une majuscule, un chiffre et un caractère spécial (@$!%*?&)";
    }
    return true;
  };
  // Valide le format de l'email
  const validateEmail = (email) => {
    if (!email) return true;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return "L'email doit être au format valide (ex: nom@domaine.com)";
    }
    return true;
  };
  // Met à jour l'affichage de validation du mot de passe
  const updatePasswordValidation = (passwordField) => {
    const errorElement = document.getElementById("password-error-message");
    const helpText = passwordField.parentElement.querySelector(".password-help");
    if (!passwordField.value) {
      if (errorElement) {
        errorElement.style.display = "none";
        errorElement.textContent = "";
      }
      if (helpText) helpText.style.display = "block";
      passwordField.classList.remove("invalid-input");
      return;
    }
    const isValid = validatePassword(passwordField.value);
    if (typeof isValid === "string") {
      if (errorElement) {
        errorElement.textContent = isValid;
        errorElement.style.display = "block";
      }
      if (helpText) helpText.style.display = "none";
      passwordField.classList.add("invalid-input");
      passwordField.setCustomValidity(isValid);
    } else {
      if (errorElement) {
        errorElement.style.display = "none";
        errorElement.textContent = "";
      }
      if (helpText) helpText.style.display = "block";
      passwordField.classList.remove("invalid-input");
      passwordField.setCustomValidity("");
    }
  };
  // Met à jour l'affichage de validation de l'email
  const updateEmailValidation = (emailField) => {
    const errorElement = document.getElementById("email-error-message");
    if (!emailField.value) {
      if (errorElement) {
        errorElement.style.display = "none";
        errorElement.textContent = "";
      }
      emailField.classList.remove("invalid-input");
      return;
    }
    const isValid = validateEmail(emailField.value);
    if (typeof isValid === "string") {
      if (errorElement) {
        errorElement.textContent = isValid;
        errorElement.style.display = "block";
      }
      emailField.classList.add("invalid-input");
      emailField.setCustomValidity(isValid);
    } else {
      if (errorElement) {
        errorElement.style.display = "none";
        errorElement.textContent = "";
      }
      emailField.classList.remove("invalid-input");
      emailField.setCustomValidity("");
    }
  };
  // Vérifie les données de l'utilisateur connecté
  const fetchUserData = async () => {
    try {
      const data = await ApiClient.get("/auth/check", true);
      if (data.user && data.user.email && data.user.role) {
        if (data.user.role !== "Administrateur") {
          window.location.href = "../login/login.html?reason=not_admin";
          return null;
        }
        currentUser = data.user;
        token = getCookie("token");
        return data.user;
      } else {
        window.location.href = "../login/login.html?reason=invalid_data";
        return null;
      }
    } catch (err) {
      window.location.href = "../login/login.html?reason=auth_error";
      return null;
    }
  };
  // Vérifie si l'utilisateur est administrateur
  const checkAdminAuth = async () => {
    try {
      const user = await fetchUserData();
      if (!user) {
        return false;
      }
      updateUserInterface(user);
      document.body.style.display = "";
      return true;
    } catch (err) {
      return false;
    }
  };
  // Initialise les modals pour ajout/modification et suppression
  const initModals = () => {
    try {
      modal = new Modal("modal-container", {
        titleSelector: "#modal-title",
        bodySelector: "#modal-body",
        footerSelector: "#modal-footer",
        closeButtonSelector: ".modal-close",
      });

      deleteModal = new Modal("delete-modal-container", {
        titleSelector: "#delete-modal-title",
        bodySelector: "#delete-modal-body",
        footerSelector: "#delete-modal-footer",
        closeButtonSelector: ".modal-close",
      });

    } catch (error) {

      showMessage("Erreur lors de l'initialisation des modals", "error");
    }
  };
  // Contenu du formulaire utilisateur avec validation
  const userFormContent = `
    <form id="user-form">
      <input type="hidden" id="user-id" />
      <div class="form-row">
        <div class="form-group">
          <label for="firstname">Prénom</label>
          <input type="text" id="firstname" required />
        </div>
        <div class="form-group">
          <label for="lastname">Nom</label>
          <input type="text" id="lastname" required />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="email">Email</label>
          <input type="email" id="email" required />
          <p id="email-error-message" class="form-error-message" style="display: none; color: #dc3545; font-size: 12px; margin-top: 5px;"></p>
        </div>
        <div class="form-group">
          <label for="role">Rôle</label>
          <select id="role" required>
            <option value="">Sélectionner...</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label for="password">Mot de passe</label>
        <input type="password" id="password" />
        <small class="password-help" style="color: #666; font-size: 12px;">
          Laisser vide pour ne pas modifier le mot de passe. Exigences: 8+ caractères, 1 majuscule, 1 chiffre, 1 caractère spécial (@$!%*?&)
        </small>
        <p id="password-error-message" class="form-error-message" style="display: none; color: #dc3545; font-size: 12px; margin-top: 5px;"></p>
      </div>
      <div class="form-group">
        <label for="newsletter_subscription">
          <input type="checkbox" id="newsletter_subscription" />
          S'abonner à la newsletter
        </label>
      </div>
      <p id="form-error-message" class="form-error-message" style="display: none; color: #dc3545; font-size: 14px; margin-top: 10px; text-align: center;"></p>
    </form>
  `;

  // Récupère les types d'utilisateurs depuis l'API et peuple la combobox
  const populateRoleSelect = async () => {
    try {
      const roleSelect = document.getElementById("role");
      if (!roleSelect) {
        throw new Error("Champ rôle non trouvé dans le formulaire");
      }
      const userTypes = await ApiClient.get("/users/user-types", true);

      roleSelect.innerHTML = '<option value="">Sélectionner...</option>';
      userTypes.forEach((type) => {
        const option = document.createElement("option");
        option.value = type.name;
        option.textContent = type.name;
        roleSelect.appendChild(option);
      });

    } catch (err) {
      showMessage("Erreur lors du chargement des rôles", "error");
      // Fallback avec rôles par défaut
      const roleSelect = document.getElementById("role");
      if (roleSelect) {
        roleSelect.innerHTML = `
          <option value="">Sélectionner...</option>
          <option value="Administrateur">Administrateur</option>
          <option value="Utilisateur">Utilisateur</option>
        `;
      }
    }
  };
  // Contenu de confirmation de suppression
  const deleteConfirmationContent = (user) => `
    <div class="delete-confirmation">
      <p>Êtes-vous sûr de vouloir supprimer l'utilisateur :</p>
      <div class="user-info">
        <strong>${user.firstname} ${user.lastname}</strong><br>
        <em>${user.email}</em><br>
        <span class="role-badge">${user.role}</span><br>
        <span class="email-verified-badge">${user.is_email_verified ? "Email vérifié" : "Email non vérifié"}</span>
      </div>
      <p class="warning-text">Cette action est irréversible.</p>
    </div>
  `;
  // Initialise la grille de données des utilisateurs
  const initDataGrids = async () => {
    try {
      const container = document.getElementById("users-datagrid");
      if (!container) {
        throw new Error("Container #users-datagrid non trouvé dans le DOM");
      }
      usersDataGrid = new DataGrid("users-datagrid", {
        columns: [
          { title: "Prénom", field: "firstname" },
          { title: "Nom", field: "lastname" },
          { title: "Email", field: "email" },
          { title: "Rôle", field: "role" },
          { title: "Newsletter", field: "newsletter_subscription", formatter: (value) => value ? "Oui" : "Non" },
          { title: "Email vérifié", field: "is_email_verified", formatter: (value) => value ? "Oui" : "Non" },
        ],
        rowActions: [
          {
            type: "edit",
            icon: "fas fa-edit",
            title: "Modifier",
            onClick: editUser,
          },
          {
            type: "delete",
            icon: "fas fa-trash",
            title: "Supprimer",
            onClick: showDeleteConfirmation,
          },
        ],
        apiUrl: `/users`,
        rowsPerPage: 10,
        sortField: "lastname",
        sortDirection: "asc",
        useCookies: true,
        onAddClick: () => {
          try {
            modal.show({
              title: "Ajouter un utilisateur",
              bodyContent: userFormContent,
              buttons: [
                { id: "user-cancel", label: "Annuler", class: "btn-secondary", onClick: () => modal.hide() },
                { id: "user-submit", label: "Ajouter Utilisateur", class: "btn-primary", onClick: handleUserSubmit },
              ],
            });
            setTimeout(async () => {
              const form = document.getElementById("user-form");
              if (form) {
                form.reset();
                document.getElementById("user-id").value = "";
                const emailField = document.getElementById("email");
                const passwordField = document.getElementById("password");
                if (emailField) {
                  emailField.setAttribute("required", "true");
                  emailField.addEventListener("input", () => updateEmailValidation(emailField));
                }
                if (passwordField) {
                  passwordField.setAttribute("required", "true");
                  passwordField.addEventListener("input", () => updatePasswordValidation(passwordField));
                }
                await populateRoleSelect();
                modal.rebindFormEvents("user-form", handleUserSubmit);
                const errorElements = ["form-error-message", "email-error-message", "password-error-message"];
                errorElements.forEach(id => {
                  const errorElement = document.getElementById(id);
                  if (errorElement) {
                    errorElement.style.display = "none";
                    errorElement.textContent = "";
                  }
                });
              }
            }, 100);
          } catch (error) {
            showMessage("Erreur lors de l'ouverture du formulaire d'ajout", "error");
          }
        },
      });
    } catch (error) {
      const container = document.getElementById("users-datagrid");
      if (container) {
        container.innerHTML = `
          <div style="padding: 20px; text-align: center; color: #666;">
            <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 16px;"></i>
            <p>Erreur lors du chargement de la grille de données</p>
            <p style="font-size: 14px; color: #999;">${error.message}</p>
            <button class="btn-primary" onclick="location.reload()">Recharger la page</button>
          </div>
        `;
      }
    }
  };
  // Ouvre le formulaire de modification d'un utilisateur
  const editUser = async (id) => {
    try {
      if (!usersDataGrid || !usersDataGrid.options || !usersDataGrid.options.data) {
        throw new Error("DataGrid non initialisée ou données non disponibles");
      }
      const user = usersDataGrid.options.data.find((u) => u.id == id);
      if (!user) {
        throw new Error("Utilisateur non trouvé dans les données");
      }
      modal.show({
        title: "Modifier un utilisateur",
        bodyContent: userFormContent,
        buttons: [
          { id: "user-cancel", label: "Annuler", class: "btn-secondary", onClick: () => modal.hide() },
          { id: "user-submit", label: "Modifier Utilisateur", class: "btn-primary", onClick: handleUserSubmit },
        ],
      });
      try {
        await populateRoleSelect();
       
        const userIdField = document.getElementById("user-id");
        const firstnameField = document.getElementById("firstname");
        const lastnameField = document.getElementById("lastname");
        const emailField = document.getElementById("email");
        const roleField = document.getElementById("role");
        const passwordField = document.getElementById("password");
        const newsletterField = document.getElementById("newsletter_subscription");
       
        if (!userIdField || !firstnameField || !lastnameField || !emailField || !roleField || !passwordField || !newsletterField) {
          throw new Error("Champs du formulaire non trouvés");
        }
        userIdField.value = user.id;
        firstnameField.value = user.firstname || "";
        lastnameField.value = user.lastname || "";
        emailField.value = user.email || "";
        roleField.value = user.role;
        newsletterField.checked = user.newsletter_subscription;
      } catch (error) {
        showMessage("Erreur lors du remplissage du formulaire", "error");
      }
    } catch (error) {
      showMessage("Erreur lors de l'ouverture du formulaire de modification", "error");
    }
  };
  let userToDelete = null;
  // Affiche la confirmation de suppression d'un utilisateur
  const showDeleteConfirmation = (id) => {
    try {
      if (!usersDataGrid || !usersDataGrid.options || !usersDataGrid.options.data) {
        throw new Error("DataGrid non initialisée ou données non disponibles");
      }
      const user = usersDataGrid.options.data.find((u) => u.id == id);
      if (!user) throw new Error("Utilisateur non trouvé");
      userToDelete = user;
      deleteModal.show({
        title: "Confirmer la suppression",
        bodyContent: deleteConfirmationContent(user),
        buttons: [
          { id: "delete-cancel", label: "Annuler", class: "btn-secondary", onClick: () => deleteModal.hide() },
          { id: "delete-confirm", label: "Supprimer", class: "btn-danger", onClick: confirmDeleteUser },
        ],
      });
    } catch (error) {
      showMessage("Erreur lors de l'affichage de la confirmation de suppression", "error");
    }
  };
  // Confirme et exécute la suppression d'un utilisateur
  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      await ApiClient.delete(`/users/${userToDelete.id}`, true);
      showMessage("Utilisateur supprimé avec succès", "success");
      deleteModal.hide();
      if (usersDataGrid && typeof usersDataGrid.refresh === "function") {
        usersDataGrid.refresh();
      } else {
        location.reload();
      }
      userToDelete = null;
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || "Erreur lors de la suppression";
      showMessage(errorMessage, "error");
      deleteModal.hide();
    }
  };
  // Gère la soumission du formulaire utilisateur (ajout ou modification)
  const handleUserSubmit = async (e) => {
    e.preventDefault();
    const errorElements = ["form-error-message", "email-error-message", "password-error-message"];
    errorElements.forEach(id => {
      const errorElement = document.getElementById(id);
      if (errorElement) {
        errorElement.style.display = "none";
        errorElement.textContent = "";
      }
    });
    const id = document.getElementById("user-id").value;
    const emailField = document.getElementById("email");
    const passwordField = document.getElementById("password");
    const newsletterField = document.getElementById("newsletter_subscription");
    const email = emailField.value.trim();
    const password = passwordField.value;
    const newsletter_subscription = newsletterField.checked;
    // Validation côté client de l'email
    const emailValidationResult = validateEmail(email);
    if (typeof emailValidationResult === "string") {
      emailField.classList.add("invalid-input");
      showMessage(emailValidationResult, "error");
      return;
    }
    // Validation côté client du mot de passe
    if (password && !id) {
      const passwordValidationResult = validatePassword(password);
      if (typeof passwordValidationResult === "string") {
        passwordField.classList.add("invalid-input");
        showMessage(passwordValidationResult, "error");
        return;
      }
    } else if (password && id) { // Modification avec nouveau mot de passe
      const passwordValidationResult = validatePassword(password);
      if (typeof passwordValidationResult === "string") {
        passwordField.classList.add("invalid-input");
        showMessage(passwordValidationResult, "error");
        return;
      }
    }
    const user = {
      firstname: document.getElementById("firstname").value.trim(),
      lastname: document.getElementById("lastname").value.trim(),
      email: email,
      role: document.getElementById("role").value,
      newsletter_subscription,
      terms_accepted: true,
    };
    // Vérification des champs obligatoires
    if (!user.firstname || !user.lastname || !user.email || !user.role) {
      showMessage("Tous les champs obligatoires doivent être remplis", "error");
      return;
    }
    // Ajoute le mot de passe si fourni
    if (password) {
      user.password = password;
    }
    let url, method;
    if (id) {
      url = `/users/${id}`;
      method = "put";
    } else {
      if (!password) {
        showMessage("Le mot de passe est requis pour la création d'un utilisateur", "error");
        return;
      }
      url = `/users/admin/create`;
      method = "post";
    }
    try {
      const response = await ApiClient[method](url, user, true);
      if (response && response.error) {
        showMessage(response.error, "error");
      } else {
        showMessage(`Utilisateur ${id ? "modifié" : "ajouté"} avec succès`, "success");
        modal.hide();
        if (usersDataGrid && typeof usersDataGrid.refresh === "function") {
          usersDataGrid.refresh();
        } else {
          location.reload();
        }
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || "Erreur inconnue lors de la requête";
      showMessage(errorMessage, "error");
    }
  };
  // Configure les événements pour les onglets
  const setupTabEvents = () => {
    try {
      const tabButtons = document.querySelectorAll(".tab-btn");
      const tabContents = document.querySelectorAll(".tab-content");
      const adminHeaderTitle = document.querySelector(".admin-header h2");
      tabButtons.forEach((button) => {
        button.addEventListener("click", () => {
          tabButtons.forEach((btn) => btn.classList.remove("active"));
          tabContents.forEach((content) => content.classList.remove("active"));
          button.classList.add("active");
          const tabId = button.dataset.tab;
          const content = document.getElementById(`${tabId}-tab`);
          if (content) {
            content.classList.add("active");
          }
          if (adminHeaderTitle) {
            adminHeaderTitle.textContent = "Gestion des Utilisateurs";
          }
        });
      });
    } catch (error) {
      showMessage("Erreur lors de la configuration des onglets", "error");
    }
  };
  // Initialisation principale du gestionnaire d'utilisateurs
  const init = async () => {
    try {
      if (!(await checkAdminAuth())) return;
      await new Promise((resolve) => setTimeout(resolve, 100));
      initModals();
      setupTabEvents();
      await initDataGrids();
    } catch (error) {
      showMessage("Erreur lors de l'initialisation", "error");
    }
  };
  init();
});