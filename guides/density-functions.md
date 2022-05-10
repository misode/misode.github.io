---
title: How the noise router and density functions work
versions:
  - '1.18.2'
  - '1.19'
tags:
  - worldgen
  - noise
---

[Density functions](/worldgen/density-function/) are used by the dimension generator to generate the terrain. They make up mathematical expressions that decide whether or not a block should be solid terrain.

## Noise router
The noise router is a piece of configuration in [noise settings](/worldgen/noise-settings/). It's a collection of density functions, some used for the biome layout, aquifers, or ore veins. The one that decides the terrain is **`final_density`**. This density function will be computed for every block position. If it returns a value greater than `0` the default block will be placed, otherwise either air or the default fluid will be placed.

With this information we can make the most basic noise router, one where every density function is set to `0`. As predicted, this will result in a void world. Similarly, setting `"final_density": 1` will result in a world completely filled with stone.

**`data/minecraft/worldgen/noise_settings/overworld.json`**
```json
{
  "sea_level": 0,
  "disable_mob_generation": false,
  "aquifers_enabled": false,
  "ore_veins_enabled": false,
  "legacy_random_source": false,
  "default_block": {
    "Name": "minecraft:stone"
  },
  "default_fluid": {
    "Name": "minecraft:water",
    "Properties": {
      "level": "0"
    }
  },
  "noise": {
    "min_y": 0,
    "height": 256,
    "size_horizontal": 2,
    "size_vertical": 2
  },
  "noise_router": {
    "barrier": 0,
    "fluid_level_floodedness": 0,
    "fluid_level_spread": 0,
    "lava": 0,
    "temperature": 0,
    "vegetation": 0,
    "continents": 0,
    "erosion": 0,
    "depth": 0,
    "ridges": 0,
    "initial_density_without_jaggedness": 0,
    "final_density": 0,
    "vein_toggle": 0,
    "vein_ridged": 0,
    "vein_gap": 0
  },
  "spawn_target": [],
  "surface_rule": {
    "type": "minecraft:sequence",
    "sequence": []
  }
}
```

## Density function files
In the above example all the density functions are constant numbers, but they don't have to be. Another option is to reference a density function file. Vanilla has some builtin density functions, for example:

```json
"final_density": "minecraft:overworld/base_3d_noise"
```

You can create your own density functions in the `worldgen/density_function` folder.

## Complex density functions
All the other density function types are defined as an object with a `"type"` field and optionally more fields. For example:
```json
{
  "type": "minecraft:noise",
  "noise": "minecraft:cave_entrance",
  "xz_scale": 0.75,
  "y_scale": 0.5
}
```
<br/>
The following is a list of all density functions in {#version#}

### `abs`
Calculates the absolute value of another density function.
* `argument`: The input density function

### `add`
Adds two density functions together.
* `argument1`: The first density function
* `argument2`: The second density function

### `beardifier`
Adds beards for structures (see the `terrain_adaptation` field).

*This density function has no extra fields*

### `blend_alpha`

*This density function has no extra fields*

### `blend_density`
* `argument`: The input density function

### `blend_offset`

*This density function has no extra fields*

### `cache_2d`
Only computes the input density once for each column, at Y=0
* `argument`: The input density function

### `cache_all_in_cell`
Used in combination with [`interpolated`](#interpolated).
* `argument`: The input density function

### `cache_once`
If this density function is referenced twice, it is only computed once per block position.
* `argument`: The input density function

### `clamp`
Clamps the input between two values.
* `input`: The input density function
* `min`: The lower bound
* `max`: The upper bound

### `constant`
A constant value. `{"type": "constant", "argument": 2}` is equivalent to `2`.
* `argument`: The constant number

### `cube`
Cubes the input. (`x^3`)
* `argument`: The input density function

### `end_islands`

*This density function has no extra fields*

### `flat_cache`
Similar to [`cache_2d`](#cache_2d) in that it only computes the input once for each column, but now at the first Y value that is requested.

### `half_negative`
If the input is negative, returns half of the input. Otherwise returns the input. (`x < 0 ? x/2 : x`)
* `argument`: The input density function

### `interpolated`
Computes the input density at each of the 8 corners of a cell and interpolates between them. The size of a cell if determined by `size_horizontal * 4` and `size_vertical * 4`.
* `argument`: The input density function

### `max`
Returns the maximum of two density functions.
* `argument1`: The first density function
* `argument2`: The second density function

### `min`
Returns the minimum of two density functions.
* `argument1`: The first density function
* `argument2`: The second density function

### `mul`
Multiplies two density functions.
* `argument1`: The first density function
* `argument2`: The second density function

### `noise`
The noise density function samples a noise.
* `noise`: A reference to a `worldgen/noise` file
* `xz_scale`: Scales the X and Z inputs before sampling
* `y_scale`: Scales the Y input before sampling

### `old_blended_noise`
Uses a different kind of noise than [`noise`](#noise).
* `xz_scale`
* `y_scale`
* `xz_factor`
* `y_factor`
* `smear_scale_multiplier`

### `quarter_negative`
If the input is negative, returns a quarter of the input. Otherwise returns the input. (`x < 0 ? x/4 : x`)
* `argument`: The input density function

### `range_choice`
Computes the input value, and depending on that result returns one of two other density functions.
* `input`: The input density function
* `min_inclusive`: The lower bound of the range
* `max_exclusive`: The upper bound of the range
* `when_in_range`: Density function that will be returned when the input is inside the range
* `when_out_of_range`: Density function that will be returned When the input is outside the range

### `shift`
Computes the input density at `(x/4, y/4, z/4)`.
* `argument`: The input density function

### `shift_a`
Computes the input density at `(x/4, 0, z/4)`.
* `argument`: The input density function

### `shift_b`
Computes the input density at `(z/4, x/4, 0)`.
* `argument`: The input density function

### `shifted_noise`
Similar to [`noise`](#noise), but first shifts the input coordinates.
* `noise`: A reference to a `worldgen/noise` file
* `xz_scale`: Scales the X and Z inputs before sampling
* `y_scale`: Scales the Y input before sampling
* `shift_x`: Density function used to offset the X input
* `shift_y`: Density function used to offset the Y input
* `shift_z`: Density function used to offset the Z input

### `spline`
Computes a spline. More information about splines will follow in a future guide.
* `spline`: The spline, can be either a number or an object:
  * `coordinate`: The density function that will be used for the locations
  * `points`: List of points of the cubic spline, cannot be empty
    * `location`: Input value
    * `value`: Output value, can be either a number or a spline object
    * `derivative`: The slope at this point
{#[1.18.2]
* `min_value`: The minimum output value of the spline
* `max_value`: The maximum output value of the spline
#}

### `square`
Squares the input. (`x^2`)
* `argument`: The input density function

### `squeeze`
First clamps the input between `-1` and `1`, then transforms it using `x/2 - x*x*x/24`.
* `argument`: The input density function

{#[1.18.2]
### `terrain_shaper_spline`
Computes a terrain shaper spline from the noise settings.
* `spline`: The terrain shaper spline to use. One of `offset`, `factor`, or `jaggedness`
* `min_value`: The minimum output value of the spline
* `max_value`: The maximum output value of the spline
* `continentalness`: The density function to use for the `continents` spline coordinate
* `erosion`: The density function to use for the `erosion` spline coordinate
* `weirdness`: The density function to use for the `weirdness` spline coordinate
#}

### `weird_scaled_sampler`
* `rarity_value_mapper`: One of `type_1` or `type_2`
* `noise`: A reference to a `worldgen/noise` file 
* `input`: The input density function

### `y_clamped_gradient`
Returns the Y position after mapping it to a range.
* `from_y`
* `to_y`
* `from_value`: The value to map `from_y` to
* `to_value`: The value to map `to_y` to
