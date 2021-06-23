import type seedrandom from 'seedrandom'
import { lerp3, smoothstep } from '../../Utils'

export class ImprovedNoise {
	private static readonly GRADIENT = [[1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0], [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1], [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1], [1, 1, 0], [0, -1, 1], [-1, 1, 0], [0, -1, -1]]
	private readonly p: number[]
	public readonly xo: number
	public readonly yo: number
	public readonly zo: number

	constructor(random: seedrandom.prng) {
		this.xo = random() * 256
		this.yo = random() * 256
		this.zo = random() * 256
		this.p = Array(256)

		for (let i = 0; i < 256; i += 1) {
			this.p[i] = i
		}
		for (let i = 0; i < 256; i += 1) {
			const n = random.int32() % (256 - i)
			const b = this.p[i]
			this.p[i] = this.p[i + n]
			this.p[i + n] = b
		}
	}

	public noise(x: number, y: number, z: number, a: number, b: number) {
		const x2 = x + this.xo
		const y2 = y + this.yo
		const z2 = z + this.zo
		const x3 = Math.floor(x2)
		const y3 = Math.floor(y2)
		const z3 = Math.floor(z2)
		const x4 = x2 - x3
		const y4 = y2 - y3
		const z4 = z2 - z3
		const x5 = smoothstep(x4)
		const y5 = smoothstep(y4)
		const z5 = smoothstep(z4)

		let y6 = 0
		if (a !== 0) {
			y6 = Math.floor(Math.min(b, y4) / a) * a
		}

		return this.sampleAndLerp(x3, y3, z3, x4, y4 - y6, z4, x5, y5, z5)
	}

	private gradDot(a: number, b: number, c: number, d: number) {
		const grad = ImprovedNoise.GRADIENT[a & 15]
		return grad[0] * b + grad[1] * c + grad[2] * d
	}

	private P(i: number) {
		return this.p[i & 255] & 255
	}

	public sampleAndLerp(a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number) {
		const j = this.P(a) + b
		const k = this.P(j) + c
		const l = this.P(j + 1) + c
		const m = this.P(a + 1) + b
		const n = this.P(m) + c
		const o = this.P(m + 1) + c

		const p = this.gradDot(this.P(k), d, e, f)
		const q = this.gradDot(this.P(n), d - 1, e, f)
		const r = this.gradDot(this.P(l), d, e - 1, f)
		const s = this.gradDot(this.P(o), d - 1, e - 1, f)
    
		const t = this.gradDot(this.P(k + 1), d, e, f - 1)
		const u = this.gradDot(this.P(n + 1), d - 1, e, f - 1)
		const v = this.gradDot(this.P(l + 1), d, e - 1, f - 1)
		const w = this.gradDot(this.P(o + 1), d - 1, e - 1, f - 1)

		return lerp3(g, h, i, p, q, r, s, t, u, v, w)
	}
}
