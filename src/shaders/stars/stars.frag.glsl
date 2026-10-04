out vec4 fragColor;
in vec3 vColor;
void main() {
  float r = length(gl_PointCoord - 0.5) * 2.0;
  if (r > 1.0) discard;
  float core = exp(-r * r * 12.0);
  float halo = exp(-r * r * 4.0) * 0.12;
  fragColor = vec4(vColor * (core + halo), 1.0);
}
