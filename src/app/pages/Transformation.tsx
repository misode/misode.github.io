import { Matrix3, Matrix4, Mesh, Quad, Renderer, ShaderProgram, Vector, Vertex } from 'deepslate'
import { mat4, quat, vec3 } from 'gl-matrix'
import { useCallback, useMemo, useRef, useState } from 'preact/hooks'
import { composeMatrix, svdDecompose } from '../Utils.js'
import { Footer, NumberInput, Octicon, RangeInput } from '../components/index.js'
import { InteractiveCanvas3D } from '../components/previews/InteractiveCanvas3D.jsx'
import { useLocale, useTitle } from '../contexts/index.js'
import { useActiveTimeout } from '../hooks/useActiveTimout.js'
import { useAsync } from '../hooks/useAsync.js'
import { loadImage } from '../services/DataFetcher.js'

const XYZ = ['x', 'y', 'z'] as const
type XYZ = typeof XYZ[number]

const XYZW = ['x', 'y', 'z', 'w'] as const

const RotationModes = ['quaternion', 'axis_angle'] as const
type RotationMode = typeof RotationModes[number]

interface Props {
	path?: string,
}
export function Transformation({}: Props) {
	const { locale } = useLocale()
	useTitle(locale('title.transformation'))

	const { value: cubeTexture } = useAsync(async () => {
		const img = await loadImage('/images/cube.png')
		const canvas = document.createElement('canvas')
		canvas.width = 64
		canvas.height = 64
		const ctx = canvas.getContext('2d')!
		ctx.drawImage(img, 0, 0)
		const data = ctx.getImageData(0, 0, 64, 64)
		return data
	})

	const [matrix, setMatrix] = useState(new Matrix4())
	const [translation, setTranslation] = useState(new Vector(0, 0, 0))
	const [leftRotation, setLeftRotation] = useState(quat.create())
	const [scale, setScale] = useState(new Vector(1, 1, 1))
	const [rightRotation, setRightRotation] = useState(quat.create())

	const [normalizeLeft, setNormalizeLeft] = useState(true)
	const [normalizeRight, setNormalizeRight] = useState(true)

	const usedMatrix = useMemo(() => {
		return composeMatrix(translation, leftRotation, scale, rightRotation)
	}, [translation, leftRotation, scale, rightRotation])

	const updateMatrix = useCallback((m: Matrix4) => {
		const affine = m.clone().affine()
		const newTranslation = affine.getTranslation()
		const [newLeftRotation, newScale, newRightRotation] = svdDecompose(Matrix3.fromMatrix4(affine))
		setTranslation(newTranslation)
		setLeftRotation(newLeftRotation)
		setScale(newScale)
		setRightRotation(newRightRotation)
		setMatrix(m)
	}, [])

	const changeMatrix = useCallback((i: number, value: number) => {
		const m = matrix.clone()
		m.data[i] = value
		updateMatrix(m)
	}, [matrix])

	const updateTranslation = useCallback((value: Vector) => {
		setTranslation(value)
		setMatrix(composeMatrix(value, leftRotation, scale, rightRotation))
	}, [leftRotation, scale, rightRotation])

	const changeTranslation = useCallback((c: XYZ, v: number) => {
		updateTranslation(new Vector(c === 'x' ? v : translation.x, c === 'y' ? v : translation.y, c === 'z' ? v : translation.z))
	}, [translation, updateTranslation])

	const updateLeftRotation = useCallback((value: quat) => {
		setLeftRotation(value)
		setMatrix(composeMatrix(translation, value, scale, rightRotation))
	}, [translation, scale, rightRotation])

	const changeLeftRotation = useCallback((i: number, value: number) => {
		const copy = quat.clone(leftRotation)
		copy[i] = value
		if (normalizeLeft) quat.normalize(copy, copy)
		updateLeftRotation(copy)
	}, [leftRotation, normalizeLeft, updateLeftRotation])

	const updateScale = useCallback((value: Vector) => {
		setScale(value)
		setMatrix(composeMatrix(translation, leftRotation, value, rightRotation))
	}, [translation, leftRotation, rightRotation])

	const changeScale = useCallback((c: XYZ, v: number) => {
		updateScale(new Vector(c === 'x' ? v : scale.x, c === 'y' ? v : scale.y, c === 'z' ? v : scale.z))
	}, [scale, updateScale])

	const updateRightRotation = useCallback((value: quat) => {
		setRightRotation(value)
		setMatrix(composeMatrix(translation, leftRotation, scale, value))
	}, [translation, leftRotation, scale])

	const changeRightRotation = useCallback((i: number, value: number) => {
		const copy = quat.clone(rightRotation)
		copy[i] = value
		if (normalizeRight) quat.normalize(copy, copy)
		updateRightRotation(copy)
	}, [rightRotation, normalizeRight, updateRightRotation])

	const [rotationMode, setRotationMode] = useState<RotationMode>('quaternion')

	const leftRotationAxisAngle = useMemo(() => {
		const axis = vec3.create()
		const angle = quat.getAxisAngle(axis, leftRotation)
		return { axis, angle }
	}, [leftRotation])

	const changeLeftRotationAxisAngle = useCallback((i: number, value: number) => {
		const axisCopy = vec3.clone(leftRotationAxisAngle.axis)
		if (i < 3) axisCopy[i] = value
		else leftRotationAxisAngle.angle = value
		if (normalizeLeft) vec3.normalize(axisCopy, axisCopy)
		const copy = quat.setAxisAngle(quat.create(), axisCopy, leftRotationAxisAngle.angle)
		if (normalizeLeft) quat.normalize(copy, copy)
		updateLeftRotation(copy)
	}, [leftRotation, normalizeLeft, updateLeftRotation])

	const rightRotationAxisAngle = useMemo(() => {
		const axis = vec3.create()
		const angle = quat.getAxisAngle(axis, rightRotation)
		return { axis, angle }
	}, [rightRotation])

	const changeRightRotationAxisAngle = useCallback((i: number, value: number) => {
		const axisCopy = vec3.clone(rightRotationAxisAngle.axis)
		if (i < 3) axisCopy[i] = value
		else rightRotationAxisAngle.angle = value
		if (normalizeRight) vec3.normalize(axisCopy, axisCopy)
		const copy = quat.setAxisAngle(quat.create(), axisCopy, rightRotationAxisAngle.angle)
		if (normalizeRight) quat.normalize(copy, copy)
		updateRightRotation(copy)
	}, [rightRotation, normalizeRight, updateRightRotation])

	const renderer = useRef<MeshRenderer>()
	const onSetup = useCallback((canvas: HTMLCanvasElement) => {
		if (!cubeTexture) return
		const gl = canvas.getContext('webgl')
		if (!gl) return
		renderer.current = new MeshRenderer(gl, cubeTexture)
	}, [cubeTexture])
	const onResize = useCallback((width: number, height: number) => {
		renderer.current?.setViewport(0, 0, width, height)
	}, [cubeTexture])
	const onDraw = useCallback((view: mat4) => {
		renderer.current?.draw(view, usedMatrix.data)
	}, [usedMatrix])

	const [copiedDecomposed, setCopiedDecomposed] = useActiveTimeout()
	const onCopyDecomposed = useCallback(() => {
		navigator.clipboard.writeText(`{translation:[${translation.components().map(formatFloat).join(',')}],left_rotation:[${[...leftRotation].map(formatFloat).join(',')}],scale:[${scale.components().map(formatFloat).join(',')}],right_rotation:[${[...rightRotation].map(formatFloat).join(',')}]}`)
			.then(() => setCopiedDecomposed())
	}, [translation, leftRotation, scale, rightRotation, setCopiedDecomposed])

	const [copiedComposed, setCopiedComposed] = useActiveTimeout()
	const onCopyComposed = useCallback(() => {
		const matrixData = matrix.clone().transpose().data
		navigator.clipboard.writeText(`[${[...matrixData].map(formatFloat).join(',')}]`)
			.then(() => setCopiedComposed())
	}, [matrix, setCopiedComposed])

	return <main class="has-preview">
		<div class="transformation-editor">
			<div class="transformation-decomposition">
				<div class="transformation-section">
					<div class="transformation-title">
						<span>{locale('transformation.translation')}</span>
						<button class="tooltipped tip-se" aria-label={locale('reset')} onClick={() => updateTranslation(new Vector(0, 0, 0))}>{Octicon['history']}</button>
						<button class="tooltipped tip-se" aria-label={locale('transformation.copy_decomposed')} onClick={onCopyDecomposed}>{Octicon[copiedDecomposed ? 'check' : 'clippy']}</button>
					</div>
					{XYZ.map((c) =>
						<Slider label={c} value={translation[c]} onChange={v => changeTranslation(c, v)} />
					)}
				</div>
				<div class="transformation-section">
					<div class="transformation-title">
						<span>{locale('transformation.left_rotation')}</span>
						<button class="tooltipped tip-se" aria-label={locale('reset')} onClick={() => updateLeftRotation(quat.create())}>{Octicon['history']}</button>
						<button class="tooltipped tip-se" aria-label={locale('normalize')} onClick={() => setNormalizeLeft(!normalizeLeft)}>{Octicon[normalizeLeft ? 'lock' : 'unlock']}</button>
						<button class="tooltipped tip-se" aria-label={locale('transformation.rotation_mode', locale(`transformation.rotation_mode.${rotationMode}`))} onClick={() => setRotationMode(rotationMode === 'quaternion' ? 'axis_angle' : 'quaternion')}>{Octicon['arrow_switch']}</button>
					</div>
					{rotationMode === 'quaternion'
						? XYZW.map((c, i) =>
							<Slider label={c} value={leftRotation[i]} onChange={v => changeLeftRotation(i, v)} />)
						: <>
							{XYZ.map((c, i) =>
								<Slider label={c} value={leftRotationAxisAngle.axis[i]} onChange={v => changeLeftRotationAxisAngle(i, v)} />)}
							<Slider label="θ" value={leftRotationAxisAngle.angle} min={0} max={Math.PI*2} onChange={v => changeLeftRotationAxisAngle(3, v)} />
						</>}
				</div>
				<div class="transformation-section">
					<div class="transformation-title">
						<span>{locale('transformation.scale')}</span>
						<button class="tooltipped tip-se" aria-label={locale('reset')} onClick={() => updateScale(new Vector(1, 1, 1))}>{Octicon['history']}</button>
					</div>
					{XYZ.map((c) =>
						<Slider label={c} value={scale[c]} onChange={v => changeScale(c, v)} />
					)}
				</div>
				<div class="transformation-section">
					<div class="transformation-title">
						<span>{locale('transformation.right_rotation')}</span>
						<button class="tooltipped tip-se" aria-label={locale('reset')} onClick={() => updateRightRotation(quat.create())}>{Octicon['history']}</button>
						<button class="tooltipped tip-se" aria-label={locale('normalize')} onClick={() => setNormalizeRight(!normalizeRight)}>{Octicon[normalizeRight ? 'lock' : 'unlock']}</button>
						<button class="tooltipped tip-se" aria-label={locale('transformation.rotation_mode', locale(`transformation.rotation_mode.${rotationMode}`))} onClick={() => setRotationMode(rotationMode === 'quaternion' ? 'axis_angle' : 'quaternion')}>{Octicon['arrow_switch']}</button>
					</div>
					{rotationMode === 'quaternion'
						? XYZW.map((c, i) =>
							<Slider label={c} value={rightRotation[i]} onChange={v => changeRightRotation(i, v)} />)
						: <>
							{XYZ.map((c, i) =>
								<Slider label={c} value={rightRotationAxisAngle.axis[i]} onChange={v => changeRightRotationAxisAngle(i, v)}/>)}
							<Slider label="θ" value={rightRotationAxisAngle.angle} min={0} max={Math.PI*2} onChange={v => changeRightRotationAxisAngle(3, v)} />
						</>}
				</div>
			</div>
			<div class="transformation-matrix">
				<div class="transformation-section">
					<div class="transformation-title">
						<span>{locale('transformation.matrix')}</span>
						<button class="tooltipped tip-se" aria-label={locale('reset')} onClick={() => updateMatrix(new Matrix4())}>{Octicon['history']}</button>
						<button class="tooltipped tip-se" aria-label={locale('transformation.copy_composed')} onClick={onCopyComposed}>{Octicon[copiedComposed ? 'check' : 'clippy']}</button>
					</div>
					{Array(16).fill(0).map((_, i) =>
						<Slider value={matrix.data[i]} onChange={v => changeMatrix(i, v)} disabled={i % 4 === 3} />
					)}
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

interface SliderProps {
	label?: string
	value: number
	onChange?: (value: number) => void
	min?: number
	max?: number
	disabled?: boolean
}
function Slider({ label, value, onChange, min, max, disabled }: SliderProps) {
	return <div class="transformation-input">
		{label && <label>{label}</label>}
		<NumberInput value={value.toFixed(3)} onChange={onChange} disabled={disabled} readonly={disabled} />
		<RangeInput min={min ?? -1} max={max ?? 1} step={0.01} value={value} onChange={onChange} disabled={disabled} readonly={disabled} />
	</div>
}

function formatFloat(x: number) {
	return x.toFixed(3).replace(/\.?0+$/, '') + 'f'
}

const vsMesh = `
  attribute vec4 vertPos;
  attribute vec2 texCoord;
  attribute vec3 normal;

  uniform mat4 mView;
  uniform mat4 mProj;

  varying highp vec2 vTexCoord;
  varying highp float vLighting;

  void main(void) {
    gl_Position = mProj * mView * vertPos;
    vTexCoord = texCoord;
    vLighting = normal.y * 0.2 + abs(normal.z) * 0.1 + 0.8;
  }
`

const fsMesh = `
  precision highp float;
  varying highp vec2 vTexCoord;
  varying highp float vLighting;

  uniform sampler2D sampler;

  void main(void) {
		vec4 texColor = texture2D(sampler, vTexCoord);
		gl_FragColor = vec4(texColor.xyz * vLighting, 1.0);
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
	private readonly cubeTexture: WebGLTexture
	private readonly mesh: Mesh
	private readonly grid: Mesh

	constructor(gl: WebGLRenderingContext, cubeTexture: ImageData) {
		super(gl)
		this.meshShaderProgram = new ShaderProgram(gl, vsMesh, fsMesh).getProgram()
		this.gridShaderProgram = new ShaderProgram(gl, vsGrid, fsGrid).getProgram()

		this.cubeTexture = this.createAtlasTexture(cubeTexture)

		this.mesh = new Mesh([
			new Quad( // E
				new Vertex(new Vector(1, 0, 0), [0, 0, 0], [0.25, 0.50], undefined, undefined),
				new Vertex(new Vector(1, 1, 0), [0, 0, 0], [0.25, 0.25], undefined, undefined),
				new Vertex(new Vector(1, 1, 1), [0, 0, 0], [0.00, 0.25], undefined, undefined),
				new Vertex(new Vector(1, 0, 1), [0, 0, 0], [0.00, 0.50], undefined, undefined)),
			new Quad( // W
				new Vertex(new Vector(0, 0, 1), [0, 0, 0], [0.75, 0.50], undefined, undefined),
				new Vertex(new Vector(0, 1, 1), [0, 0, 0], [0.75, 0.25], undefined, undefined),
				new Vertex(new Vector(0, 1, 0), [0, 0, 0], [0.50, 0.25], undefined, undefined),
				new Vertex(new Vector(0, 0, 0), [0, 0, 0], [0.50, 0.50], undefined, undefined)),
			new Quad( // U
				new Vertex(new Vector(0, 1, 1), [0, 0, 0], [0.25, 0.25], undefined, undefined),
				new Vertex(new Vector(1, 1, 1), [0, 0, 0], [0.50, 0.25], undefined, undefined),
				new Vertex(new Vector(1, 1, 0), [0, 0, 0], [0.50, 0.00], undefined, undefined),
				new Vertex(new Vector(0, 1, 0), [0, 0, 0], [0.25, 0.00], undefined, undefined)),
			new Quad( // D
				new Vertex(new Vector(0, 0, 0), [0, 0, 0], [0.50, 0.25], undefined, undefined),
				new Vertex(new Vector(1, 0, 0), [0, 0, 0], [0.75, 0.25], undefined, undefined),
				new Vertex(new Vector(1, 0, 1), [0, 0, 0], [0.75, 0.00], undefined, undefined),
				new Vertex(new Vector(0, 0, 1), [0, 0, 0], [0.50, 0.00], undefined, undefined)),
			new Quad( // S
				new Vertex(new Vector(0, 0, 1), [0, 0, 0], [0.25, 0.50], undefined, undefined),
				new Vertex(new Vector(1, 0, 1), [0, 0, 0], [0.50, 0.50], undefined, undefined),
				new Vertex(new Vector(1, 1, 1), [0, 0, 0], [0.50, 0.25], undefined, undefined),
				new Vertex(new Vector(0, 1, 1), [0, 0, 0], [0.25, 0.25], undefined, undefined)),
			new Quad( // N
				new Vertex(new Vector(0, 1, 0), [0, 0, 0], [0.75, 0.50], undefined, undefined),
				new Vertex(new Vector(1, 1, 0), [0, 0, 0], [1.00, 0.50], undefined, undefined),
				new Vertex(new Vector(1, 0, 0), [0, 0, 0], [1.00, 0.25], undefined, undefined),
				new Vertex(new Vector(0, 0, 0), [0, 0, 0], [0.75, 0.25], undefined, undefined)),
		])
		for (const q of this.mesh.quads) {
			const normal = q.normal()
			q.forEach(v => v.normal = normal)
		}
		this.mesh.rebuild(this.gl, { pos: true, texture: true, normal: true })

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
		this.setTexture(this.cubeTexture)
		this.prepareDraw(copy)
		this.drawMesh(this.mesh, { pos: true, texture: true, normal: true })
	}
}
