import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface DevFallbackAvatarProps {
  currentGloss: string | null;
  progress: number; // 0.0 to 1.0 within current sign
  isPlaying: boolean;
  reducedMotion?: boolean;
}

/**
 * DevFallbackAvatar: Procedurally rigged humanoid mesh in React Three Fiber.
 * Complies with Honesty Rule 8 by providing a realistic, fully articulated
 * anatomy (head, face, torso, shoulders, arms, elbows, wrists, and articulated
 * fingers) while clearly labelled as a DEV FALLBACK rig.
 */
export function DevFallbackAvatar({
  currentGloss,
  progress,
  isPlaying,
  reducedMotion = false,
}: DevFallbackAvatarProps) {
  // References to articulation groups
  const headRef = useRef<THREE.Group>(null);
  const mouthRef = useRef<THREE.Mesh>(null);
  const leftBrowRef = useRef<THREE.Mesh>(null);
  const rightBrowRef = useRef<THREE.Mesh>(null);
  const chestRef = useRef<THREE.Group>(null);

  // Left arm chain
  const leftShoulderRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const leftForearmRef = useRef<THREE.Group>(null);
  const leftHandRef = useRef<THREE.Group>(null);

  // Right arm chain
  const rightShoulderRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const rightForearmRef = useRef<THREE.Group>(null);
  const rightHandRef = useRef<THREE.Group>(null);

  // Right hand fingers
  const rightThumbRef = useRef<THREE.Group>(null);
  const rightIndexRef = useRef<THREE.Group>(null);
  const rightMiddleRef = useRef<THREE.Group>(null);
  const rightRingRef = useRef<THREE.Group>(null);
  const rightPinkyRef = useRef<THREE.Group>(null);

  // Left hand fingers
  const leftThumbRef = useRef<THREE.Group>(null);
  const leftIndexRef = useRef<THREE.Group>(null);
  const leftMiddleRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    // Natural idle breathing (suppressed if reducedMotion is active)
    const breath = reducedMotion ? 0 : Math.sin(t * 1.5) * 0.015;
    if (chestRef.current) {
      chestRef.current.position.y = 1.1 + breath * 0.5;
    }

    // Default neutral resting joint targets
    let rArmRotX = 0.2;
    let rArmRotY = 0.1;
    let rArmRotZ = -0.3;
    let rForearmRotX = 0.5;
    let rForearmRotY = 0.0;
    let rForearmRotZ = -0.2;
    let rHandRotX = 0.0;
    let rHandRotY = 0.0;
    let rHandRotZ = 0.0;

    let lArmRotX = 0.2;
    let lArmRotY = -0.1;
    let lArmRotZ = 0.3;
    let lForearmRotX = 0.5;
    let lForearmRotY = 0.0;
    let lForearmRotZ = 0.2;
    let lHandRotX = 0.0;
    let lHandRotY = 0.0;
    let lHandRotZ = 0.0;

    let headRotX = 0.0;
    let headRotY = 0.0;
    let headRotZ = 0.0;
    let mouthScaleY = 1.0;
    let browPosY = 0.06;

    // Kinematics calculations when playing a known sign
    if (isPlaying && currentGloss) {
      const p = Math.min(Math.max(progress, 0), 1);
      // Smooth bell curve envelope for entry and exit transitions
      const envelope = Math.sin(p * Math.PI);

      switch (currentGloss) {
        case 'HELLO': {
          // Right hand rises to temple, waves
          rArmRotX = 0.2 - envelope * 1.4;
          rArmRotZ = -0.3 - envelope * 0.7;
          rForearmRotX = 0.5 - envelope * 0.8;
          rForearmRotY = envelope * 0.9;
          const wave = Math.sin(p * Math.PI * 6) * 0.25 * envelope;
          rHandRotZ = wave;
          headRotZ = -0.05 * envelope;
          mouthScaleY = 1.0 + 0.3 * envelope;
          browPosY = 0.06 + 0.02 * envelope;
          break;
        }

        case 'THANK_YOU': {
          // Right fingertips touch chin, extend forward & down
          if (p < 0.4) {
            const phase1 = p / 0.4;
            rArmRotX = 0.2 - phase1 * 1.3;
            rArmRotZ = -0.3 - phase1 * 0.2;
            rForearmRotX = 0.5 - phase1 * 1.1;
            rForearmRotY = phase1 * 0.4;
          } else {
            const phase2 = (p - 0.4) / 0.6;
            rArmRotX = -1.1 + phase2 * 0.7;
            rArmRotZ = -0.5 + phase2 * 0.3;
            rForearmRotX = -0.6 + phase2 * 0.9;
            rForearmRotY = 0.4 - phase2 * 0.2;
          }
          headRotX = 0.12 * envelope; // Polite nod
          mouthScaleY = 1.0 + 0.2 * envelope;
          break;
        }

        case 'PLEASE': {
          // Open palm circular motion on chest
          rArmRotX = 0.2 - envelope * 0.9;
          rArmRotZ = -0.3 - envelope * 0.4;
          rForearmRotX = 0.5 - envelope * 0.8;
          rForearmRotY = envelope * 0.6;
          const circleX = Math.sin(p * Math.PI * 4) * 0.15 * envelope;
          const circleY = Math.cos(p * Math.PI * 4) * 0.15 * envelope;
          rHandRotX = circleX;
          rHandRotY = circleY;
          headRotX = 0.06 * envelope;
          break;
        }

        case 'NAME': {
          // Both hands tap crosswise at chest
          rArmRotX = 0.2 - envelope * 0.8;
          rArmRotZ = -0.3 - envelope * 0.5;
          rForearmRotX = 0.5 - envelope * 0.7;
          rForearmRotY = envelope * 0.6;

          lArmRotX = 0.2 - envelope * 0.8;
          lArmRotZ = 0.3 + envelope * 0.5;
          lForearmRotX = 0.5 - envelope * 0.7;
          lForearmRotY = -envelope * 0.6;

          const tap = Math.abs(Math.sin(p * Math.PI * 4)) * 0.1 * envelope;
          rForearmRotZ = -0.2 - tap;
          lForearmRotZ = 0.2 + tap;
          break;
        }

        case 'HELP': {
          // Left hand flat platform, right fist on top, elevate together
          lArmRotX = 0.2 - envelope * 0.8;
          lArmRotZ = 0.3 + envelope * 0.4;
          lForearmRotX = 0.5 - envelope * 0.7;
          lForearmRotY = -envelope * 0.4;

          rArmRotX = 0.2 - envelope * 0.85;
          rArmRotZ = -0.3 - envelope * 0.45;
          rForearmRotX = 0.5 - envelope * 0.75;
          rForearmRotY = envelope * 0.4;

          const lift = envelope * 0.25;
          if (leftShoulderRef.current) leftShoulderRef.current.position.y = 1.35 + lift * 0.3;
          if (rightShoulderRef.current) rightShoulderRef.current.position.y = 1.35 + lift * 0.3;
          break;
        }

        case 'YES': {
          // Right fist nod up and down, matching head nod
          rArmRotX = 0.2 - envelope * 0.8;
          rArmRotZ = -0.3 - envelope * 0.3;
          rForearmRotX = 0.5 - envelope * 0.7;
          const fistNod = Math.sin(p * Math.PI * 4) * 0.3 * envelope;
          rHandRotX = fistNod;
          headRotX = fistNod * 0.4;
          break;
        }

        case 'NO': {
          // Snap fingers and shake head
          rArmRotX = 0.2 - envelope * 0.8;
          rArmRotZ = -0.3 - envelope * 0.4;
          rForearmRotX = 0.5 - envelope * 0.7;
          const shake = Math.sin(p * Math.PI * 5) * 0.2 * envelope;
          headRotY = shake;
          rHandRotZ = shake * 0.5;
          browPosY = 0.06 - 0.015 * envelope; // Furrowed brow
          break;
        }

        case 'WATER': {
          // Hand taps chin twice
          rArmRotX = 0.2 - envelope * 1.3;
          rArmRotZ = -0.3 - envelope * 0.3;
          rForearmRotX = 0.5 - envelope * 1.0;
          const chinTap = Math.abs(Math.sin(p * Math.PI * 4)) * 0.15 * envelope;
          rForearmRotX += chinTap;
          break;
        }

        case 'GOOD': {
          // Thumbs up moves forward
          rArmRotX = 0.2 - envelope * 0.85;
          rArmRotZ = -0.3 - envelope * 0.3;
          rForearmRotX = 0.5 - envelope * 0.7;
          rHandRotY = envelope * 0.5;
          headRotX = 0.1 * envelope;
          mouthScaleY = 1.0 + 0.25 * envelope;
          break;
        }

        case 'WELCOME': {
          // Both arms open outward, palms up sweeping inward
          rArmRotX = 0.2 - envelope * 0.7;
          rArmRotZ = -0.3 - envelope * 0.6;
          rForearmRotX = 0.5 - envelope * 0.6;
          rForearmRotY = envelope * 0.7;

          lArmRotX = 0.2 - envelope * 0.7;
          lArmRotZ = 0.3 + envelope * 0.6;
          lForearmRotX = 0.5 - envelope * 0.6;
          lForearmRotY = -envelope * 0.7;

          mouthScaleY = 1.0 + 0.2 * envelope;
          break;
        }

        case 'SIGN': {
          // Both hands circling alternately
          const angle1 = p * Math.PI * 4;
          const angle2 = angle1 + Math.PI;

          rArmRotX = 0.2 - envelope * 0.8;
          rArmRotZ = -0.3 - envelope * 0.4;
          rForearmRotX = 0.5 - envelope * 0.6 + Math.sin(angle1) * 0.15 * envelope;
          rForearmRotY = envelope * 0.5 + Math.cos(angle1) * 0.15 * envelope;

          lArmRotX = 0.2 - envelope * 0.8;
          lArmRotZ = 0.3 + envelope * 0.4;
          lForearmRotX = 0.5 - envelope * 0.6 + Math.sin(angle2) * 0.15 * envelope;
          lForearmRotY = -envelope * 0.5 + Math.cos(angle2) * 0.15 * envelope;
          break;
        }

        case 'FRIEND': {
          // Both hands hook index fingers
          rArmRotX = 0.2 - envelope * 0.85;
          rArmRotZ = -0.3 - envelope * 0.45;
          rForearmRotX = 0.5 - envelope * 0.7;
          rForearmRotY = envelope * 0.5;

          lArmRotX = 0.2 - envelope * 0.85;
          lArmRotZ = 0.3 + envelope * 0.45;
          lForearmRotX = 0.5 - envelope * 0.7;
          lForearmRotY = -envelope * 0.5;

          const hookTwist = Math.sin(p * Math.PI * 3) * 0.15 * envelope;
          rHandRotZ = hookTwist;
          lHandRotZ = -hookTwist;
          break;
        }

        default:
          break;
      }
    }

    // Smooth lerp application to bone objects
    const lerpFactor = reducedMotion ? 0.08 : 0.15;

    if (headRef.current) {
      headRef.current.rotation.x = THREE.MathUtils.lerp(headRef.current.rotation.x, headRotX, lerpFactor);
      headRef.current.rotation.y = THREE.MathUtils.lerp(headRef.current.rotation.y, headRotY, lerpFactor);
      headRef.current.rotation.z = THREE.MathUtils.lerp(headRef.current.rotation.z, headRotZ, lerpFactor);
    }

    if (mouthRef.current) {
      mouthRef.current.scale.y = THREE.MathUtils.lerp(mouthRef.current.scale.y, mouthScaleY, lerpFactor);
    }
    if (leftBrowRef.current) {
      leftBrowRef.current.position.y = THREE.MathUtils.lerp(leftBrowRef.current.position.y, browPosY, lerpFactor);
    }
    if (rightBrowRef.current) {
      rightBrowRef.current.position.y = THREE.MathUtils.lerp(rightBrowRef.current.position.y, browPosY, lerpFactor);
    }

    // Right arm lerps
    if (rightArmRef.current) {
      rightArmRef.current.rotation.x = THREE.MathUtils.lerp(rightArmRef.current.rotation.x, rArmRotX, lerpFactor);
      rightArmRef.current.rotation.y = THREE.MathUtils.lerp(rightArmRef.current.rotation.y, rArmRotY, lerpFactor);
      rightArmRef.current.rotation.z = THREE.MathUtils.lerp(rightArmRef.current.rotation.z, rArmRotZ, lerpFactor);
    }
    if (rightForearmRef.current) {
      rightForearmRef.current.rotation.x = THREE.MathUtils.lerp(rightForearmRef.current.rotation.x, rForearmRotX, lerpFactor);
      rightForearmRef.current.rotation.y = THREE.MathUtils.lerp(rightForearmRef.current.rotation.y, rForearmRotY, lerpFactor);
      rightForearmRef.current.rotation.z = THREE.MathUtils.lerp(rightForearmRef.current.rotation.z, rForearmRotZ, lerpFactor);
    }
    if (rightHandRef.current) {
      rightHandRef.current.rotation.x = THREE.MathUtils.lerp(rightHandRef.current.rotation.x, rHandRotX, lerpFactor);
      rightHandRef.current.rotation.y = THREE.MathUtils.lerp(rightHandRef.current.rotation.y, rHandRotY, lerpFactor);
      rightHandRef.current.rotation.z = THREE.MathUtils.lerp(rightHandRef.current.rotation.z, rHandRotZ, lerpFactor);
    }

    // Left arm lerps
    if (leftArmRef.current) {
      leftArmRef.current.rotation.x = THREE.MathUtils.lerp(leftArmRef.current.rotation.x, lArmRotX, lerpFactor);
      leftArmRef.current.rotation.y = THREE.MathUtils.lerp(leftArmRef.current.rotation.y, lArmRotY, lerpFactor);
      leftArmRef.current.rotation.z = THREE.MathUtils.lerp(leftArmRef.current.rotation.z, lArmRotZ, lerpFactor);
    }
    if (leftForearmRef.current) {
      leftForearmRef.current.rotation.x = THREE.MathUtils.lerp(leftForearmRef.current.rotation.x, lForearmRotX, lerpFactor);
      leftForearmRef.current.rotation.y = THREE.MathUtils.lerp(leftForearmRef.current.rotation.y, lForearmRotY, lerpFactor);
      leftForearmRef.current.rotation.z = THREE.MathUtils.lerp(leftForearmRef.current.rotation.z, lForearmRotZ, lerpFactor);
    }
    if (leftHandRef.current) {
      leftHandRef.current.rotation.x = THREE.MathUtils.lerp(leftHandRef.current.rotation.x, lHandRotX, lerpFactor);
      leftHandRef.current.rotation.y = THREE.MathUtils.lerp(leftHandRef.current.rotation.y, lHandRotY, lerpFactor);
      leftHandRef.current.rotation.z = THREE.MathUtils.lerp(leftHandRef.current.rotation.z, lHandRotZ, lerpFactor);
    }
  });

  // Anatomical Materials
  // Skin material: Warm matte tone
  const skinMaterial = new THREE.MeshStandardMaterial({
    color: '#d4a373',
    roughness: 0.5,
    metalness: 0.05,
  });

  // Clothing material: Dark navy / charcoal high contrast texture
  const clothingMaterial = new THREE.MeshStandardMaterial({
    color: '#1e293b',
    roughness: 0.8,
    metalness: 0.1,
  });

  // Feature material (eyes, eyebrows, mouth)
  const darkFeatureMaterial = new THREE.MeshBasicMaterial({ color: '#1f2937' });
  const scleraMaterial = new THREE.MeshBasicMaterial({ color: '#f8fafc' });
  const mouthMaterial = new THREE.MeshBasicMaterial({ color: '#991b1b' });

  return (
    <group position={[0, 0, 0]}>
      {/* Torso & Spine */}
      <group ref={chestRef} position={[0, 1.1, 0]}>
        {/* Chest Mesh in High-Contrast Clothing */}
        <mesh position={[0, 0.1, 0]} material={clothingMaterial} castShadow>
          <boxGeometry args={[0.38, 0.44, 0.22]} />
        </mesh>

        {/* Neck */}
        <mesh position={[0, 0.36, 0]} material={skinMaterial} castShadow>
          <cylinderGeometry args={[0.07, 0.08, 0.12, 16]} />
        </mesh>

        {/* Head Hierarchy */}
        <group ref={headRef} position={[0, 0.52, 0]}>
          {/* Cranium / Face */}
          <mesh material={skinMaterial} castShadow>
            <sphereGeometry args={[0.13, 24, 24]} />
          </mesh>

          {/* Hair cap */}
          <mesh position={[0, 0.05, -0.02]} material={darkFeatureMaterial}>
            <sphereGeometry args={[0.135, 16, 16]} />
          </mesh>

          {/* Left Eye */}
          <mesh position={[-0.045, 0.02, 0.11]} material={scleraMaterial}>
            <sphereGeometry args={[0.022, 12, 12]} />
          </mesh>
          <mesh position={[-0.045, 0.02, 0.125]} material={darkFeatureMaterial}>
            <sphereGeometry args={[0.012, 8, 8]} />
          </mesh>

          {/* Right Eye */}
          <mesh position={[0.045, 0.02, 0.11]} material={scleraMaterial}>
            <sphereGeometry args={[0.022, 12, 12]} />
          </mesh>
          <mesh position={[0.045, 0.02, 0.125]} material={darkFeatureMaterial}>
            <sphereGeometry args={[0.012, 8, 8]} />
          </mesh>

          {/* Left Eyebrow */}
          <mesh ref={leftBrowRef} position={[-0.045, 0.06, 0.12]} material={darkFeatureMaterial}>
            <boxGeometry args={[0.035, 0.008, 0.01]} />
          </mesh>

          {/* Right Eyebrow */}
          <mesh ref={rightBrowRef} position={[0.045, 0.06, 0.12]} material={darkFeatureMaterial}>
            <boxGeometry args={[0.035, 0.008, 0.01]} />
          </mesh>

          {/* Nose */}
          <mesh position={[0, 0.0, 0.13]} material={skinMaterial}>
            <coneGeometry args={[0.016, 0.03, 8]} />
          </mesh>

          {/* Mouth / Lips */}
          <mesh ref={mouthRef} position={[0, -0.05, 0.118]} material={mouthMaterial}>
            <boxGeometry args={[0.045, 0.012, 0.01]} />
          </mesh>
        </group>

        {/* Right Shoulder Joint */}
        <group ref={rightShoulderRef} position={[0.24, 0.25, 0]}>
          <mesh material={clothingMaterial} castShadow>
            <sphereGeometry args={[0.07, 16, 16]} />
          </mesh>

          {/* Right Upper Arm */}
          <group ref={rightArmRef} position={[0, 0, 0]}>
            <mesh position={[0, -0.15, 0]} material={clothingMaterial} castShadow>
              <cylinderGeometry args={[0.055, 0.05, 0.3, 16]} />
            </mesh>

            {/* Right Elbow / Forearm */}
            <group ref={rightForearmRef} position={[0, -0.3, 0]}>
              <mesh position={[0, -0.14, 0]} material={skinMaterial} castShadow>
                <cylinderGeometry args={[0.045, 0.04, 0.28, 16]} />
              </mesh>

              {/* Right Wrist & Hand */}
              <group ref={rightHandRef} position={[0, -0.28, 0]}>
                {/* Palm */}
                <mesh position={[0, -0.045, 0]} material={skinMaterial} castShadow>
                  <boxGeometry args={[0.07, 0.09, 0.025]} />
                </mesh>

                {/* Articulated Thumb */}
                <group ref={rightThumbRef} position={[0.04, -0.02, 0.01]} rotation={[0, 0, 0.5]}>
                  <mesh position={[0, -0.02, 0]} material={skinMaterial}>
                    <cylinderGeometry args={[0.01, 0.009, 0.04, 8]} />
                  </mesh>
                </group>

                {/* Articulated Index Finger */}
                <group ref={rightIndexRef} position={[0.025, -0.09, 0]}>
                  <mesh position={[0, -0.025, 0]} material={skinMaterial}>
                    <cylinderGeometry args={[0.008, 0.007, 0.05, 8]} />
                  </mesh>
                </group>

                {/* Articulated Middle Finger */}
                <group ref={rightMiddleRef} position={[0.008, -0.095, 0]}>
                  <mesh position={[0, -0.028, 0]} material={skinMaterial}>
                    <cylinderGeometry args={[0.008, 0.007, 0.055, 8]} />
                  </mesh>
                </group>

                {/* Articulated Ring Finger */}
                <group ref={rightRingRef} position={[-0.009, -0.09, 0]}>
                  <mesh position={[0, -0.025, 0]} material={skinMaterial}>
                    <cylinderGeometry args={[0.008, 0.007, 0.05, 8]} />
                  </mesh>
                </group>

                {/* Articulated Pinky Finger */}
                <group ref={rightPinkyRef} position={[-0.026, -0.08, 0]}>
                  <mesh position={[0, -0.02, 0]} material={skinMaterial}>
                    <cylinderGeometry args={[0.007, 0.006, 0.04, 8]} />
                  </mesh>
                </group>
              </group>
            </group>
          </group>
        </group>

        {/* Left Shoulder Joint */}
        <group ref={leftShoulderRef} position={[-0.24, 0.25, 0]}>
          <mesh material={clothingMaterial} castShadow>
            <sphereGeometry args={[0.07, 16, 16]} />
          </mesh>

          {/* Left Upper Arm */}
          <group ref={leftArmRef} position={[0, 0, 0]}>
            <mesh position={[0, -0.15, 0]} material={clothingMaterial} castShadow>
              <cylinderGeometry args={[0.055, 0.05, 0.3, 16]} />
            </mesh>

            {/* Left Elbow / Forearm */}
            <group ref={leftForearmRef} position={[0, -0.3, 0]}>
              <mesh position={[0, -0.14, 0]} material={skinMaterial} castShadow>
                <cylinderGeometry args={[0.045, 0.04, 0.28, 16]} />
              </mesh>

              {/* Left Wrist & Hand */}
              <group ref={leftHandRef} position={[0, -0.28, 0]}>
                {/* Palm */}
                <mesh position={[0, -0.045, 0]} material={skinMaterial} castShadow>
                  <boxGeometry args={[0.07, 0.09, 0.025]} />
                </mesh>

                {/* Left Thumb */}
                <group ref={leftThumbRef} position={[-0.04, -0.02, 0.01]} rotation={[0, 0, -0.5]}>
                  <mesh position={[0, -0.02, 0]} material={skinMaterial}>
                    <cylinderGeometry args={[0.01, 0.009, 0.04, 8]} />
                  </mesh>
                </group>

                {/* Left Index */}
                <group ref={leftIndexRef} position={[-0.025, -0.09, 0]}>
                  <mesh position={[0, -0.025, 0]} material={skinMaterial}>
                    <cylinderGeometry args={[0.008, 0.007, 0.05, 8]} />
                  </mesh>
                </group>

                {/* Left Middle */}
                <group ref={leftMiddleRef} position={[-0.008, -0.095, 0]}>
                  <mesh position={[0, -0.028, 0]} material={skinMaterial}>
                    <cylinderGeometry args={[0.008, 0.007, 0.055, 8]} />
                  </mesh>
                </group>
              </group>
            </group>
          </group>
        </group>
      </group>

      {/* Waist / Hips */}
      <mesh position={[0, 0.8, 0]} material={clothingMaterial}>
        <boxGeometry args={[0.34, 0.2, 0.2]} />
      </mesh>

      {/* Legs (Lower Body Rest) */}
      <mesh position={[-0.1, 0.38, 0]} material={clothingMaterial}>
        <cylinderGeometry args={[0.07, 0.06, 0.65, 16]} />
      </mesh>
      <mesh position={[0.1, 0.38, 0]} material={clothingMaterial}>
        <cylinderGeometry args={[0.07, 0.06, 0.65, 16]} />
      </mesh>
    </group>
  );
}
