export function mapValues<K, U, V>(
  map: Map<K, U>,
  fn: (v: U, k: K) => V
): Map<K, V> {
  return new Map(Array.from(map, ([key, value]) => [key, fn(value, key)]))
}

export function ascribe<T>(x: T): T {
  return x
}

export function filterIndices<T>(x: Array<T>, f: (_: T) => boolean): number[] {
  const is: number[] = []

  x.forEach((v, i) => {
    if (f(v)) {
      is.push(i)
    }
  })

  return is
}

export function mapToObject<K extends string | number | symbol, V>(
  v: Map<K, V>
): Record<K, V> {
  return Object.fromEntries(Array.from(v)) as Record<K, V>
}
