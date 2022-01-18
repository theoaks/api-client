import { isObject, isEmpty, trim, trimEnd, trimStart, defaultsDeep, merge } from "lodash";

const HTTP_METHODS = {
  get: "GET",
  post: "POST",
  put: "PUT",
  delete: "DELETE"
};

const authTokenSymbol = Symbol('authTokenSymbol');
export class ApiClient {
  constructor(baseUrl, authToken) {
    this._baseUrl = new URL(trimEnd(baseUrl, '/'));
    this[authTokenSymbol] = authToken;
  }

  set appVersion(value) {
    this["_appVersion"] = value;
  }

  get appVersion() {
    return this["_appVersion"];
  }

  set appId(value) {
    this["_appId"] = value;
  }

  get appId() {
    return this["_appId"];
  }

  set deviceId(value) {
    this["_deviceId"] = value;
  }

  get deviceId() {
    return this["_deviceId"];
  }
  /**
   *
   * @param {string} module
   * @param {string} endpoint
   * @param {Object} query
   */


  buildUrl(module, endpoint, query = undefined) {
    let url = new URL(`${trim(module, '/')}/${trimStart(endpoint, '/')}`, this._baseUrl);

    if (isObject(query) && !isEmpty(query)) {
      let searchParams = new URLSearchParams();

      for (const key in query) {
        searchParams.append(key, query[key]);
      }

      url.search = searchParams.toString();
    }

    return url;
  }

  getHeaders() {
    let headers = new Headers({
      "Content-Type": "application/json",
      "Oaks-Request-Source": "fetch",
      "Oaks-Origin-Host": `${trimEnd(location.protocol, "/")}//${trimStart(location.host, "/")}`,
      "Oaks-Origin-Url": location.href
    });
    let authToken = this[authTokenSymbol];

    if (trim(authToken).length > 0) {
      headers.append("Authorization", `Bearer ${authToken}`);
    }

    if (trim(this.appId).length > 0) {
      headers.append("app-id", this.appId);
    }

    if (trim(this.deviceId).length > 0) {
      headers.append("app-device-id", this.deviceId);
      headers.append('app-device-info', navigator.userAgent);
    }

    if (trim(this.appVersion).length > 0) {
      headers.append("app-version", this.appVersion);
    }

    return headers;
  }
  /**
   *
   * @param {string} module
   * @param {string} endpoint
   * @param {HTMLFormElement | FormData} formElement
   */


  sendForm(module, endpoint, formElement) {
    let method = formElement.method || HTTP_METHODS.post,
        formData = formElement;

    if (!(formData instanceof FormData)) {
      formData = new FormData(formElement);
    }

    let contentType = formElement.enctype;

    if (formElement.enctype === "multipart/form-data") {
      contentType = "multipart/form-data; charset=utf-8; boundary=" + Math.random().toString().substr(2);
      method = HTTP_METHODS.post;
    }

    let url = this.buildUrl(module, endpoint);
    let request = new Request();
  }
  /**
   *
   * @param {string} module
   * @param {string} endpoint
   * @param {Object} options
   * @param {'GET'|'get'|'POST'|'post'|'PUT'|'put'|'DELETE'|'delete'} options.method
   * @param {Object|null} options.data
   * @param {Object|null} options.query
   */


  send(module, endpoint, options) {
    options = defaultsDeep(options, {
      method: HTTP_METHODS.post,
      data: null,
      query: {}
    });
    let query = options.method.toLocaleLowerCase() === HTTP_METHODS.get.toLowerCase() ? merge(options.data || {}, options.query || {}) : options.query;
    let body = options.method.toLocaleLowerCase() === HTTP_METHODS.get.toLowerCase() ? null : options.data;
    let url = this.buildUrl(module, endpoint, query);
    let requestOptions = {
      method: options.method,
      headers: this.getHeaders()
    };

    if (options.method.toLocaleLowerCase() !== HTTP_METHODS.get.toLowerCase()) {
      requestOptions.body = JSON.stringify(body);
    }

    let request = new Request(url.toString(), requestOptions);
    return new Promise((resolve, reject) => {
      fetch(request, {
        mode: "cors",
        credentials: "same-origin",
        redirect: "follow"
      }).then(response => {
        response.json().then(data => {
          if (response.ok) {
            resolve(data);
          } else {
            data.statusCode = response.status;
            reject(data);
          }
        }).catch(error => {
          reject({
            success: false,
            message: error.message,
            statusCode: response.status
          });
        });
      }).catch(error => {
        reject({
          success: false,
          message: "Something went wrong due to a network connection issues. Please check your connection."
        });
      });
    });
  }

}