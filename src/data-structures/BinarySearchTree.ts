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
