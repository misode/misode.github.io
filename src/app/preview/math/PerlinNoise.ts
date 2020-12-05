import seedrandom from 'seedrandom'
import { ImprovedNoise } from "./ImprovedNoise";

export class PerlinNoise {
  private noiseLevels: ImprovedNoise[]
  private amplitudes: number[]
  private lowestFreqValueFactor: number
  private lowestFreqInputFactor: number

  constructor(seed: string, firstOctave: number, amplitudes: number[]) {
    this.amplitudes = amplitudes

    this.noiseLevels = Array(this.amplitudes.length)
    for (let i = 0; i < this.amplitudes.length; i += 1) {
      this.noiseLevels[i] = new ImprovedNoise(seedrandom(seed))
    }
    
    this.lowestFreqInputFactor = Math.pow(2, firstOctave)
    this.lowestFreqValueFactor = Math.pow(2, (amplitudes.length - 1)) / (Math.pow(2, amplitudes.length) - 1)
  }

  public static fromRange(seed: string, min: number, max: number) {
    return new PerlinNoise(seed, min, Array(max - min + 1).fill(1))
  }

  public getValue(x: number, y: number, z: number, a = 0, b = 0, fixY = false) {
    let value = 0
    let inputF = this.lowestFreqInputFactor
    let valueF = this.lowestFreqValueFactor
    for (let i = 0; i < this.noiseLevels.length; i += 1) {
      const noise = this.noiseLevels[i]
      if (noise) {
        value += this.amplitudes[i] * noise.noise(
          PerlinNoise.wrap(x * inputF),
          fixY ? -noise.yo : PerlinNoise.wrap(y * inputF),
          PerlinNoise.wrap(z * inputF),
          a * inputF,
          b * inputF
        ) * valueF
      }
      inputF *= 2
      valueF /= 2
    }
    return value
  }

  public getOctaveNoise(i: number) {
    return this.noiseLevels[this.noiseLevels.length - 1 - i]
  }

  public static wrap(value: number) {
    return value - Math.floor(value / 3.3554432E7 + 0.5) * 3.3554432E7
  }
}
