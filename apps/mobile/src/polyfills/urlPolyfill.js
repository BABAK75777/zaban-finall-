/**
 * Expo's web Location shim assigns url.username/password, but React Native's
 * built-in URL exposes those as getter-only properties that throw on access.
 */
if (typeof URL !== 'undefined') {
  Object.defineProperty(URL.prototype, 'username', {
    configurable: true,
    enumerable: true,
    get() {
      return this._zabanUsername ?? '';
    },
    set(value) {
      this._zabanUsername = String(value);
    },
  });

  Object.defineProperty(URL.prototype, 'password', {
    configurable: true,
    enumerable: true,
    get() {
      return this._zabanPassword ?? '';
    },
    set(value) {
      this._zabanPassword = String(value);
    },
  });
}
