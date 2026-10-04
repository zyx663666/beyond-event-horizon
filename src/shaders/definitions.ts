import starsVertex from './stars/stars.vert.glsl?raw';
import starsFragment from './stars/stars.frag.glsl?raw';
import diskVertex from './disk/disk.vert.glsl?raw';
import diskFragment from './disk/disk.frag.glsl?raw';
import skyVertex from './sky/sky.vert.glsl?raw';
import skyFragment from './sky/sky.frag.glsl?raw';
import noise from './common/noise.glsl?raw';
import profile from './common/diskProfile.glsl?raw';
import rimVertex from './rim/rim.vert.glsl?raw';
import rimFragment from './rim/rim.frag.glsl?raw';
import lensVertex from './lensing/lensing.vert.glsl?raw';
import lensFragment from './lensing/lensing.frag.glsl?raw';

export const shaderDefinitions = {
  lensing: { vertexShader: lensVertex, fragmentShader: lensFragment.replace("// @common-noise", noise).replace("// @disk-profile", profile) },
  stars: { vertexShader: starsVertex, fragmentShader: starsFragment },
  disk: { vertexShader: diskVertex, fragmentShader: diskFragment.replace('// @common-noise', noise).replace('// @disk-profile', profile) },
  rim: { vertexShader: rimVertex, fragmentShader: rimFragment },
  sky: { vertexShader: skyVertex, fragmentShader: skyFragment.replace('// @common-noise', noise) },
};
export type ShaderId = keyof typeof shaderDefinitions;
