/** Safe localStorage/sessionStorage wrapper with try/catch. */

const isStorageAvailable = (type: 'localStorage' | 'sessionStorage'): boolean => {
  try {
    const storage = window[type];
    const test = '__storage_test__';
    storage.setItem(test, test);
    storage.removeItem(test);
    return true;
  } catch {
    return false;
  }
};

export const storage = {
  get(key: string): string | null {
    // "Ghi nhớ đăng nhập" tắt thì dữ liệu nằm ở sessionStorage, nên phải đọc cả hai nơi.
    try {
      if (isStorageAvailable('localStorage')) {
        const v = localStorage.getItem(key);
        if (v !== null) return v;
      }
      if (isStorageAvailable('sessionStorage')) {
        return sessionStorage.getItem(key);
      }
      return null;
    } catch {
      return null;
    }
  },

  set(key: string, value: string, remember: boolean): void {
    try {
      if (remember && isStorageAvailable('localStorage')) {
        localStorage.setItem(key, value);
      } else if (isStorageAvailable('sessionStorage')) {
        sessionStorage.setItem(key, value);
      }
    } catch {
      // Storage not available (private mode, quota exceeded, etc.)
    }
  },

  remove(key: string): void {
    try {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    } catch {
      // Ignore
    }
  },
};