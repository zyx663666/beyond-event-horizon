out vec2 vRim;
out vec3 vWorldPosition;
void main() {
  vRim = position.xy * 1.45;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorldPosition = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
