in vec2 vRim;
in vec3 vWorldPosition;
out vec4 fragColor;
uniform float uIntensity;
uniform float uWidth;
uniform float uHalo;
uniform vec3 uColor;
uniform vec3 uDiskNormal;
uniform float uDiskHeight;
uniform float uInnerRadius;
uniform float uOuterRadius;
void main() {
  float r = length(vRim);
  float aa = max(fwidth(r), 0.0005);
  float width = max(uWidth, aa);
  float exterior = smoothstep(1.0, 1.0 + aa, r);
  float rim = exp(-pow((r - 1.012) / width, 2.0)) * (uWidth / width);
  float halo = exp(-max(r - 1.0, 0.0) * 17.0) * uHalo;
  float angle = atan(vRim.y, vRim.x);
  float direction = 0.64 + 0.36 * cos(angle - 2.1);
  float echo = exp(-pow((r - 1.065) / max(0.007, aa), 2.0)) * 0.1 * smoothstep(-0.2, 0.6, sin(angle));
  // Straight-ray occlusion by the foreground disk. No ray bending is performed.
  vec3 ray = normalize(vWorldPosition - cameraPosition);
  float denominator = dot(ray, uDiskNormal);
  float visibility = 1.0;
  if (abs(denominator) > 0.0001) {
    float t = (uDiskHeight - dot(cameraPosition, uDiskNormal)) / denominator;
    vec3 hit = cameraPosition + ray * t;
    float diskR = length(hit - uDiskNormal * dot(hit, uDiskNormal));
    if (t > 0.0 && t < length(vWorldPosition - cameraPosition)) {
      float mask = smoothstep(uInnerRadius, uInnerRadius + 0.06, diskR) * (1.0 - smoothstep(uOuterRadius * 0.8, uOuterRadius, diskR));
      visibility = 1.0 - mask;
    }
  }
  float light = (rim + halo + echo) * exterior * direction * visibility;
  fragColor = vec4(uColor * light * uIntensity, 1.0);
}
