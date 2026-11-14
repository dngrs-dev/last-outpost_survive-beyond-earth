import { radians, type MoonView } from './moonProjection';

// A ray/sphere intersection gives a real 3D surface without a rendering dependency.
// Texture coordinates are east-positive, with the NASA equirectangular map's 0° at center.
const VERTEX = `attribute vec2 position; varying vec2 uv;
void main(){ uv=position; gl_Position=vec4(position,0.0,1.0); }`;
const FRAGMENT = `precision mediump float;
varying vec2 uv; uniform sampler2D surface; uniform vec2 angles; uniform float zoom;
const float PI=3.14159265359;
void main(){
  vec2 p=uv/(0.84*zoom);
  float rr=dot(p,p);
  if(rr>1.0) discard;
  vec3 n=vec3(p,sqrt(1.0-rr));
  float cy=cos(angles.x),sy=sin(angles.x),cp=cos(angles.y),sp=sin(angles.y);
  float y=cp*n.y+sp*n.z; float z=-sp*n.y+cp*n.z;
  vec3 world=vec3(cy*n.x+sy*z,y,-sy*n.x+cy*z);
  vec2 map=vec2(atan(world.x,world.z)/(2.0*PI)+0.5,asin(clamp(world.y,-1.0,1.0))/PI+0.5);
  vec3 color=texture2D(surface,map).rgb;
  float light=0.14+0.94*max(dot(n,normalize(vec3(-0.5,0.35,1.0))),0.0);
  float edge=smoothstep(0.0,0.025,n.z);
  gl_FragColor=vec4(color*light,edge);
}`;

export function createMoonRenderer(canvas: HTMLCanvasElement, image: HTMLImageElement) {
  const gl = canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: false });
  if (!gl) throw new Error('WebGL is unavailable');
  const compile = (kind: number, source: string) => {
    const shader = gl.createShader(kind);
    if (!shader) throw new Error('Shader allocation failed');
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      throw new Error('Moon shader compilation failed');
    }
    return shader;
  };
  const vertex = compile(gl.VERTEX_SHADER, VERTEX);
  const fragment = compile(gl.FRAGMENT_SHADER, FRAGMENT);
  const program = gl.createProgram();
  if (!program) throw new Error('Program allocation failed');
  gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Moon renderer linking failed');
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const angles = gl.getUniformLocation(program, 'angles');
  const zoom = gl.getUniformLocation(program, 'zoom');
  return {
    draw(view: MoonView, pixels: number) {
      canvas.width = canvas.height = pixels;
      gl.viewport(0, 0, pixels, pixels);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      gl.uniform2f(angles, radians(view.longitude), radians(view.latitude));
      gl.uniform1f(zoom, view.zoom);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
    dispose() {
      gl.deleteTexture(texture); gl.deleteBuffer(buffer);
      gl.deleteProgram(program); gl.deleteShader(vertex); gl.deleteShader(fragment);
    },
  };
}
