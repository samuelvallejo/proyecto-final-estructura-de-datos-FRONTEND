/** Adaptación de Node/BinaryTree del material Arboles.pdf (Mideros, 2026). */
export type Comparator<K> = (left: K, right: K) => number;
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
    const pending: TreeNode<K, V>[] = [];
    let current = this.root;
    while (current || pending.length) {
      while (current) { pending.push(current); current = current.left; }
      current = pending.pop()!;
      yield current;
      current = current.right;
    }
  }

  *reverseOrder(): Generator<TreeNode<K, V>> {
    const pending: TreeNode<K, V>[] = [];
    let current = this.root;
    while (current || pending.length) {
      while (current) { pending.push(current); current = current.right; }
      current = pending.pop()!;
      yield current;
      current = current.left;
    }
  }

  *preOrder(): Generator<TreeNode<K, V>> {
    const pending = this.root ? [this.root] : [];
    while (pending.length) {
      const node = pending.pop()!;
      yield node;
      if (node.right) pending.push(node.right);
      if (node.left) pending.push(node.left);
    }
  }

  *postOrder(): Generator<TreeNode<K, V>> {
    const pending: [TreeNode<K, V>, boolean][] = this.root ? [[this.root, false]] : [];
    while (pending.length) {
      const [node, visited] = pending.pop()!;
      if (visited) { yield node; continue; }
      pending.push([node, true]);
      if (node.right) pending.push([node.right, false]);
      if (node.left) pending.push([node.left, false]);
    }
  }

  *levelOrder(): Generator<{ node: TreeNode<K, V>; level: number; parent: TreeNode<K, V> | null }> {
    const pending = this.root ? [{ node: this.root, level: 1, parent: null as TreeNode<K, V> | null }] : [];
    for (let cursor = 0; cursor < pending.length; cursor++) {
      const item = pending[cursor];
      yield item;
      if (item.node.left) pending.push({ node: item.node.left, level: item.level + 1, parent: item.node });
      if (item.node.right) pending.push({ node: item.node.right, level: item.level + 1, parent: item.node });
    }
  }

  traverse(order: Traversal = 'inorder'): Iterable<TreeNode<K, V>> {
    switch (order) {
      case 'inorder': return this.inOrder();
      case 'descending': return this.reverseOrder();
      case 'preorder': return this.preOrder();
      case 'postorder': return this.postOrder();
      case 'level': return [...this.levelOrder()].map(item => item.node);
      default: throw new Error('Recorrido inválido');
    }
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

  trace(key: K): TreeNode<K, V>[] {
    const result: TreeNode<K, V>[] = [];
    let current = this.root;
    while (current) {
      result.push(current);
      const comparison = this.compare(key, current.key);
      if (comparison === 0) break;
      current = comparison < 0 ? current.left : current.right;
    }
    return result;
  }

  *between(lower: K, upper: K): Generator<TreeNode<K, V>> {
    if (this.compare(lower, upper) > 0) throw new Error('Rango inválido');
    const pending: TreeNode<K, V>[] = []; let current = this.root;
    while (current || pending.length) {
      while (current) {
        if (this.compare(current.key, lower) < 0) current = current.right;
        else { pending.push(current); current = current.left; }
      }
      if (!pending.length) break;
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

  static fromItems<K, V>(items: Iterable<[K, V]>, compare: Comparator<K>): BinarySearchTree<K, V> {
    const pairs = [...items].sort((a, b) => compare(a[0], b[0]));
    const unique: [K, V][] = [];
    for (const pair of pairs) {
      if (unique.length && compare(unique[unique.length - 1][0], pair[0]) === 0) unique[unique.length - 1] = pair;
      else unique.push(pair);
    }
    const tree = new BinarySearchTree<K, V>(compare);
    const tasks: [number, number, TreeNode<K, V> | null, 'root' | 'left' | 'right'][] = [[0, unique.length, null, 'root']];
    while (tasks.length) {
      const [first, last, parent, side] = tasks.pop()!;
      if (first >= last) continue;
      const middle = Math.floor((first + last) / 2); const node = new TreeNode(...unique[middle]);
      if (parent && side !== 'root') parent[side] = node; else tree.root = node;
      tree.size++; tasks.push([middle + 1, last, node, 'right'], [first, middle, node, 'left']);
    }
    return tree;
  }

  rebalance(): void {
    const rebuilt = BinarySearchTree.fromItems([...this.inOrder()].map(node => [node.key, node.value]), this.compare);
    this.root = rebuilt.root; this.size = rebuilt.size;
  }

  validate(): boolean {
    const seen = new Set<TreeNode<K, V>>();
    const pending: { node: TreeNode<K, V>; lower?: K; upper?: K }[] = this.root ? [{ node: this.root }] : [];
    while (pending.length) {
      const { node, lower, upper } = pending.pop()!;
      if (seen.has(node) || lower !== undefined && this.compare(node.key, lower) <= 0
        || upper !== undefined && this.compare(node.key, upper) >= 0) return false;
      seen.add(node);
      if (node.right) pending.push({ node: node.right, lower: node.key, upper });
      if (node.left) pending.push({ node: node.left, lower, upper: node.key });
    }
    return seen.size === this.size;
  }

  clear(): void { this.root = null; this.size = 0; }
}
