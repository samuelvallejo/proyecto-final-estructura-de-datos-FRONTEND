import { LinkedList } from './LinkedList.ts';

export type Comparator<T> = (left: T, right: T) => number;

/** Stable merge sort over linked lists: O(n log n), never mutates the input. */
export class Sorter {
  static mergeSort<T>(values: Iterable<T>, compare: Comparator<T>): LinkedList<T> {
    const list = LinkedList.from(values);
    if (list.size < 2) return list;
    const left = new LinkedList<T>();
    const right = new LinkedList<T>();
    const half = Math.floor(list.size / 2);
    for (const value of list) (left.size < half ? left : right).append(value);
    return Sorter.merge(Sorter.mergeSort(left, compare), Sorter.mergeSort(right, compare), compare);
  }

  /** Merges two sorted lists; ties keep the left value first, which makes the sort stable. */
  private static merge<T>(left: LinkedList<T>, right: LinkedList<T>, compare: Comparator<T>): LinkedList<T> {
    const result = new LinkedList<T>();
    while (!left.isEmpty() && !right.isEmpty()) {
      result.append(compare(right.first() as T, left.first() as T) < 0 ? right.shift() as T : left.shift() as T);
    }
    for (const rest of [left, right]) while (!rest.isEmpty()) result.append(rest.shift() as T);
    return result;
  }

  /** Smallest value by the comparator in one pass, or undefined for an empty input. */
  static min<T>(values: Iterable<T>, compare: Comparator<T>): T | undefined {
    let best: T | undefined;
    let found = false;
    for (const value of values) {
      if (!found || compare(value, best as T) < 0) { best = value; found = true; }
    }
    return best;
  }
}
