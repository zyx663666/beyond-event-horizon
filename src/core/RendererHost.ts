import { ACESFilmicToneMapping, SRGBColorSpace, Vector2, WebGLRenderer } from 'three';
import type { VisualConfig } from '../app/config';
import { ui } from '../content/uiText';

export class RendererHost {
  readonly renderer: WebGLRenderer;
  readonly gpuName: string;
  readonly hdr: boolean;
  shaderErrors = 0;
  contextLost = false;
  width = 1;
  height = 1;
  pixelRatio = 1;
  readonly drawingSize = new Vector2();
  private readonly onLost: (event: Event) => void;
  private readonly onRestored: () => void;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly config: VisualConfig,
    report: (message: string) => void,
    recover: () => void,
  ) {
    // Keep normal browser compositing for the DOM telemetry above the opaque scene.
    const gl = canvas.getContext('webgl2', { alpha: true, antialias: false, powerPreference: 'high-performance' });
    if (!gl) throw new Error(ui.webglUnavailable);
    const debug = gl.getExtension('WEBGL_debug_renderer_info');
    this.gpuName = debug ? String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)) : String(gl.getParameter(gl.RENDERER));
    this.hdr = Boolean(gl.getExtension('EXT_color_buffer_float'));
    this.renderer = new WebGLRenderer({ canvas, context: gl, antialias: false });
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = config.output.exposure;
    this.renderer.setClearColor(0x000000, 1);
    this.renderer.info.autoReset = false;
    this.renderer.debug.onShaderError = (context, program, vertex, fragment) => {
      this.shaderErrors++;
      report('着色器编译失败 / SHADER COMPILATION FAILED');
      console.error('[BEH shader]', context.getProgramInfoLog(program), context.getShaderInfoLog(vertex), context.getShaderInfoLog(fragment));
      console.error(context.getShaderSource(vertex), context.getShaderSource(fragment));
    };
    this.onLost = event => {
      event.preventDefault();
      this.contextLost = true;
      report('成像链路恢复中 / RESTORING WEBGL CONTEXT');
    };
    this.onRestored = () => { this.contextLost = false; recover(); };
    canvas.addEventListener('webglcontextlost', this.onLost);
    canvas.addEventListener('webglcontextrestored', this.onRestored);
    this.resize();
  }

  resize(): void {
    this.width = Math.max(1, this.canvas.clientWidth || window.innerWidth);
    this.height = Math.max(1, this.canvas.clientHeight || window.innerHeight);
    const q = this.config.quality;
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, q.maxPixelRatio, q.maxWidth / this.width, q.maxHeight / this.height);
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.setSize(this.width, this.height, false);
    this.renderer.getDrawingBufferSize(this.drawingSize);
  }
  dispose(): void {
    this.canvas.removeEventListener('webglcontextlost', this.onLost);
    this.canvas.removeEventListener('webglcontextrestored', this.onRestored);
    this.renderer.dispose();
  }
}
