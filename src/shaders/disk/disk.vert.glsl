out vec2 vDiskPosition;
void main() {
  vDiskPosition = position.xy;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
