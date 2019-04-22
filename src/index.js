(function (root, factory) {
    "use strict"
    if (typeof define === 'function' && define.amd) {
        // AMD
        define(['lodash'], factory);
    } else if (typeof exports === 'object') {
        // CommonJS
        module.exports = factory(require('lodash'));
    } else {
        // Browser globals (Note: root is window)
        if (typeof root._ === 'undefined') {
            throw Error('ApiClient requires lodash')
        }

        root.returnExports = factory(root._);
    }
})(this, function (_) {
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
        Fingerprint2.getV18(function (device_id) {
            var expiryDate = new Date();
            expiryDate.setFullYear(expiryDate.getFullYear() + 10);
            document.cookie = "__deviceVerificationId=" + device_id + ";expires=" + expiryDate.toUTCString();
        })
    };

    if (global.requestIdleCallback) {
        requestIdleCallback(fingerPrintCallback);
    } else {
        setTimeout(fingerPrintCallback, 500)
    }

    var ApiClient = function (baseUrl, authToken, publicKey) {
        var self = this;
        self.apiUrlBase = baseUrl;
        self.authToken = authToken;
        self.publicKey = publicKey;
    };

    ApiClient.prototype = {
        apiUrlBase: "",
        authToken: null,
        appId: null,
        deviceId: null,
        publicKey: null,
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
                    xhr.setRequestHeader("User-Auth-Token", self.authToken);
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
        send: function (module, action, options) {
            var self = this, url = self.buildUrl(module, action);

            global.onbeforeunload = beforeUnload;
            var opts = _.defaultsDeep({
                method: "post",
                data: null
            }, options);

            return new Promise(function (resolve, reject) {
                var xhr = new XMLHttpRequest();
                var data = opts.data;
                if (self.publicKey != null && opts.data != null) {
                    // data = self.encrypt(opts.data);
                }

                xhr.onload = function () {
                    var nonDecode = xhr.responseText;
                    global.onbeforeunload = null;
                    // var resp = self.decrypt(nonDecode);
                    try {
                        var response = JSON.parse(nonDecode);
                        if (this.status >= 200 && this.status < 300) {
                            resolve(response);
                        } else {
                            reject(response);
                        }
                    } catch (e) {
                        console.log(e);
                        reject({
                            success: false,
                            message: e
                        });
                    }
                };
                xhr.onerror = function () {
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
                    reject(response);
                };

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

                if (self.authToken != null) {
                    xhr.setRequestHeader("User-Auth-Token", self.authToken);
                }
                xhr.setRequestHeader("Accept", "application/json");
                xhr.setRequestHeader("Oaks-Request-Source", "xmlhttprequest");
                xhr.setRequestHeader("Oaks-Origin-Host", location.protocol + "//" + location.host);
                xhr.setRequestHeader("Oaks-Origin-Url", location.href);
                xhr.withCredentials = true;

                if (opts.method.toLowerCase() === "get") {
                    xhr.send();
                } else {
                    xhr.setRequestHeader("Content-Type", "application/json");
                    xhr.send(JSON.stringify(data));
                }
            });
        },
        buildUrl: function (module, action) {
            var self = this;

            return self.apiUrlBase + "/" + module + "/" + action;
        },
        isFunction: function (callable) {
            return typeof callable === "function";
        },
        isObject: function (object) {
            return typeof object === "object";
        }
    };

    return ApiClient;
});
