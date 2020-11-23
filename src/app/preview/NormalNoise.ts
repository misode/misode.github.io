import SimplexNoise from 'simplex-noise'

export class NormalNoise {
  private noiseLevels: SimplexNoise[]
  private amplitudes: number[]
  private valueFactor: number
  private lowestFreqInputFactor: number
  private lowestFreqValueFactor: number

  constructor(seed: string, firstOctave: number, amplitudes: number[]) {
    this.amplitudes = amplitudes
    this.noiseLevels = amplitudes.map((a, i) => new SimplexNoise(seed + 'a' + i))

    let min = +Infinity
    let max = -Infinity
    for (let a of amplitudes) {
      if (a !== 0) {
        min = Math.min(min, a)
        max = Math.max(max, a)
      }
    }
    const expectedDeviation = 0.1 * (1 + 1 / (max - min + 1))
    this.valueFactor = (1/6) / expectedDeviation

    this.lowestFreqInputFactor = Math.pow(2, firstOctave)
    this.lowestFreqValueFactor = Math.pow(2, (amplitudes.length - 1)) / (Math.pow(2, amplitudes.length) - 1)
  }

  getValue(x: number, y: number) {
    let value = 0
    let inputF = this.lowestFreqInputFactor
    let valueF = this.lowestFreqValueFactor
    for (let i = 0; i < this.amplitudes.length; i += 1) {
      if (this.amplitudes[i] !== 0) {
        value += this.amplitudes[i] * this.noiseLevels[i].noise2D(this.wrap(x * inputF), this.wrap(y * inputF) + i) * valueF
      }
      inputF *= 2
      valueF /= 2
    }
    return 2 * value * this.valueFactor
  }

  private wrap(value: number) {
    return value - Math.floor(value / 3.3554432E7 + 0.5) * 3.3554432E7
  }
}
