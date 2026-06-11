// Safe localStorage and sessionStorage wrappers to prevent crashes in private browsing modes or restricted webviews.
export const safeLocalStorage = {
  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn("safeLocalStorage.getItem failed:", e);
      return null;
    }
  },
  setItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn("safeLocalStorage.setItem failed:", e);
    }
  },
  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn("safeLocalStorage.removeItem failed:", e);
    }
  },
  clear(): void {
    try {
      localStorage.clear();
    } catch (e) {
      console.warn("safeLocalStorage.clear failed:", e);
    }
  }
};

export const safeSessionStorage = {
  getItem(key: string): string | null {
    try {
      return sessionStorage.getItem(key);
    } catch (e) {
      console.warn("safeSessionStorage.getItem failed:", e);
      return null;
    }
  },
  setItem(key: string, value: string): void {
    try {
      sessionStorage.setItem(key, value);
    } catch (e) {
      console.warn("safeSessionStorage.setItem failed:", e);
    }
  },
  removeItem(key: string): void {
    try {
      sessionStorage.removeItem(key);
    } catch (e) {
      console.warn("safeSessionStorage.removeItem failed:", e);
    }
  }
};
