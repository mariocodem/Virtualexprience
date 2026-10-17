import { AdaptiveDpr, View } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';

/**
 * Un solo contexto WebGL para toda la landing: cada sección con relieve
 * declara una <View> y aquí se pintan todas, recortadas a su caja.
 */
export default function LandingCanvas() {
  return (
    <Canvas
      shadows
      flat
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      eventSource={document.body}
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}
      aria-hidden="true"
    >
      <View.Port />
      <AdaptiveDpr />
    </Canvas>
  );
}
