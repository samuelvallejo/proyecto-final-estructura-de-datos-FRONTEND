/**
 * Observer pattern: subjects keep a list of listeners and notify them after a
 * change. The version number lets React's useSyncExternalStore detect changes
 * in objects that are mutated in place, like the linked route list.
 */
export type Listener = () => void;

export class Observable {
  private readonly listeners = new Set<Listener>();
  private changes = 0;

  /** Increases after every notified change; a cheap, stable snapshot for React. */
  get version(): number { return this.changes; }

  /** Register a listener; the returned function removes it. */
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  get listenerCount(): number { return this.listeners.size; }

  protected notify(): void {
    this.changes++;
    for (const listener of [...this.listeners]) listener();
  }
}
