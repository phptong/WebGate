const STORAGE_KEY = "WebGate-settings";

export const webStorage = {
  async getAll() {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  },

  async set(data) {
    const current = await this.getAll();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...data }));
  }
};
