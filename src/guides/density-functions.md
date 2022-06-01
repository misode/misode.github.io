---
title: Density function types and their configuration
versions:
  - '1.18.2'
  - '1.19'
tags:
  - worldgen
  - noise
  - density
---

[Density functions](/worldgen/density-function/) are used by the dimension generator to generate the terrain. They make up mathematical expressions that decide whether or not a block should be solid terrain. 

## Density functions
There are 3 ways to specify a density function. The first is simply as a constant number. The density function will always return that value
```json
0.58
```

Another option is to reference a density function file. Vanilla has some builtin density functions, but you can create your own density functions in the `worldgen/density_function` folder.
```json
"minecraft:overworld/base_3d_noise"
```

All the other density function types are defined as an object with a f`type` field and optionally more fields.
```json
{
  "type": "minecraft:noise",
  "noise": "minecraft:cave_entrance",
  "xz_scale": 0.75,
  "y_scale": 0.5
}
```

## Types

### `abs`
Calculates the absolute value of another density function.
* f`argument`: The input density function

### `add`
Adds two density functions together.
* f`argument1`: The first density function
* f`argument2`: The second density function

### `beardifier`
Adds beards for structures ({#[1.18.2] see the f`adapt_noise` field in [structures](/worldgen/structure-feature/) #}{#[1.19] see the f`terrain_adaptation` field in [structures](/worldgen/structure/) #}).

*This density function has no extra fields*

### `blend_alpha`

*This density function has no extra fields*

### `blend_density`
* f`argument`: The input density function

### `blend_offset`

*This density function has no extra fields*

### `cache_2d`
Only computes the input density once for each column, at Y=0
* f`argument`: The input density function

### `cache_all_in_cell`
Used in combination with [`interpolated`](#interpolated).
* f`argument`: The input density function

### `cache_once`
If this density function is referenced twice, it is only computed once per block position.
* f`argument`: The input density function

### `clamp`
Clamps the input between two values.
* f`input`: The input density function
* f`min`: The lower bound
* f`max`: The upper bound

### `constant`
A constant value. j`{"type": "constant", "argument": 2}` is equivalent to n`2`.
* f`argument`: The constant number

### `cube`
Cubes the input. (`x^3`)
* f`argument`: The input density function

### `end_islands`

*This density function has no extra fields*

### `flat_cache`
Similar to [`cache_2d`](#cache_2d) in that it only computes the input once for each column, but now at the first Y value that is requested.

### `half_negative`
If the input is negative, returns half of the input. Otherwise returns the input. (`x < 0 ? x/2 : x`)
* f`argument`: The input density function

### `interpolated`
Computes the input density at each of the 8 corners of a cell and interpolates between them. The size of a cell if determined by `size_horizontal * 4` and `size_vertical * 4`.
* f`argument`: The input density function

### `max`
Returns the maximum of two density functions.
* f`argument1`: The first density function
* f`argument2`: The second density function

### `min`
Returns the minimum of two density functions.
* f`argument1`: The first density function
* f`argument2`: The second density function

### `mul`
Multiplies two density functions.
* f`argument1`: The first density function
* f`argument2`: The second density function

### `noise`
The noise density function samples a [noise](/worldgen/noise/).
* f`noise`: A reference to a `worldgen/noise` file
* f`xz_scale`: Scales the X and Z inputs before sampling
* f`y_scale`: Scales the Y input before sampling

### `old_blended_noise`
Uses a different kind of noise than [`noise`](#noise).
* f`xz_scale`
* f`y_scale`
* f`xz_factor`
* f`y_factor`
* f`smear_scale_multiplier`

### `quarter_negative`
If the input is negative, returns a quarter of the input. Otherwise returns the input. (`x < 0 ? x/4 : x`)
* f`argument`: The input density function

### `range_choice`
Computes the input value, and depending on that result returns one of two other density functions. Basically an if-then-else statement.
* f`input`: The input density function
* f`min_inclusive`: The lower bound of the range
* f`max_exclusive`: The upper bound of the range
* f`when_in_range`: Density function that will be returned when the input is inside the range
* f`when_out_of_range`: Density function that will be returned When the input is outside the range

### `shift`
Samples a noise at `(x/4, y/4, z/4)`.
* f`argument`: A reference to a `worldgen/noise` file

### `shift_a`
Samples a noise at `(x/4, 0, z/4)`.
* f`argument`: A reference to a `worldgen/noise` file

### `shift_b`
Samples a noise at `(z/4, x/4, 0)`.
* f`argument`: A reference to a `worldgen/noise` file

### `shifted_noise`
Similar to [`noise`](#noise), but first shifts the input coordinates.
* f`noise`: A reference to a `worldgen/noise` file
* f`xz_scale`: Scales the X and Z inputs before sampling
* f`y_scale`: Scales the Y input before sampling
* f`shift_x`: Density function used to offset the X input
* f`shift_y`: Density function used to offset the Y input
* f`shift_z`: Density function used to offset the Z input

### `spline`
Computes a spline. More information about splines will follow in a future guide.
* f`spline`: The spline, can be either a number or an object:
  * f`coordinate`: The density function that will be used for the locations
  * f`points`: List of points of the cubic spline, cannot be empty
    * f`location`: Input value
    * f`value`: Output value, can be either a number or a spline object
    * f`derivative`: The slope at this point
{#[1.18.2]
* f`min_value`: The minimum output value of the spline
* f`max_value`: The maximum output value of the spline
#}

### `square`
Squares the input. (`x^2`)
* f`argument`: The input density function

### `squeeze`
First clamps the input between `-1` and `1`, then transforms it using `x/2 - x*x*x/24`.
* f`argument`: The input density function

{#[1.18.2]
### `terrain_shaper_spline`
Computes a terrain shaper spline from the noise settings.
* f`spline`: The terrain shaper spline to use. One of s`offset`, s`factor`, or s`jaggedness`
* f`min_value`: The minimum output value of the spline
* f`max_value`: The maximum output value of the spline
* f`continentalness`: The density function to use for the s`continents` spline coordinate
* f`erosion`: The density function to use for the s`erosion` spline coordinate
* f`weirdness`: The density function to use for the s`weirdness` spline coordinate
#}

### `weird_scaled_sampler`
* f`rarity_value_mapper`: One of s`type_1` or s`type_2`
* f`noise`: A reference to a `worldgen/noise` file 
* f`input`: The input density function

### `y_clamped_gradient`
Returns the Y position after mapping it to a range.
* f`from_y`
* f`to_y`
* f`from_value`: The value to map f`from_y` to
* f`to_value`: The value to map f`to_y` to
