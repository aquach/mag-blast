import * as _ from 'lodash'

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

export function assert(
  pred: boolean,
  m: string = 'no message provided'
): asserts pred {
  if (!pred) {
    console.error(`Assertion failed: ${m}`)
    console.error(new Error().stack)
    process.exit(1)
  }
}

export function partition<T>(
  x: Array<T>,
  f: (_: T, i: number) => boolean
): [T[], T[]] {
  const trues: T[] = []
  const falses: T[] = []

  x.forEach((v, i) => {
    if (f(v, i)) {
      trues.push(v)
    } else {
      falses.push(v)
    }
  })

  return [trues, falses]
}

export function warn(m: string): void {
  console.warn(`[${new Date()}] ${m}`)
  console.warn(new Error().stack)
}

export function uniqueGroupBy<T>(
  items: T[],
  grouper: (_: T) => string
): Record<string, T> {
  return _.mapValues(_.groupBy(items, grouper), (v) => v[0])
}
