import SimplexNoise from 'simplex-noise'
import { DataModel, Path } from "@mcschema/core";
import { Visualizer } from './VisualizerView';

export class BiomeNoiseVisualizer implements Visualizer {
  private noise: SimplexNoise

  constructor() {
    this.noise = new SimplexNoise()
  }

  path() {
    return new Path(['generator', 'biome_source'])
  }

  active(model: DataModel) {
    const biomeSource = new Path(['generator', 'biome_source'])
    return model.get(biomeSource) !== undefined
      && model.get(biomeSource.push('type')) === 'minecraft:multi_noise'
  }

  draw(model: DataModel, img: ImageData) {
    const biomeSource = model.get(new Path(['generator', 'biome_source']))
    const data = img.data
    for (let x = 0; x < 200; x += 1) {
      for (let y = 0; y < 100; y += 1) {
        const i = (y * (img.width * 4)) + (x * 4)
        const b = (this.noise.noise2D(x/50, y/50) > 0) ? 0 : 255
        data[i] = b
        data[i + 1] = b
        data[i + 2] = b
        data[i + 3] = 255
      }
    }
  }
}
