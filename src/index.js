(function (root, factory) {
    "use strict"
    if (typeof define === 'function' && define.amd) {
        // AMD
        define(['lodash', 'fingerprintjs2'], factory);
    } else if (typeof module === 'object' && typeof module.exports === 'object') {
        // CommonJS
        module.exports = factory(root, require('lodash'), require('fingerprintjs2'));
    } else {
        // Browser globals (Note: root is window)
        if (typeof root._ === 'undefined') {
            throw Error('ApiClient requires lodash')
        }

        root.ApiClient = factory(root, root._, root.fingerprintjs2);
        root.utils = root.ApiClient
    }
})(typeof window !== 'undefined' ? window : this, function (global, _, fingerprintjs2) {
    "use strict";

    var HTTP_METHODS = {
        get: "GET",
        post: "POST",
        put: "PUT",
        delete: "DELETE"
    };

    function beforeUnload(ev) {
        var _message = "There's a server connection currently active. If you close this window, you will lose the progress made";
        ev.returnValue = _message;

        return _message;
    }

    var fingerPrintCallback = function () {
        fingerprintjs2.getV18(function (device_id) {
            var expiryDate = new Date();
            expiryDate.setFullYear(expiryDate.getFullYear() + 10);
            document.cookie = "__deviceVerificationId=" + device_id + ";expires=" + expiryDate.toUTCString();
        })
    };

    if (global.requestIdleCallback) {
        global.requestIdleCallback(fingerPrintCallback);
    } else {
        global.setTimeout(fingerPrintCallback, 500)
    }

    var ApiClient = function (baseUrl, authToken, publicKey) {
        this.apiUrlBase = baseUrl;
        this.authToken = authToken;
        this.publicKey = publicKey;
        this.serverTimeout = null;
    };

    ApiClient.prototype = {
        appId: null,
        deviceId: null,
        /**
         * @param {number} timeout 
         */
        setServerTimeout(timeout) {
            this.serverTimeout = Number(timeout) !== NaN ? Number(timeout) : null
        },
        /**
         *
         * @param {string} module
         * @param {string} action
         * @param {HTMLFormElement | FormData} formElement
         * @param {Object} options
         * @returns {Promise}
         */
        sendForm: function (module, action, formElement, options) {
            var self = this;

            return new Promise(function (resolve, reject) {
                var method = formElement.method || HTTP_METHODS.post, formData = formElement;
                var type = typeof formData;
                global.onbeforeunload = beforeUnload;

                if (!(formData instanceof FormData)) {
                    formData = new FormData(formElement);
                }

                var contentType = formElement.enctype;
                if (formElement.enctype === "multipart/form-data") {
                    contentType = "multipart/form-data; charset=utf-8; boundary=" + Math.random().toString().substr(2);
                    method = HTTP_METHODS.post;
                }

                var url = self.buildUrl(module, action);
                if (method.toUpperCase() === HTTP_METHODS.get) {
                    var queryParts = [];
                    for (var pair in formData.entries()) {
                        queryParts.push(encodeURIComponent(pair[0]) + "=" + encodeURIComponent(pair[1]));
                    }
                    url = url + "?" + queryParts.join("&");
                }

                var xhr = new XMLHttpRequest();
                xhr.onload = function () {
                    var nonDecode = xhr.responseText;
                    global.onbeforeunload = null;
                    var response = JSON.parse(nonDecode);
                    if (this.status >= 200 && this.status < 300) {
                        resolve(response);
                    } else {
                        reject(response);
                    }
                };
                xhr.onerror = function () {
                    try {
                        var response = JSON.parse(xhr.statusText);
                    } catch (error) {
                        response = {
                            success: false,
                            message: xhr.statusText,
                            data: null
                        };
                    }
                    reject(response);
                };

                xhr.open(method.toUpperCase(), url);

                if (self.authToken != null) {
                    xhr.setRequestHeader("Authorization", `Bearer ${self.authToken}`);
                }
                xhr.setRequestHeader("Accept", "application/json");
                xhr.setRequestHeader("Oaks-Request-Source", "xmlhttprequest");
                xhr.setRequestHeader("Oaks-Origin-Host", location.protocol + "//" + location.host);
                xhr.setRequestHeader("Oaks-Origin-Url", location.href);
                xhr.withCredentials = true;

                if (method.toLowerCase() === HTTP_METHODS.get.toLowerCase()) {
                    xhr.send();
                } else {
                    xhr.send(formData);
                }
            });
        },
        /**
         *
         * @param {string} module
         * @param {string} action
         * @param {object} options
         * @param options.data
         */
        send(module, action, options) {
            var self = this, url = this.buildUrl(module, action);

            global.onbeforeunload = beforeUnload;
            var opts = _.defaultsDeep(options, {
                method: "post",
                data: null
            });

            return new Promise((resolve, reject) => {
                var xhr = new XMLHttpRequest();
                var data = opts.data;

                xhr.onload = () => {
                    var nonDecode = xhr.responseText;
                    global.onbeforeunload = null;
                    // var resp = self.decrypt(nonDecode);
                    try {
                        var response = JSON.parse(nonDecode);
                        if (xhr.status >= 200 && xhr.status < 300) {
                            resolve(response);
                        } else {
                            response.statusCode = xhr.statusCode
                            reject(response);
                        }
                    } catch (e) {
                        reject({
                            success: false,
                            message: e,
                            statusCode: xhr.statusCode
                        });
                    }
                };
                xhr.onerror = () => {
                    try {
                        var response = JSON.parse(xhr.statusText);
                    } catch (error) {
                        console.error(error);
                        response = {
                            success: false,
                            message: xhr.statusText,
                            data: null
                        };
                    }
                    response.statusCode = xhr.statusCode

                    reject(response);
                };

                if (this.serverTimeout > 0) {
                    xhr.ontimeout = () => {
                        reject({
                            success: false,
                            message: `The server did not respond on time. You might need to try again later.`
                        })
                    }
                }

                if (opts.method.toLowerCase() === HTTP_METHODS.get.toLowerCase()) {
                    var query = [];
                    for (var key in data) {
                        if (data.hasOwnProperty(key)) {
                            query.push(encodeURIComponent(key) + "=" + encodeURIComponent(data[key]));
                        }
                    }

                    if (query.length > 0) {
                        url = url + "?" + query.join("&");
                    }
                }

                xhr.open(opts.method.toUpperCase(), url);

                if (this.authToken != null) {
                    xhr.setRequestHeader("Authorization", `Bearer ${self.authToken}`);
                }
                xhr.setRequestHeader("Accept", "application/json");
                xhr.setRequestHeader("Oaks-Request-Source", "xmlhttprequest");
                xhr.setRequestHeader("Oaks-Origin-Host", location.protocol + "//" + location.host);
                xhr.setRequestHeader("Oaks-Origin-Url", location.href);
                xhr.withCredentials = true;

                try {
                    if (opts.method.toLowerCase() === "get") {
                        xhr.send();
                    } else {
                        xhr.setRequestHeader("Content-Type", "application/json");
                        xhr.send(JSON.stringify(data));
                    }
                } catch (e) {
                    reject({
                        success: false,
                        message: "Unable to connect to the server."
                    })
                }
            });
        },
        buildUrl(module, action) {
            return this.apiUrlBase + "/" + module + "/" + action;
        },
        isFunction(callable) {
            return typeof callable === "function";
        },
        isObject(object) {
            return typeof object === "object";
        }
    };

    return ApiClient;
});
