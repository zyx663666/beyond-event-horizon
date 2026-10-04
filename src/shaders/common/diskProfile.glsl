float diskEmission(float radius, float innerRadius) {
  float x = clamp(innerRadius / radius, 0.0, 1.0);
  return pow(x, 3.0) * (1.0 - sqrt(x)) / (pow(36.0 / 49.0, 3.0) / 7.0);
}
