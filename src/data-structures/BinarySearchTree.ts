/** Binary search tree adapted from the Node/BinaryTree examples of the course notes (Arboles.pdf, Mideros, 2026).
 * Every traversal is iterative and uses the hand-written Stack and Queue instead of arrays. */
import { LinkedList } from './LinkedList.ts';
import { Queue } from './Queue.ts';
import { Sorter } from './Sorter.ts';
import { Stack } from './Stack.ts';
import type { Comparator } from './Sorter.ts';

export type { Comparator };
export type Traversal = 'inorder' | 'descending' | 'preorder' | 'postorder' | 'level';
export class TreeNode<K, V> {
  key: K;
  value: V;
  left: TreeNode<K, V> | null = null;
  right: TreeNode<K, V> | null = null;
  constructor(key: K, value: V) { this.key = key; this.value = value; }
}

export class BinarySearchTree<K, V> {
  root: TreeNode<K, V> | null = null;
  size = 0;
  readonly compare: Comparator<K>;
  constructor(compare: Comparator<K>) { this.compare = compare; }

  insert(key: K, value: V): boolean {
    if (!this.root) { this.root = new TreeNode(key, value); this.size = 1; return true; }
    let current = this.root;
    for (;;) {
      const comparison = this.compare(key, current.key);
      if (comparison === 0) { current.value = value; return false; }
      const side = comparison < 0 ? 'left' : 'right';
      const child = current[side];
      if (!child) { current[side] = new TreeNode(key, value); this.size++; return true; }
      current = child;
    }
  }

  findNode(key: K): TreeNode<K, V> | null {
    let current = this.root;
    while (current) {
      const comparison = this.compare(key, current.key);
      if (comparison === 0) return current;
      current = comparison < 0 ? current.left : current.right;
    }
    return null;
  }

  search(key: K): V | undefined { return this.findNode(key)?.value; }

  contains(key: K): boolean { return this.findNode(key) !== null; }

  *inOrder(): Generator<TreeNode<K, V>> {
    const pending = new Stack<TreeNode<K, V>>();
    let current = this.root;
    while (current || !pending.isEmpty()) {
      while (current) { pending.push(current); current = current.left; }
      current = pending.pop()!;
      yield current;
      current = current.right;
    }
  }

  *reverseOrder(): Generator<TreeNode<K, V>> {
    const pending = new Stack<TreeNode<K, V>>();
    let current = this.root;
    while (current || !pending.isEmpty()) {
      while (current) { pending.push(current); current = current.right; }
      current = pending.pop()!;
      yield current;
      current = current.left;
    }
  }

  *preOrder(): Generator<TreeNode<K, V>> {
    const pending = new Stack<TreeNode<K, V>>();
    if (this.root) pending.push(this.root);
    while (!pending.isEmpty()) {
      const node = pending.pop()!;
      yield node;
      if (node.right) pending.push(node.right);
      if (node.left) pending.push(node.left);
    }
  }

  *postOrder(): Generator<TreeNode<K, V>> {
    const pending = new Stack<[TreeNode<K, V>, boolean]>();
    if (this.root) pending.push([this.root, false]);
    while (!pending.isEmpty()) {
      const [node, visited] = pending.pop()!;
      if (visited) { yield node; continue; }
      pending.push([node, true]);
      if (node.right) pending.push([node.right, false]);
      if (node.left) pending.push([node.left, false]);
    }
  }

  *levelOrder(): Generator<{ node: TreeNode<K, V>; level: number; parent: TreeNode<K, V> | null }> {
    const pending = new Queue<{ node: TreeNode<K, V>; level: number; parent: TreeNode<K, V> | null }>();
    if (this.root) pending.enqueue({ node: this.root, level: 1, parent: null });
    while (!pending.isEmpty()) {
      const item = pending.dequeue()!;
      yield item;
      if (item.node.left) pending.enqueue({ node: item.node.left, level: item.level + 1, parent: item.node });
      if (item.node.right) pending.enqueue({ node: item.node.right, level: item.level + 1, parent: item.node });
    }
  }

  traverse(order: Traversal = 'inorder'): Iterable<TreeNode<K, V>> {
    switch (order) {
      case 'inorder': return this.inOrder();
      case 'descending': return this.reverseOrder();
      case 'preorder': return this.preOrder();
      case 'postorder': return this.postOrder();
      case 'level': return this.levelNodes();
      default: throw new Error('Invalid traversal');
    }
  }

  private *levelNodes(): Generator<TreeNode<K, V>> {
    for (const { node } of this.levelOrder()) yield node;
  }

  get height(): number {
    let height = -1;
    for (const { level } of this.levelOrder()) height = Math.max(height, level - 1);
    return height;
  }

  metrics() {
    let leaves = 0; let branches = 0; let maxDegree = 0;
    for (const { node, parent } of this.levelOrder()) {
      const degree = Number(node.left !== null) + Number(node.right !== null);
      leaves += Number(degree === 0); branches += Number(parent !== null && degree > 0);
      maxDegree = Math.max(maxDegree, degree);
    }
    return { weight: this.size, height: this.height, levels: this.height + 1, leaves,
      branches, internalNodes: this.size - leaves, order: 2, maxDegree };
  }

  /** Nodes visited while searching ``key``, from the root down. */
  trace(key: K): LinkedList<TreeNode<K, V>> {
    const result = new LinkedList<TreeNode<K, V>>();
    let current = this.root;
    while (current) {
      result.append(current);
      const comparison = this.compare(key, current.key);
      if (comparison === 0) break;
      current = comparison < 0 ? current.left : current.right;
    }
    return result;
  }

  *between(lower: K, upper: K): Generator<TreeNode<K, V>> {
    if (this.compare(lower, upper) > 0) throw new Error('Invalid range');
    const pending = new Stack<TreeNode<K, V>>(); let current = this.root;
    while (current || !pending.isEmpty()) {
      while (current) {
        if (this.compare(current.key, lower) < 0) current = current.right;
        else { pending.push(current); current = current.left; }
      }
      if (pending.isEmpty()) break;
      current = pending.pop()!;
      if (this.compare(current.key, upper) > 0) break;
      yield current; current = current.right;
    }
  }

  remove(key: K): boolean {
    let parent: TreeNode<K, V> | null = null; let current = this.root;
    while (current && this.compare(key, current.key) !== 0) {
      parent = current; current = this.compare(key, current.key) < 0 ? current.left : current.right;
    }
    if (!current) return false;
    if (current.left && current.right) {
      let nextParent = current; let next = current.right;
      while (next.left) { nextParent = next; next = next.left; }
      current.key = next.key; current.value = next.value;
      parent = nextParent; current = next;
    }
    const child = current.left ?? current.right;
    if (!parent) this.root = child;
    else if (parent.left === current) parent.left = child;
    else parent.right = child;
    this.size--; return true;
  }

  /** Builds a balanced tree from unsorted pairs; a repeated key keeps its last value. */
  static fromItems<K, V>(items: Iterable<[K, V]>, compare: Comparator<K>): BinarySearchTree<K, V> {
    const unique = new LinkedList<[K, V]>();
    for (const pair of Sorter.mergeSort(items, (a, b) => compare(a[0], b[0]))) {
      if (!unique.isEmpty() && compare(unique.last()![0], pair[0]) === 0) unique.replaceLast(pair);
      else unique.append(pair);
    }
    const tree = new BinarySearchTree<K, V>(compare);
    const sorted = unique[Symbol.iterator]();
    // In-order construction: the left subtree takes the first half, then the middle pair becomes the root.
    const build = (count: number): TreeNode<K, V> | null => {
      if (count <= 0) return null;
      const leftCount = Math.floor(count / 2);
      const left = build(leftCount);
      const node = new TreeNode(...(sorted.next().value as [K, V]));
      node.left = left;
      node.right = build(count - leftCount - 1);
      return node;
    };
    tree.root = build(unique.size);
    tree.size = unique.size;
    return tree;
  }

  rebalance(): void {
    const pairs = new LinkedList<[K, V]>();
    for (const node of this.inOrder()) pairs.append([node.key, node.value]);
    const rebuilt = BinarySearchTree.fromItems(pairs, this.compare);
    this.root = rebuilt.root; this.size = rebuilt.size;
  }

  /** Checks ordering bounds; visiting more nodes than ``size`` means a cycle or a shared node. */
  validate(): boolean {
    let visited = 0;
    const pending = new Stack<{ node: TreeNode<K, V>; lower?: K; upper?: K }>();
    if (this.root) pending.push({ node: this.root });
    while (!pending.isEmpty()) {
      const { node, lower, upper } = pending.pop()!;
      if (++visited > this.size || lower !== undefined && this.compare(node.key, lower) <= 0
        || upper !== undefined && this.compare(node.key, upper) >= 0) return false;
      if (node.right) pending.push({ node: node.right, lower: node.key, upper });
      if (node.left) pending.push({ node: node.left, lower, upper: node.key });
    }
    return visited === this.size;
  }

  clear(): void { this.root = null; this.size = 0; }
}
