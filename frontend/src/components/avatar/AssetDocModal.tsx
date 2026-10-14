import { FileText, Layers, ShieldAlert, X } from 'lucide-react';

interface AssetDocModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AssetDocModal({ isOpen, onClose }: AssetDocModalProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="asset-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-xl bg-[#111827] border border-gray-700 shadow-2xl p-6 text-gray-100 flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-amber-950/80 border border-amber-800 flex items-center justify-center text-amber-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 id="asset-modal-title" className="text-lg font-bold text-white flex items-center gap-2">
                3D Avatar Asset Architecture & Honesty Notice
              </h2>
              <p className="text-xs text-gray-400">Honesty Rule 8: Verified Asset Specifications</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Honesty Commitment Banner */}
        <div className="p-4 rounded-lg bg-amber-950/30 border border-amber-800/80 text-amber-200 text-xs space-y-2 leading-relaxed">
          <div className="font-semibold flex items-center gap-1.5 text-amber-400">
            <ShieldAlert className="w-4 h-4" />
            <span>Honesty Rule 8 Compliance Notice</span>
          </div>
          <p>
            No pre-trained mocap sign clips or production GLB avatar models are fabricated or bundled into this repository. The currently rendered avatar is an active <strong>DEV FALLBACK</strong> procedural rig equipped with head, eyes, brows, mouth, neck, chest, shoulders, arms, elbows, wrists, and 5 articulated fingers per hand.
          </p>
          <p>
            To replace this fallback rig with a production model, supply a validated humanoid asset adhering to the technical specifications detailed below.
          </p>
        </div>

        {/* Specifications Grid */}
        <div className="space-y-4 text-xs">
          <div>
            <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4 text-cyan-400" />
              <span>Rigged Humanoid Requirements</span>
            </h3>
            <ul className="space-y-1.5 list-disc list-inside text-gray-300 pl-1">
              <li><strong>Format:</strong> Binary GLTF (<code className="text-cyan-300">.glb</code>) version 2.0.</li>
              <li><strong>Polygon Budget:</strong> 25,000 to 60,000 triangles optimized for real-time 60 FPS WebGL rendering.</li>
              <li><strong>Attire:</strong> High-contrast dark navy or charcoal tunic/t-shirt (ensuring light/medium skin tones and handshapes are distinctly legible against the chest).</li>
              <li><strong>Bone Hierarchy:</strong> Standard Mixamo / ReadyPlayerMe humanoid standard with hips, spine, chest, neck, head, and clavicles.</li>
              <li><strong>Finger Articulation:</strong> All 5 fingers (Thumb, Index, Middle, Ring, Pinky) must contain 3 articulated joints (proximal, intermediate, distal) for precise handshapes.</li>
              <li><strong>Facial Expressions:</strong> Standard ARKit 52 morph targets/blendshapes for non-manual grammatical markers (eyebrow raises, furrowing, mouth shapes, head nods).</li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4 text-cyan-400" />
              <span>ISL Animation Clips Specification</span>
            </h3>
            <ul className="space-y-1.5 list-disc list-inside text-gray-300 pl-1">
              <li><strong>Naming Convention:</strong> <code className="text-cyan-300">ISL_&lt;GLOSS&gt;_v1.glb</code> (e.g. <code className="text-cyan-300">ISL_HELLO_v1.glb</code>).</li>
              <li><strong>Framerate:</strong> 60 FPS quaternion-interpolated keyframes.</li>
              <li><strong>Locomotion:</strong> Stationary root motion locked at [0, 0, 0].</li>
              <li><strong>Neutral Rest:</strong> Starts and ends in the standard ISL resting pose (elbows bent, hands relaxed at waist level, 200ms ease curve).</li>
              <li><strong>Review:</strong> Must be certified by an authorized ISL linguist or Deaf native signer before marking <code className="text-emerald-400">is_reviewed = true</code>.</li>
            </ul>
          </div>

          <div className="p-3 rounded-lg bg-[#0b0f19] border border-gray-800 text-[11px] font-mono text-gray-300">
            <div className="text-gray-400 mb-1"># Target Asset Drop-in Location:</div>
            <div>frontend/public/assets/models/avatar.glb</div>
            <div className="mt-2 text-gray-400"># Documentation Reference:</div>
            <div className="text-cyan-400">docs/AVATAR_ASSETS.md</div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-4 border-t border-gray-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-gray-950 font-semibold text-xs transition-colors cursor-pointer"
          >
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  );
}
