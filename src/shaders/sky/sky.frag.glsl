out vec4 fragColor;
in vec3 vDirection;
uniform float uGalaxyIntensity;
// @common-noise
void main() {
  vec3 d = normalize(vDirection);
  float latitude = dot(d, normalize(vec3(0.35, 0.85, 0.38)));
  float cloud = fbm(d * 7.0);
  float band = exp(-pow((latitude + (cloud - 0.5) * 0.2) * 6.0, 2.0));
  float dust = smoothstep(0.3, 0.72, fbm(d * 21.0 + 8.0));
  vec3 color = mix(vec3(0.16, 0.23, 0.36), vec3(0.58, 0.4, 0.29), cloud);
  fragColor = vec4(vec3(0.0003, 0.00045, 0.0009) + color * band * dust * uGalaxyIntensity, 1.0);
}
