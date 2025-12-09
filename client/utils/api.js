import { API_URL } from "../env.js";
// Classe pour gérer les requêtes API
export class ApiClient {
  // Effectuer une requête GET
  static async get(url, includeCredentials = false) {
    try {
      const fetchOptions = {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Cache-Control": "no-cache",
        },
      };
      if (includeCredentials) {
        fetchOptions.credentials = "include";
      }
      const response = await fetch(`${API_URL}${url}`, fetchOptions);
      if (!response.ok) {
        let errorData = await response.json();
        if (errorData.error === "Accès non autorisé: Token manquant") {
          window.location.href = "/pages/login/login.html";
          return errorData;
        }
        return errorData;
      }
      return await response.json();
    } catch (error) {
      console.error(`Erreur GET pour ${url} :`, error);
      throw error;
    }
  }
  // Effectuer une requête POST
  static async post(url, data, includeCredentials = false) {
    try {
      const fetchOptions = {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Cache-Control": "no-cache",
        },
        body: data instanceof FormData ? data : JSON.stringify(data),
      };
      if (!(data instanceof FormData)) {
        fetchOptions.headers["Content-Type"] = "application/json";
      }
      if (includeCredentials) {
        fetchOptions.credentials = "include";
      }
      const response = await fetch(`${API_URL}${url}`, fetchOptions);
      if (!response.ok) {
        let errorData = await response.json();
        if (errorData.error === "Accès non autorisé: Token manquant") {
          window.location.href = "/pages/login/login.html";
          return errorData;
        }
        return errorData;
      }
     
      return await response.json();
    } catch (error) {
      console.error(`Erreur POST pour ${url} :`, error);
      throw error;
    }
  }
  // Effectuer une requête PUT
  static async put(url, data, includeCredentials = false) {
    try {
      const fetchOptions = {
        method: "PUT",
        headers: {
          Accept: "application/json",
          "Cache-Control": "no-cache",
        },
        body: data instanceof FormData ? data : JSON.stringify(data),
      };
      if (!(data instanceof FormData)) {
        fetchOptions.headers["Content-Type"] = "application/json";
      }
      if (includeCredentials) {
        fetchOptions.credentials = "include";
      }
      const response = await fetch(`${API_URL}${url}`, fetchOptions);
      if (!response.ok) {
        let errorData = await response.json();
        if (errorData.error === "Accès non autorisé: Token manquant") {
          window.location.href = "/pages/login/login.html";
          return errorData;
        }
        return errorData;
      }
      return await response.json();
    } catch (error) {
      console.error(`Erreur PUT pour ${url} :`, error);
      throw error;
    }
  }
  // Effectuer une requête DELETE
  static async delete(url, includeCredentials = false) {
    try {
      const fetchOptions = {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          "Cache-Control": "no-cache",
        },
      };
      if (includeCredentials) {
        fetchOptions.credentials = "include";
      }
      const response = await fetch(`${API_URL}${url}`, fetchOptions);
      if (!response.ok) {
        let errorData = await response.json();
        if (errorData.error === "Accès non autorisé: Token manquant") {
          window.location.href = "/pages/login/login.html";
          return errorData;
        }
        return errorData;
      }
      return await response.json();
    } catch (error) {
      console.error(`Erreur DELETE pour ${url} :`, error);
      throw error;
    }
  }
}