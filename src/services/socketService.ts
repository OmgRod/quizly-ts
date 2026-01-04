
type SocketCallback = (data: any) => void;

class SocketService {
  private channel: BroadcastChannel | null = null;
  private listeners: Record<string, SocketCallback[]> = {};

  constructor() {
    try {
      // BroadcastChannel can throw SecurityError in certain restricted environments
      this.channel = new BroadcastChannel('quizly_network');
      this.channel.onmessage = (event) => {
        const { type, data } = event.data;
        if (this.listeners[type]) {
          this.listeners[type].forEach(callback => callback(data));
        }
      };
    } catch (e) {
      console.warn("Multiplayer cross-tab sync disabled: BroadcastChannel is not supported or allowed in this context.", e);
    }
  }

  on(type: string, callback: SocketCallback) {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(callback);
  }

  off(type: string, callback: SocketCallback) {
    if (!this.listeners[type]) return;
    this.listeners[type] = this.listeners[type].filter(cb => cb !== callback);
  }

  emit(type: string, data: any) {
    // Local trigger for the same tab (always works as a fallback)
    if (this.listeners[type]) {
      this.listeners[type].forEach(callback => callback(data));
    }
    // Remote trigger for other tabs (only if channel is active)
    if (this.channel) {
      try {
        this.channel.postMessage({ type, data });
      } catch (e) {
        // Silently fail if postMessage becomes restricted mid-session
      }
    }
  }
}

export const socket = new SocketService();
