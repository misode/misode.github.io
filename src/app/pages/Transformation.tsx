import type { Color } from 'deepslate'
import { Mesh, Quad, Renderer, ShaderProgram, Vector } from 'deepslate'
import { mat3, mat4, quat, vec3 } from 'gl-matrix'
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { Footer, NumberInput, Octicon, RangeInput } from '../components/index.js'
import { InteractiveCanvas3D } from '../components/previews/InteractiveCanvas3D.jsx'
import { useLocale, useTitle } from '../contexts/index.js'
import { svdDecompose, toAffine } from '../Utils.js'

interface Props {
	path?: string,
}
export function Transformation({}: Props) {
	const { locale } = useLocale()
	useTitle(locale('title.transformation'))

	const [translation, setTranslation] = useState<vec3>(vec3.create())
	const [leftRotation, setLeftRotation] = useState<quat>(quat.create())
	const [scale, setScale] = useState<vec3>(vec3.fromValues(1, 1, 1))
	const [rightRotation, setRightRotation] = useState<quat>(quat.create())

	const [normalizeLeft, setNormalizeLeft] = useState(true)
	const [normalizeRight, setNormalizeRight] = useState(true)

	useEffect(() => {
		if (normalizeLeft) setLeftRotation(q => quat.normalize(quat.clone(q), q))
	}, [normalizeLeft])
	useEffect(() => {
		if (normalizeRight) setRightRotation(q => quat.normalize(quat.clone(q), q))
	}, [normalizeRight])

	const matrix = useMemo(() => {
		const m = mat4.create()
		mat4.translate(m, m, translation)
		mat4.mul(m, m, mat4.fromQuat(mat4.create(), leftRotation))
		mat4.scale(m, m, scale)
		mat4.mul(m, m, mat4.fromQuat(mat4.create(), rightRotation))
		return m
	}, [translation, leftRotation, scale, rightRotation])

	const setMatrix = useCallback((m: mat4) => {
		const affine = toAffine(m)
		const newTranslation = mat4.getTranslation(vec3.create(), affine)
		const [newLeftRotation, newScale, newRightRotation] = svdDecompose(mat3.fromMat4(mat3.create(), affine))
		setTranslation(newTranslation)
		setLeftRotation(newLeftRotation)
		setScale(newScale)
		setRightRotation(newRightRotation)
	}, [])

	const changeMatrix = useCallback((i: number, value: number) => {
		const m = mat4.clone(matrix)
		m[i] = value
		setMatrix(m)
	}, [matrix])

	const changeTranslation = useCallback((i: number, value: number) => {
		const copy = vec3.clone(translation)
		copy[i] = value
		setTranslation(copy)
	}, [translation])

	const changeLeftRotation = useCallback((i: number, value: number) => {
		const copy = quat.clone(leftRotation)
		copy[i] = value
		if (normalizeLeft) {
			quat.normalize(copy, copy)
		}
		setLeftRotation(copy)
	}, [leftRotation, normalizeLeft])

	const changeScale = useCallback((i: number, value: number) => {
		const copy = vec3.clone(scale)
		copy[i] = value
		setScale(copy)
	}, [scale])

	const changeRightRotation = useCallback((i: number, value: number) => {
		const copy = quat.clone(rightRotation)
		copy[i] = value
		if (normalizeRight) {
			quat.normalize(copy, copy)
		}
		setRightRotation(copy)
	}, [rightRotation, normalizeRight])

	const renderer = useRef<MeshRenderer>()
	const onSetup = useCallback((canvas: HTMLCanvasElement) => {
		const gl = canvas.getContext('webgl')
		if (!gl) return
		renderer.current = new MeshRenderer(gl)
	}, [])
	const onResize = useCallback((width: number, height: number) => {
		renderer.current?.setViewport(0, 0, width, height)
	}, [])
	const onDraw = useCallback((view: mat4) => {
		renderer.current?.draw(view, matrix)
	}, [matrix])

	return <main class="has-preview">
		<div class="transformation-editor">
			<div class="transformation-decomposition">
				<div class="transformation-section">
					<div class="transformation-title">
						<span>{locale('transformation.translation')}</span>
						<button class="tooltipped tip-se" aria-label={locale('reset')} onClick={() => setTranslation(vec3.create())}>{Octicon['history']}</button>
					</div>
					{Array(3).fill(0).map((_, i) => <div class="transformation-input">
						<NumberInput value={translation[i].toFixed(3)} onChange={v => changeTranslation(i, v)} />
						<RangeInput min={-1} max={1} step={0.01} value={translation[i]} onChange={v => changeTranslation(i, v)} />
					</div>)}
				</div>
				<div class="transformation-section">
					<div class="transformation-title">
						<span>{locale('transformation.left_rotation')}</span>
						<button class="tooltipped tip-se" aria-label={locale('reset')} onClick={() => setLeftRotation(quat.create())}>{Octicon['history']}</button>
						<button class="tooltipped tip-se" aria-label={locale('normalize')} onClick={() => setNormalizeLeft(!normalizeLeft)}>{Octicon[normalizeLeft ? 'lock' : 'unlock']}</button>
					</div>
					{Array(4).fill(0).map((_, i) => <div class="transformation-input">
						<NumberInput value={leftRotation[i].toFixed(3)} onChange={v => changeLeftRotation(i, v)} />
						<RangeInput min={-1} max={1} step={0.01} value={leftRotation[i]} onChange={v => changeLeftRotation(i, v)} />
					</div>)}
				</div>
				<div class="transformation-section">
					<div class="transformation-title">
						<span>{locale('transformation.scale')}</span>
						<button class="tooltipped tip-se" aria-label={locale('reset')} onClick={() => setScale(vec3.fromValues(1, 1, 1))}>{Octicon['history']}</button>
					</div>
					{Array(3).fill(0).map((_, i) => <div class="transformation-input">
						<NumberInput value={scale[i].toFixed(3)} onChange={v => changeScale(i, v)} />
						<RangeInput min={-1} max={1} step={0.01} value={scale[i]} onChange={v => changeScale(i, v)} />
					</div>)}
				</div>
				<div class="transformation-section">
					<div class="transformation-title">
						<span>{locale('transformation.right_rotation')}</span>
						<button class="tooltipped tip-se" aria-label={locale('reset')} onClick={() => setRightRotation(quat.create())}>{Octicon['history']}</button>
						<button class="tooltipped tip-se" aria-label={locale('normalize')} onClick={() => setNormalizeRight(!normalizeRight)}>{Octicon[normalizeRight ? 'lock' : 'unlock']}</button>
					</div>
					{Array(4).fill(0).map((_, i) => <div class="transformation-input">
						<NumberInput value={rightRotation[i].toFixed(3)} onChange={v => changeRightRotation(i, v)} />
						<RangeInput min={-1} max={1} step={0.01} value={rightRotation[i]} onChange={v => changeRightRotation(i, v)} />
					</div>)}
				</div>
			</div>
			<div class="transformation-matrix">
				<div class="transformation-section">
					<div class="transformation-title">
						<span>{locale('transformation.matrix')}</span>
						<button class="tooltipped tip-se" aria-label={locale('reset')} onClick={() => setMatrix(mat4.create())}>{Octicon['history']}</button>
					</div>
					{Array(16).fill(0).map((_, i) => <div class="transformation-input">
						<NumberInput value={matrix[i].toFixed(3)} onChange={v => changeMatrix(i, v)} readonly disabled />
						<RangeInput min={-1} max={1} step={0.01} value={matrix[i]} onChange={v => changeMatrix(i, v)} readonly disabled />
					</div>)}
				</div>
			</div>
		</div>
		<div class="popup-preview shown">
			<div class="transformation-preview full-preview">
				<InteractiveCanvas3D onSetup={onSetup} onResize={onResize} onDraw={onDraw} />
			</div>
		</div>
		<Footer />
	</main>
}

const vsMesh = `
  attribute vec4 vertPos;
  attribute vec3 vertColor;
  attribute vec3 normal;

  uniform mat4 mView;
  uniform mat4 mProj;

  varying highp vec3 vColor;
  varying highp float vLighting;

  void main(void) {
    gl_Position = mProj * mView * vertPos;
    vColor = vertColor;
    vLighting = normal.y * 0.2 + abs(normal.z) * 0.1 + 0.8;
  }
`

const fsMesh = `
  precision highp float;
  varying highp vec3 vColor;
  varying highp float vLighting;

  void main(void) {
		gl_FragColor = vec4(vColor.xyz * vLighting, 1.0);
  }
`

const vsGrid = `
  attribute vec4 vertPos;
  attribute vec3 vertColor;

  uniform mat4 mView;
  uniform mat4 mProj;

  varying highp vec3 vColor;

  void main(void) {
    gl_Position = mProj * mView * vertPos;
    vColor = vertColor;
  }
`

const fsGrid = `
  precision highp float;
  varying highp vec3 vColor;

  void main(void) {
    gl_FragColor = vec4(vColor, 1.0);
  }
`

class MeshRenderer extends Renderer {
	private readonly meshShaderProgram: WebGLProgram
	private readonly gridShaderProgram: WebGLProgram
	private readonly mesh: Mesh
	private readonly grid: Mesh

	constructor(gl: WebGLRenderingContext) {
		super(gl)
		this.meshShaderProgram = new ShaderProgram(gl, vsMesh, fsMesh).getProgram()
		this.gridShaderProgram = new ShaderProgram(gl, vsGrid, fsGrid).getProgram()

		const color: Color = [0.8, 0.8, 0.8]
		this.mesh = new Mesh([
			Quad.fromPoints(
				new Vector(1, 0, 0),
				new Vector(1, 1, 0),
				new Vector(1, 1, 1),
				new Vector(1, 0, 1)).setColor(color),
			Quad.fromPoints(
				new Vector(0, 0, 1),
				new Vector(0, 1, 1),
				new Vector(0, 1, 0),
				new Vector(0, 0, 0)).setColor(color),
			Quad.fromPoints(
				new Vector(0, 1, 1),
				new Vector(1, 1, 1),
				new Vector(1, 1, 0),
				new Vector(0, 1, 0)).setColor(color),
			Quad.fromPoints(
				new Vector(0, 0, 0),
				new Vector(1, 0, 0),
				new Vector(1, 0, 1),
				new Vector(0, 0, 1)).setColor(color),
			Quad.fromPoints(
				new Vector(0, 0, 1),
				new Vector(1, 0, 1),
				new Vector(1, 1, 1),
				new Vector(0, 1, 1)).setColor(color),
			Quad.fromPoints(
				new Vector(0, 1, 0),
				new Vector(1, 1, 0),
				new Vector(1, 0, 0),
				new Vector(0, 0, 0)).setColor(color),
		])
		for (const q of this.mesh.quads) {
			const normal = q.normal()
			q.forEach(v => v.normal = normal)
		}
		this.mesh.rebuild(this.gl, { pos: true, color: true, normal: true })

		this.grid = new Mesh()
		this.grid.addLine(0, 0, 0, 1, 0, 0, [1, 0, 0])
		this.grid.addLine(0, 0, 0, 0, 1, 0, [0, 1, 0])
		this.grid.addLine(0, 0, 0, 0, 0, 1, [0, 0, 1])
		this.grid.rebuild(this.gl, { pos: true, color: true })
	}

	public draw(view: mat4, transform: mat4) {
		this.setShader(this.gridShaderProgram)
		this.prepareDraw(view)
		this.drawMesh(this.grid, { pos: true, color: true })

		const copy = mat4.clone(view)
		mat4.multiply(copy, copy, transform)
		this.setShader(this.meshShaderProgram)
		this.prepareDraw(copy)
		this.drawMesh(this.mesh, { pos: true, color: true, normal: true })
	}
}
