import { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Info, RefreshCw } from 'lucide-react';
import { CameraPreset } from '../../types/avatar.ts';
import { DevFallbackAvatar } from './DevFallbackAvatar.tsx';
import { AssetDocModal } from './AssetDocModal.tsx';

interface AvatarCanvasProps {
  currentGloss: string | null;
  progress: number;
  isPlaying: boolean;
  cameraPreset: CameraPreset;
  reducedMotion?: boolean;
}

const CAMERA_CONFIGS: Record<CameraPreset, { position: [number, number, number]; target: [number, number, number]; fov: number }> = {
  front: {
    position: [0, 1.45, 1.75],
    target: [0, 1.35, 0],
    fov: 42,
  },
  upper: {
    position: [0, 1.55, 1.2],
    target: [0, 1.45, 0],
    fov: 38,
  },
  hands: {
    position: [0, 1.25, 0.92],
    target: [0, 1.15, 0],
    fov: 44,
  },
};

/**
 * CameraController: Smoothly interpolates the camera between presets
 */
function CameraController({ preset, reducedMotion = false }: { preset: CameraPreset; reducedMotion?: boolean }) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    const targetConfig = CAMERA_CONFIGS[preset];
    if (reducedMotion) {
      camera.position.set(...targetConfig.position);
      camera.lookAt(...targetConfig.target);
    }
  }, [preset, camera, reducedMotion]);

  useFrame(() => {
    if (reducedMotion) return;
    const targetConfig = CAMERA_CONFIGS[preset];
    const targetPos = new THREE.Vector3(...targetConfig.position);
    camera.position.lerp(targetPos, 0.08);
  });

  return (
    <OrbitControls
      ref={controlsRef}
      target={new THREE.Vector3(...CAMERA_CONFIGS[preset].target)}
      enableDamping={!reducedMotion}
      dampingFactor={0.05}
      minDistance={0.5}
      maxDistance={3.5}
      maxPolarAngle={Math.PI / 2 + 0.1}
    />
  );
}

/**
 * LightingSetup: Three-point studio lighting + soft contact shadow plane
 */
function LightingSetup() {
  return (
    <>
      {/* Cool ambient light */}
      <ambientLight intensity={0.65} color="#e2e8f0" />

      {/* Key Light: Warm directional light from upper right */}
      <directionalLight
        position={[2.5, 3.5, 2.5]}
        intensity={1.2}
        color="#fffaf0"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-bias={-0.0001}
      />

      {/* Fill Light: Soft cool light from upper left */}
      <directionalLight position={[-2.5, 2.5, 1.5]} intensity={0.65} color="#94a3b8" />

      {/* Rim Light: Cyan backlight from behind avatar to highlight edges & hand silhouettes */}
      <directionalLight position={[0, 2.0, -2.5]} intensity={0.8} color="#06b6d4" />

      {/* Contact Shadow / Ground Plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[10, 10]} />
        <shadowMaterial opacity={0.3} />
      </mesh>
    </>
  );
}

export function AvatarCanvas({
  currentGloss,
  progress,
  isPlaying,
  cameraPreset,
  reducedMotion = false,
}: AvatarCanvasProps) {
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [hasWebGLError, setHasWebGLError] = useState(false);
  const [cameraKey, setCameraKey] = useState(0);

  const resetCamera = () => {
    setCameraKey((k) => k + 1);
  };

  if (hasWebGLError) {
    return (
      <div className="w-full h-full min-h-[380px] rounded-xl bg-[#0b0f19] border border-red-800/60 p-6 flex flex-col items-center justify-center text-center">
        <div className="text-red-400 font-semibold mb-2">3D WebGL Context Unavailable</div>
        <p className="text-xs text-gray-400 max-w-sm mb-4">
          Hardware acceleration or WebGL could not be initialized in this browser environment.
        </p>
        <button
          type="button"
          onClick={() => setHasWebGLError(false)}
          className="px-3 py-1.5 rounded bg-gray-800 text-xs text-cyan-400 hover:bg-gray-700"
        >
          Retry WebGL Initialization
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[420px] rounded-xl overflow-hidden bg-gradient-to-b from-[#0b0f19] via-[#0f172a] to-[#0b0f19] border border-gray-800 select-none shadow-2xl">
      {/* Honesty Rule 8 DEV FALLBACK Watermark & Asset Notice */}
      <div className="absolute top-3 left-3 z-20 flex flex-wrap items-center gap-2 pointer-events-auto">
        <div
          title="DEV FALLBACK AVATAR: Rendered using procedural kinematics because no verified mocap GLB is currently bundled."
          className="px-2.5 py-1 rounded-md bg-amber-950/80 border border-amber-800 text-amber-300 text-[11px] font-mono flex items-center gap-1.5 shadow-md backdrop-blur-sm"
        >
          <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
          <span>DEV FALLBACK RIG</span>
        </div>

        <button
          type="button"
          onClick={() => setIsDocModalOpen(true)}
          className="px-2.5 py-1 rounded-md bg-gray-900/80 hover:bg-gray-800 border border-gray-700 text-gray-300 hover:text-white text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer shadow-md backdrop-blur-sm"
        >
          <Info className="w-3.5 h-3.5 text-cyan-400" />
          <span>Asset Specs</span>
        </button>
      </div>

      {/* Quick Camera Preset Indicator & Reset Button */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
        <button
          type="button"
          onClick={resetCamera}
          title="Reset Camera View to Preset"
          className="p-1.5 rounded-md bg-gray-900/80 hover:bg-gray-800 border border-gray-700 text-gray-400 hover:text-white transition-colors cursor-pointer backdrop-blur-sm"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
        <span className="px-2 py-1 rounded-md bg-gray-900/80 border border-gray-700 text-[10px] text-gray-300 font-mono uppercase tracking-wider backdrop-blur-sm">
          {cameraPreset} View
        </span>
      </div>

      {/* Primary React Three Fiber Canvas */}
      <Canvas
        key={cameraKey}
        camera={{
          position: CAMERA_CONFIGS[cameraPreset].position,
          fov: CAMERA_CONFIGS[cameraPreset].fov,
        }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        onCreated={({ gl }) => {
          gl.setClearColor('#0b0f19', 1);
        }}
        onError={() => setHasWebGLError(true)}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      >
        <LightingSetup />
        <CameraController preset={cameraPreset} reducedMotion={reducedMotion} />

        {/* Avatar Rendering: Dev Fallback procedural rig */}
        <DevFallbackAvatar
          currentGloss={currentGloss}
          progress={progress}
          isPlaying={isPlaying}
          reducedMotion={reducedMotion}
        />
      </Canvas>

      {/* Overlay Status Pill when playing */}
      {isPlaying && currentGloss && (
        <div className="absolute bottom-3 left-3 z-20 pointer-events-none">
          <div className="px-3 py-1 rounded-full bg-cyan-950/90 border border-cyan-800 text-cyan-300 text-xs font-mono font-semibold flex items-center gap-2 shadow-lg backdrop-blur-sm">
            <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
            <span>SIGNING: {currentGloss}</span>
          </div>
        </div>
      )}

      {/* Asset Documentation Modal */}
      <AssetDocModal isOpen={isDocModalOpen} onClose={() => setIsDocModalOpen(false)} />
    </div>
  );
}
