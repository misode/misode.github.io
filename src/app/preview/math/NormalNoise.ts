import { PerlinNoise } from './PerlinNoise'

export class NormalNoise {
  private valueFactor: number
  private first: PerlinNoise
  private second: PerlinNoise

  constructor(seed: string, firstOctave: number, amplitudes: number[]) {
    this.first = new PerlinNoise(seed, firstOctave, amplitudes)
    this.second = new PerlinNoise(seed + 'a', firstOctave, amplitudes)

    let min = +Infinity
    let max = -Infinity
    for (let i = 0; i < amplitudes.length; i += 1) {
      if (amplitudes[i] !== 0) {
        min = Math.min(min, i)
        max = Math.max(max, i)
      }
    }

    const expectedDeviation = 0.1 * (1 + 1 / (max - min + 1))
    this.valueFactor = (1/6) / expectedDeviation
  }

  getValue(x: number, y: number, z: number) {
    const x2 = x * 1.0181268882175227
    const y2 = y * 1.0181268882175227
    const z2 = z * 1.0181268882175227
    return (this.first.getValue(x, y, z) + this.second.getValue(x2, y2, z2)) * this.valueFactor
  }

  private wrap(value: number) {
    return value - Math.floor(value / 3.3554432E7 + 0.5) * 3.3554432E7
  }
}
