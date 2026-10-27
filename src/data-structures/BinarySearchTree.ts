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
