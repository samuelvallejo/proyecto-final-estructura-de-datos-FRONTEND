import { Stack } from '../data-structures/Stack.ts';

/**
 * Command pattern: an action is an object that can be executed and undone.
 * The history keeps executed commands in the project's LIFO Stack, so undo
 * always reverts the most recent action first.
 */
export interface Command<T> {
  readonly label: string;
  /** Apply the action; false when it could not run (nothing is recorded). */
  execute(target: T): boolean;
  undo(target: T): void;
}

export class CommandHistory<T> {
  private readonly done = new Stack<Command<T>>();
  private readonly target: T;
  constructor(target: T) { this.target = target; }

  get size(): number { return this.done.size; }
  get canUndo(): boolean { return this.done.size > 0; }

  /** Label of the action that undo would revert. */
  get lastLabel(): string | null { return this.done.peek()?.label ?? null; }

  run(command: Command<T>): boolean {
    if (!command.execute(this.target)) return false;
    this.done.push(command);
    return true;
  }

  undo(): boolean {
    const last = this.done.pop();
    if (!last) return false;
    last.undo(this.target);
    return true;
  }
}
