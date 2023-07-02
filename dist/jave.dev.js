"use strict";

var canvas = document.getElementById("canvas");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
var gl = canvas.getContext('webgl');

if (!gl) {
  console.error("Unable to initialize WebGL.");
}

var time = 0.0; //************** Shader sources **************

var vertexSource = "\nattribute vec2 position;\nvoid main() {\n\tgl_Position = vec4(position, 0.0, 1.0);\n}\n";
var fragmentSource = "\nprecision highp float;\n\nuniform float width;\nuniform float height;\nvec2 resolution = vec2(width, height);\n\nuniform float time;\n\n#define POINT_COUNT 8\n\nvec2 points[POINT_COUNT];\nconst float speed = -0.5;\nconst float len = 0.25;\nfloat intensity = 1.3;\nfloat radius = 0.008;\n\n//https://www.shadertoy.com/view/MlKcDD\n//Signed distance to a quadratic bezier\nfloat sdBezier(vec2 pos, vec2 A, vec2 B, vec2 C){    \n\tvec2 a = B - A;\n\tvec2 b = A - 2.0*B + C;\n\tvec2 c = a * 2.0;\n\tvec2 d = A - pos;\n\n\tfloat kk = 1.0 / dot(b,b);\n\tfloat kx = kk * dot(a,b);\n\tfloat ky = kk * (2.0*dot(a,a)+dot(d,b)) / 3.0;\n\tfloat kz = kk * dot(d,a);      \n\n\tfloat res = 0.0;\n\n\tfloat p = ky - kx*kx;\n\tfloat p3 = p*p*p;\n\tfloat q = kx*(2.0*kx*kx - 3.0*ky) + kz;\n\tfloat h = q*q + 4.0*p3;\n\n\tif(h >= 0.0){ \n\t\th = sqrt(h);\n\t\tvec2 x = (vec2(h, -h) - q) / 2.0;\n\t\tvec2 uv = sign(x)*pow(abs(x), vec2(1.0/3.0));\n\t\tfloat t = uv.x + uv.y - kx;\n\t\tt = clamp( t, 0.0, 1.0 );\n\n\t\t// 1 root\n\t\tvec2 qos = d + (c + b*t)*t;\n\t\tres = length(qos);\n\t}else{\n\t\tfloat z = sqrt(-p);\n\t\tfloat v = acos( q/(p*z*2.0) ) / 3.0;\n\t\tfloat m = cos(v);\n\t\tfloat n = sin(v)*1.732050808;\n\t\tvec3 t = vec3(m + m, -n - m, n - m) * z - kx;\n\t\tt = clamp( t, 0.0, 1.0 );\n\n\t\t// 3 roots\n\t\tvec2 qos = d + (c + b*t.x)*t.x;\n\t\tfloat dis = dot(qos,qos);\n        \n\t\tres = dis;\n\n\t\tqos = d + (c + b*t.y)*t.y;\n\t\tdis = dot(qos,qos);\n\t\tres = min(res,dis);\n\t\t\n\t\tqos = d + (c + b*t.z)*t.z;\n\t\tdis = dot(qos,qos);\n\t\tres = min(res,dis);\n\n\t\tres = sqrt( res );\n\t}\n    \n\treturn res;\n}\n\n\n//http://mathworld.wolfram.com/HeartCurve.html\nvec2 getHeartPosition(float t){\n\treturn vec2(16.0 * sin(t) * sin(t) * sin(t),\n\t\t\t\t\t\t\t-(13.0 * cos(t) - 5.0 * cos(2.0*t)\n\t\t\t\t\t\t\t- 2.0 * cos(3.0*t) - cos(4.0*t)));\n}\n\n//https://www.shadertoy.com/view/3s3GDn\nfloat getGlow(float dist, float radius, float intensity){\n\treturn pow(radius/dist, intensity);\n}\n\nfloat getSegment(float t, vec2 pos, float offset, float scale){\n\tfor(int i = 0; i < POINT_COUNT; i++){\n\t\tpoints[i] = getHeartPosition(offset + float(i)*len + fract(speed * t) * 6.28);\n\t}\n    \n\tvec2 c = (points[0] + points[1]) / 2.0;\n\tvec2 c_prev;\n\tfloat dist = 10000.0;\n    \n\tfor(int i = 0; i < POINT_COUNT-1; i++){\n\t\t//https://tinyurl.com/y2htbwkm\n\t\tc_prev = c;\n\t\tc = (points[i] + points[i+1]) / 2.0;\n\t\tdist = min(dist, sdBezier(pos, scale * c_prev, scale * points[i], scale * c));\n\t}\n\treturn max(0.0, dist);\n}\n\nvoid main(){\n\tvec2 uv = gl_FragCoord.xy/resolution.xy;\n\tfloat widthHeightRatio = resolution.x/resolution.y;\n\tvec2 centre = vec2(0.5, 0.5);\n\tvec2 pos = centre - uv;\n\tpos.y /= widthHeightRatio;\n\t//Shift upwards to centre heart\n\tpos.y += 0.02;\n\tfloat scale = 0.000015 * height;\n\t\n\tfloat t = time;\n    \n\t//Get first segment\n  float dist = getSegment(t, pos, 0.0, scale);\n  float glow = getGlow(dist, radius, intensity);\n  \n  vec3 col = vec3(0.0);\n\n\t//White core\n  col += 10.0*vec3(smoothstep(0.003, 0.001, dist));\n  //Pink glow\n  col += glow * vec3(1.0,0.05,0.3);\n  \n  //Get second segment\n  dist = getSegment(t, pos, 3.4, scale);\n  glow = getGlow(dist, radius, intensity);\n  \n  //White core\n  col += 10.0*vec3(smoothstep(0.003, 0.001, dist));\n  //Blue glow\n  col += glow * vec3(0.1,0.4,1.0);\n        \n\t//Tone mapping\n\tcol = 1.0 - exp(-col);\n\n\t//Gamma\n\tcol = pow(col, vec3(0.4545));\n\n\t//Output to screen\n \tgl_FragColor = vec4(col,1.0);\n}\n";
window.addEventListener('resize', onWindowResize, false);

function onWindowResize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.uniform1f(widthHandle, window.innerWidth);
  gl.uniform1f(heightHandle, window.innerHeight);
}

function compileShader(shaderSource, shaderType) {
  var shader = gl.createShader(shaderType);
  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw "Shader compile failed with: " + gl.getShaderInfoLog(shader);
  }

  return shader;
}

function getAttribLocation(program, name) {
  var attributeLocation = gl.getAttribLocation(program, name);

  if (attributeLocation === -1) {
    throw 'Cannot find attribute ' + name + '.';
  }

  return attributeLocation;
}

function getUniformLocation(program, name) {
  var attributeLocation = gl.getUniformLocation(program, name);

  if (attributeLocation === -1) {
    throw 'Cannot find uniform ' + name + '.';
  }

  return attributeLocation;
}

var vertexShader = compileShader(vertexSource, gl.VERTEX_SHADER);
var fragmentShader = compileShader(fragmentSource, gl.FRAGMENT_SHADER);
var program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);
gl.useProgram(program);
var vertexData = new Float32Array([-1.0, 1.0, // top left
-1.0, -1.0, // bottom left
1.0, 1.0, // top right
1.0, -1.0 // bottom right
]);
var vertexDataBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vertexDataBuffer);
gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);
var positionHandle = getAttribLocation(program, 'position');
gl.enableVertexAttribArray(positionHandle);
gl.vertexAttribPointer(positionHandle, 2, gl.FLOAT, false, 2 * 4, 0);
var timeHandle = getUniformLocation(program, 'time');
var widthHandle = getUniformLocation(program, 'width');
var heightHandle = getUniformLocation(program, 'height');
gl.uniform1f(widthHandle, window.innerWidth);
gl.uniform1f(heightHandle, window.innerHeight);
var lastFrame = Date.now();
var thisFrame;

function draw() {
  thisFrame = Date.now();
  time += (thisFrame - lastFrame) / 1000;
  lastFrame = thisFrame;
  gl.uniform1f(timeHandle, time);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  requestAnimationFrame(draw);
}

draw();
//# sourceMappingURL=jave.dev.js.map
