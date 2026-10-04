in float aSize;
in float aBrightness;
in vec3 aColor;
uniform float uPixelRatio;
uniform float uBrightness;
out vec3 vColor;
void main() {
  vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * viewPosition;
  gl_PointSize = max(1.2, aSize * uPixelRatio);
  vColor = aColor * aBrightness * uBrightness;
}
