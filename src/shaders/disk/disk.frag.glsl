out vec4 fragColor;
in vec2 vDiskPosition;
uniform float uTime;
uniform float uInnerRadius;
uniform float uOuterRadius;
uniform float uIntensity;
uniform float uRotationSpeed;
uniform float uBeta;
uniform float uTurbulence;
uniform vec3 uObserverLocal;
uniform vec3 uHotColor;
uniform vec3 uCoolColor;
// @common-noise
// @disk-profile
float hotSpot(float r, float a, float center, float phase, float seed) {
  float orbit = uTime * uRotationSpeed * pow(uInnerRadius / center, 1.5) + phase;
  float angularDistance = atan(sin(a - orbit), cos(a - orbit));
  float life = pow(0.5 + 0.5 * sin(uTime * 0.11 + seed), 2.0);
  return exp(-pow((r - center) / 0.17, 2.0) - pow(angularDistance / 0.24, 2.0)) * life;
}
void main() {
  float r = length(vDiskPosition);
  float radial = clamp((r - uInnerRadius) / (uOuterRadius - uInnerRadius), 0.0, 1.0);
  float angle = atan(vDiskPosition.y, vDiskPosition.x);
  float omega = uRotationSpeed * pow(uInnerRadius / max(r, uInnerRadius), 1.5);
  float a = angle - uTime * omega;
  // Rotation is encoded on a circle, so texture advection has no angular seam.
  vec3 flow = vec3(cos(a) * 3.8, sin(a) * 3.8, r * 3.2);
  float coarse = fbm(flow);
  float warpedR = r + (coarse - 0.5) * 0.3 * uTurbulence;
  float shear = a + log(r / uInnerRadius) * 4.5;
  float clouds = fbm(vec3(cos(shear) * 8.0, sin(shear) * 8.0, warpedR * 10.0));
  float phase = warpedR * 49.0 + clouds * 22.0;
  float fineAA = 1.0 - smoothstep(0.7, 3.1, fwidth(phase));
  float threads = 0.5 + 0.5 * sin(phase) * fineAA;
  float density = mix(0.65, smoothstep(0.16, 0.79, clouds), uTurbulence);
  float gaps = mix(0.38, 1.0, smoothstep(0.22, 0.65, coarse));
  float structure = (0.2 + density * 0.85 + threads * 0.37) * gaps;
  float spots = hotSpot(r, angle, uInnerRadius * 1.43, 0.4, 1.0)
              + hotSpot(r, angle, uInnerRadius * 1.88, 3.2, 3.0) * 0.7
              + hotSpot(r, angle, uInnerRadius * 2.45, 5.1, 5.0) * 0.4;
  float flux = diskEmission(r, uInnerRadius);
  // Straight-ray SR-inspired beaming, excluding gravity and curved light paths.
  vec3 velocityDirection = vec3(-sin(angle), cos(angle), 0.0);
  vec3 viewDirection = normalize(uObserverLocal - vec3(vDiskPosition, 0.0));
  float beta = uBeta * sqrt(uInnerRadius / max(r, uInnerRadius));
  float doppler = sqrt(1.0 - beta * beta) / max(0.2, 1.0 - beta * dot(velocityDirection, viewDirection));
  float beaming = pow(doppler, 3.0);
  float warmth = clamp(pow(radial, 0.6) - (doppler - 1.0) * 0.2, 0.0, 1.0);
  vec3 temperature = mix(uHotColor, uCoolColor, warmth);
  float edge = smoothstep(0.0, 0.024, radial) * (1.0 - smoothstep(0.7, 1.0, radial));
  vec3 radiance = temperature * uIntensity * flux * (structure + spots * 0.45) * beaming;
  fragColor = vec4(radiance, edge);
}
