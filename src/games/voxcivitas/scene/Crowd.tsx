import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { AdditiveBlending, Color, Matrix4, Object3D, type InstancedMesh } from 'three';
import { ATLAS } from '@/world/palette';
import { ASHEN, SKINS } from '../palette';
import { blankPose, type CrowdPose } from './crowdPose';

const ZERO = new Matrix4().makeScale(0, 0, 0);
const colors = new Map<string, Color>();
const colorOf = (hex: string): Color => {
  let c = colors.get(hex);
  if (!c) {
    c = new Color(hex);
    colors.set(hex, c);
  }
  return c;
};
const ashen = new Color(ASHEN);

/**
 * Una multitud low-poly instanciada: cuerpos, cabezas, faroles, manos alzadas
 * y halos son cinco mallas para todas las personas. `read` rellena la pose de
 * cada una en cada cuadro; quien se apaga pierde el color, se encoge y baja
 * la mirada, y quien enciende su farol lo levanta y ilumina el suelo.
 */
export function Crowd({
  count,
  read,
  still = false,
}: {
  count: number;
  read: (index: number, out: CrowdPose) => void;
  still?: boolean;
}) {
  const bodies = useRef<InstancedMesh>(null);
  const heads = useRef<InstancedMesh>(null);
  const lanterns = useRef<InstancedMesh>(null);
  const hands = useRef<InstancedMesh>(null);
  const halos = useRef<InstancedMesh>(null);
  const tools = useMemo(
    () => ({
      dummy: new Object3D(),
      local: new Matrix4(),
      out: new Matrix4(),
      pose: blankPose(),
      tint: new Color(),
    }),
    [],
  );

  useLayoutEffect(() => {
    // Piel distinta y estatura levemente distinta para cada persona, siempre la misma.
    const mesh = heads.current;
    if (!mesh) return;
    for (let i = 0; i < count; i++)
      mesh.setColorAt(i, colorOf(SKINS[i % SKINS.length] ?? '#d9a77c'));
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [count]);

  useFrame(({ clock }) => {
    const meshes = [bodies.current, heads.current, lanterns.current, hands.current, halos.current];
    const [body, head, lantern, hand, halo] = meshes;
    if (!body || !head || !lantern || !hand || !halo) return;
    const { dummy, local, out, pose, tint } = tools;
    const t = still ? 0 : clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      read(i, pose);
      const height = 0.9 + 0.1 * pose.warmth + ((i * 7) % 5) * 0.025;
      const sway = still ? 0 : Math.sin(t * 1.3 + i * 1.7) * 0.03 * pose.warmth;
      dummy.position.set(pose.x, 0.43 * height, pose.z);
      dummy.rotation.set(0, pose.rotY, sway);
      dummy.scale.set(1, height, 1);
      dummy.updateMatrix();
      body.setMatrixAt(i, dummy.matrix);
      tint.lerpColors(ashen, colorOf(pose.ink), pose.warmth);
      body.setColorAt(i, tint);

      dummy.position.set(pose.x, 0.95 * height + 0.05, pose.z);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      head.setMatrixAt(i, dummy.matrix);

      // Faroles y manos cuelgan de la pose de la persona.
      dummy.position.set(pose.x, 0, pose.z);
      dummy.rotation.set(0, pose.rotY, 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      if (pose.lit) {
        local.makeTranslation(0.3, 1.2 * height + 0.35, 0.1);
        lantern.setMatrixAt(i, out.multiplyMatrices(dummy.matrix, local));
        halo.setMatrixAt(i, out.makeRotationX(-Math.PI / 2).setPosition(pose.x, 0.04, pose.z));
      } else {
        lantern.setMatrixAt(i, ZERO);
        halo.setMatrixAt(i, ZERO);
      }
      if (pose.calling) {
        const bob = still ? 0 : Math.sin(t * 3 + i) * 0.06;
        local.makeTranslation(0.24, 1.25 * height + 0.3 + bob, 0.05);
        hand.setMatrixAt(i, out.multiplyMatrices(dummy.matrix, local));
      } else {
        hand.setMatrixAt(i, ZERO);
      }
    }
    for (const mesh of meshes) {
      if (!mesh) continue;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  });

  return (
    <group>
      <instancedMesh
        ref={bodies}
        args={[undefined, undefined, count]}
        frustumCulled={false}
        castShadow
      >
        <cylinderGeometry args={[0.17, 0.27, 0.86, 7]} />
        <meshStandardMaterial flatShading />
      </instancedMesh>
      <instancedMesh
        ref={heads}
        args={[undefined, undefined, count]}
        frustumCulled={false}
        castShadow
      >
        <icosahedronGeometry args={[0.17, 1]} />
        <meshStandardMaterial flatShading />
      </instancedMesh>
      <instancedMesh ref={lanterns} args={[undefined, undefined, count]} frustumCulled={false}>
        <icosahedronGeometry args={[0.13, 1]} />
        <meshStandardMaterial color={ATLAS.sun} emissive={ATLAS.sun} emissiveIntensity={1.6} />
      </instancedMesh>
      <instancedMesh ref={hands} args={[undefined, undefined, count]} frustumCulled={false}>
        <icosahedronGeometry args={[0.1, 1]} />
        <meshStandardMaterial color="#e8c09a" flatShading />
      </instancedMesh>
      <instancedMesh ref={halos} args={[undefined, undefined, count]} frustumCulled={false}>
        <circleGeometry args={[1.05, 20]} />
        <meshBasicMaterial
          color={ATLAS.sun}
          transparent
          opacity={0.32}
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </instancedMesh>
    </group>
  );
}
