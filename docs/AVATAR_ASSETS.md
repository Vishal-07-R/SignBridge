# AI SignBridge: 3D Avatar Asset & Animation Specifications

This document defines the technical, anatomical, and linguistic standards required for production 3D avatar humanoid models and Indian Sign Language (ISL) animation clips in AI SignBridge.

---

## 1. Current State & Honesty Rule 8 Notice

> [!IMPORTANT]
> In compliance with **Honesty Rule 8**, no pre-packaged production mocap or proprietary GLB humanoid is bundled in this repository. AI SignBridge currently renders an active **DEV FALLBACK** procedural rig in React Three Fiber that implements the complete bone hierarchy, lighting, camera framing, sequence timeline, and clip mapping architecture.
>
> To deploy a production avatar, follow the specifications below and place the approved `.glb` asset in `/frontend/public/assets/models/avatar.glb`.

---

## 2. Rigged Humanoid Specifications (`.glb` / `.gltf`)

### 2.1 File & Topology Standards
- **Format**: Binary GLTF (`.glb`), Version 2.0.
- **Polycount**: 25,000 to 60,000 triangles (optimized for WebGL real-time 60 FPS rendering).
- **Coordinate System**: Right-handed, Y-Up, Z-Forward (Three.js standard).
- **Scale**: Real-world meters (approximate humanoid height: 1.70m - 1.80m).
- **Origin / Pivot**: Centered at ground level `[0, 0, 0]` between the feet.
- **Clothing & Textures**:
  - Top attire must feature **high-contrast charcoal or dark navy tones** (`#1a202c` or `#0f172a`) with matte finish (roughness > 0.6) to ensure signing hands and fingers stand out sharply against the torso.
  - Skin tones and hand textures must have clearly distinguishable silhouettes and fingernail boundaries.

### 2.2 Skeletal Hierarchy & Bone Naming Standard
The skeleton must adhere to standard humanoid conventions (Mixamo or ReadyPlayerMe / humanoid standard):

```
Hips
└── Spine
    └── Spine1
        └── Spine2 (Chest)
            ├── Neck
            │   └── Head
            │       ├── LeftEye / RightEye
            │       └── Jaw
            ├── LeftClavicle
            │   └── LeftArm (Upper Arm)
            │       └── LeftForeArm (Elbow)
            │           └── LeftHand (Wrist)
            │               ├── LeftHandThumb1 → LeftHandThumb2 → LeftHandThumb3
            │               ├── LeftHandIndex1 → LeftHandIndex2 → LeftHandIndex3
            │               ├── LeftHandMiddle1 → LeftHandMiddle2 → LeftHandMiddle3
            │               ├── LeftHandRing1 → LeftHandRing2 → LeftHandRing3
            │               └── LeftHandPinky1 → LeftHandPinky2 → LeftHandPinky3
            └── RightClavicle
                └── RightArm (Upper Arm)
                    └── RightForeArm (Elbow)
                        └── RightHand (Wrist)
                            ├── RightHandThumb1 → RightHandThumb2 → RightHandThumb3
                            ├── RightHandIndex1 → RightHandIndex2 → RightHandIndex3
                            ├── RightHandMiddle1 → RightHandMiddle2 → RightHandMiddle3
                            ├── RightHandRing1 → RightHandRing2 → RightHandRing3
                            └── RightHandPinky1 → RightHandPinky2 → RightHandPinky3
```

### 2.3 Finger Articulation Requirements
- Indian Sign Language relies critically on precise handshapes, contact points, and finger orientations.
- **Every finger must have 3 independently articulated joints (proximal, intermediate, distal)** plus metacarpal/carpals where possible.
- Hand rigging must allow:
  - Tight closed fist (S-shape / A-shape).
  - Open palm with full adduction/abduction (spread vs flat).
  - Index pointing (1-shape / D-shape).
  - Finger interlocking (e.g. for `FRIEND`).
  - Crossed fingers (e.g. for `NAME` / `R`).

### 2.4 Facial Blendshapes (ARKit Standard)
To support essential non-manual markers (NMMs) such as questions, negations, and affective expressions, the mesh head must contain standard blendshapes / morph targets:
- `browDownLeft`, `browDownRight` (puzzlement, WH-questions)
- `browInnerUp` (yes/no question marker)
- `eyeBlinkLeft`, `eyeBlinkRight`
- `jawOpen`, `mouthOpen`
- `mouthSmileLeft`, `mouthSmileRight`
- `mouthPucker`, `mouthFunnel`
- `cheekPuff`

---

## 3. ISL Animation Clip Standards

### 3.1 Clip Format & Parameters
- **Packaging**: Embedded in the GLB or separate `.glb` animation containers (`ISL_<GLOSS>_v1.glb`).
- **Framerate**: 60 fps keyframes with cubic or linear quaternion interpolation.
- **Root Motion**: **Stationary**. All locomotion or spine root translation must remain locked at `[0, 0, 0]`.
- **Pre/Post Rest State**:
  - Every sign animation must begin and end in the **Standard ISL Neutral Rest Pose** (hands relaxed at lower chest/waist level, elbows slightly bent, head neutral facing forward).
  - Transition duration into and out of the neutral rest pose should be between **150ms and 250ms** for natural co-articulation when chained in sequences.

### 3.2 Linguist & Native Signer Verification
- Per **Honesty Rule 5**, signs must never be generated randomly or synthesized without validation.
- All animation clips must be reviewed and certified by a certified ISL linguist or Deaf native signer before marking `is_reviewed = true`.
- Record reviewer identity, timestamp, and review status in the `sign_reviews` database table.

---

## 4. Production Integration Instructions

1. Obtain or export the validated GLTF/GLB humanoid model adhering to the specs above.
2. Place the model file at:
   ```
   frontend/public/assets/models/avatar.glb
   ```
3. Place individual sign animation files at:
   ```
   frontend/public/assets/animations/ISL_<GLOSS>_v1.glb
   ```
4. `AvatarCanvas.tsx` will automatically detect the presence of `/assets/models/avatar.glb`. If present, it initializes the rigged skinned mesh loader; if absent or invalid, it gracefully displays the **DEV FALLBACK** rig.
