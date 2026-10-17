import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { Color, ShaderMaterial, UniformsLib, UniformsUtils, Vector4 } from 'three';
import { world } from '@/data';
import { BATHYMETRY, LIGHTHOUSE_ISLAND } from '../geography';
import { ATLAS } from '../palette';
import { TIDE_PERIOD } from './tide';

const vertexShader = /* glsl */ `
  #include <fog_pars_vertex>
  varying vec3 vWorld;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    vec4 mvPosition = viewMatrix * world;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const fragmentShader = /* glsl */ `
  #include <fog_pars_fragment>
  uniform vec4 uIslands[7];
  uniform vec3 uSea[6];
  uniform float uThresholds[5];
  uniform vec3 uPlate;
  uniform float uTime;
  uniform float uTidePeriod;
  varying vec3 vWorld;

  float field(vec2 p) {
    float m = 1e5;
    for (int i = 0; i < 7; i++) {
      vec4 isl = uIslands[i];
      vec2 d = (p - isl.xy) * vec2(1.0, 1.0 / 0.86);
      m = min(m, length(d) / isl.z);
    }
    return m;
  }

  void main() {
    // La marea desplaza levemente las isobatas: el mar respira con el reloj compartido.
    float tide = sin(uTime / uTidePeriod * 6.28318) * 0.035;
    float f = field(vWorld.xz) - tide;

    vec3 color = uSea[5];
    for (int i = 0; i < 5; i++) {
      if (f < uThresholds[i]) color = uSea[4 - i];
    }

    float line = 0.0;
    float w = fwidth(f) * 1.1;
    for (int i = 0; i < 5; i++) {
      line = max(line, 1.0 - smoothstep(0.0, w, abs(f - uThresholds[i])));
    }
    color = mix(color, uPlate, line * 0.24);


    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

/** Mar en franjas batimétricas con isobatas finas, como en la plancha impresa. */
export function Ocean() {
  const material = useMemo(() => {
    const islands = [
      ...world.islands.map((i) => new Vector4(i.position.x, i.position.z, i.radius, 0)),
      new Vector4(
        LIGHTHOUSE_ISLAND.position.x,
        LIGHTHOUSE_ISLAND.position.z,
        LIGHTHOUSE_ISLAND.radius,
        0,
      ),
    ];
    return new ShaderMaterial({
      vertexShader,
      fragmentShader,
      fog: true,
      uniforms: UniformsUtils.merge([
        UniformsLib.fog,
        {
          uIslands: { value: islands },
          uSea: { value: ATLAS.sea.map((c) => new Color(c)) },
          uThresholds: { value: [...BATHYMETRY] },
          uPlate: { value: new Color(ATLAS.plate) },
          uTime: { value: 0 },
          uTidePeriod: { value: TIDE_PERIOD },
        },
      ]),
    });
  }, []);

  const ref = useRef(material);
  useFrame(({ clock }) => {
    const time = ref.current.uniforms.uTime;
    if (time) time.value = clock.elapsedTime;
  });

  return (
    <mesh rotation-x={-Math.PI / 2} position-y={0} material={material}>
      <planeGeometry args={[220, 220, 1, 1]} />
    </mesh>
  );
}
