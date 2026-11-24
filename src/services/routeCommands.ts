import type { Command } from '../patterns/CommandHistory.ts';
import type { RouteItem, RouteList } from '../data-structures/RouteList.ts';

/**
 * Commands of the day plan. Each one remembers what it needs to revert itself
 * (the stop and its previous neighbour), like a small memento, so a mistaken
 * tap can be undone in O(1).
 */
export class VisitStopCommand<T> implements Command<RouteList<T>> {
  readonly label: string;
  private readonly id: string;
  private item: RouteItem<T> | null = null;
  private previousId: string | null = null;
  constructor(id: string, label: string) { this.id = id; this.label = label; }

  execute(route: RouteList<T>): boolean {
    this.item = route.itemOf(this.id);
    this.previousId = route.previousIdOf(this.id);
    return this.item !== null && route.complete(this.id);
  }

  undo(route: RouteList<T>): void {
    if (this.item) route.restore(this.item, this.previousId);
  }
}

export class PostponeStopCommand<T> implements Command<RouteList<T>> {
  readonly label: string;
  private readonly id: string;
  private previousId: string | null = null;
  constructor(id: string, label: string) { this.id = id; this.label = label; }

  execute(route: RouteList<T>): boolean {
    this.previousId = route.previousIdOf(this.id);
    return route.postpone(this.id);
  }

  undo(route: RouteList<T>): void {
    route.moveAfter(this.id, this.previousId);
  }
}
