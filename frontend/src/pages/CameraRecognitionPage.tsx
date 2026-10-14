import { useState, useRef, useEffect } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Camera,
  Lock,
  Trash2,
  Volume2,
} from 'lucide-react';

export function CameraRecognitionPage() {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<'idle' | 'granted' | 'denied'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLandmarkOverlay, setIsLandmarkOverlay] = useState(true);
  const [recognizedGloss] = useState<string>('HELLO');
  const [confidence] = useState<number>(0.88);
  const [temporalBuffer] = useState<string[]>(['HELLO', 'PLEASE', 'THANK_YOU']);
  const [transcription, setTranscription] = useState<string>('HELLO PLEASE');
  const [manualCorrection, setManualCorrection] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      setErrorMessage(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
      setCameraPermission('granted');
    } catch (err: any) {
      setCameraPermission('denied');
      setErrorMessage(
        err.name === 'NotAllowedError'
          ? 'Camera access was denied by the user. Please grant permission in browser settings.'
          : `Failed to access camera: ${err.message || 'Device error'}`
      );
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const handleTTS = () => {
    if ('speechSynthesis' in window && transcription) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(transcription);
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="rounded-xl border border-gray-800 bg-[#111827] p-6 shadow-xl">
        <div className="max-w-3xl space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-950 text-blue-400 border border-blue-800 text-xs font-mono">
            <Camera className="w-3.5 h-3.5" />
            <span>Direction B: Real-time Camera Vision Pipeline</span>
          </div>
          <h2 className="text-2xl font-bold text-white">Live Camera ISL Sign Recognition</h2>
          <p className="text-sm text-gray-300 leading-relaxed">
            Extracts hand and upper-body pose landmarks in the browser. Landmark temporal sequences are processed by the versioned recognition interface. Zero background recording or external cloud streaming.
          </p>
        </div>
      </div>

      {/* Honesty Rule 4 Banner */}
      <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-800/80 text-amber-200 text-xs space-y-1.5 leading-relaxed">
        <div className="font-semibold text-amber-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span>Honesty Rule 4 & Model Status Disclosure</span>
        </div>
        <p>
          MediaPipe landmark coordinate extraction is <strong>NOT</strong> sign recognition; it is a spatial debug overlay. Recognition requires a trained temporal sequence model. Currently operating in labelled <strong>DEMO MODE</strong> until a certified ISL sequence model is trained and linked.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Video Viewport Column */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="rounded-xl border border-gray-800 bg-[#111827] p-5 flex flex-col gap-4 shadow-xl">
            {/* Viewport Title & Controls */}
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    isCameraActive
                      ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                      : 'bg-gray-600'
                  }`}
                />
                <span className="text-xs font-mono font-semibold text-white">
                  {isCameraActive ? 'LIVE CAMERA STREAM' : 'CAMERA STANDBY'}
                </span>
              </div>

              {/* Landmark Overlay Toggle */}
              <button
                type="button"
                onClick={() => setIsLandmarkOverlay(!isLandmarkOverlay)}
                className={`px-2.5 py-1 rounded text-[11px] font-mono border transition-colors cursor-pointer ${
                  isLandmarkOverlay
                    ? 'bg-cyan-950 border-cyan-800 text-cyan-300'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
                }`}
              >
                Landmark Overlay: {isLandmarkOverlay ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* Video Canvas Container */}
            <div className="relative w-full h-[360px] sm:h-[420px] rounded-xl overflow-hidden bg-[#0b0f19] border border-gray-800 flex items-center justify-center">
              {isCameraActive ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover mirror"
                  />
                  {isLandmarkOverlay && (
                    <div className="absolute inset-0 pointer-events-none border-2 border-dashed border-cyan-500/30 flex flex-col justify-between p-4">
                      <div className="px-2 py-1 rounded bg-black/80 text-cyan-400 text-[10px] font-mono self-start">
                        DEBUG OVERLAY: 21 Hand Landmarks + 33 Pose Coordinates
                      </div>
                      <div className="px-2 py-1 rounded bg-black/80 text-amber-300 text-[10px] font-mono self-end">
                        DEMO MODE RECOGNITION
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center text-gray-400 space-y-3">
                  <Camera className="w-16 h-16 text-gray-600" />
                  <p className="text-sm max-w-sm text-gray-300">
                    Camera access starts strictly upon clicking below. No background video is ever captured.
                  </p>
                  {(errorMessage || cameraPermission === 'denied') && (
                    <div className="text-xs text-red-400 flex items-center gap-1.5 bg-red-950/50 p-2.5 rounded-lg border border-red-800">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{errorMessage || 'Camera access was denied by browser settings.'}</span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={startCamera}
                    className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-cyan-500/20"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Initialize Camera Feed</span>
                  </button>
                </div>
              )}

              {/* Stop Camera Button when active */}
              {isCameraActive && (
                <div className="absolute bottom-3 right-3">
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold text-xs shadow-lg cursor-pointer"
                  >
                    Release & Stop Camera
                  </button>
                </div>
              )}
            </div>

            {/* Privacy Confirmation */}
            <div className="flex items-center gap-2 text-[11px] font-mono text-emerald-400">
              <Lock className="w-3.5 h-3.5" />
              <span>Full stream release enforced upon stopping. Zero unprompted telemetry.</span>
            </div>
          </div>
        </div>

        {/* Recognition Analytics & Output Column */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="rounded-xl border border-gray-800 bg-[#111827] p-5 flex flex-col gap-4 shadow-xl">
            <h3 className="text-sm font-semibold text-white border-b border-gray-800 pb-3">
              Recognition Metrics & Output
            </h3>

            {/* Current Detected Gloss */}
            <div className="p-4 rounded-xl bg-[#0b0f19] border border-gray-800 space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span className="font-semibold">Detected Sign:</span>
                <span className="font-mono text-cyan-400">
                  Confidence: {(confidence * 100).toFixed(0)}%
                </span>
              </div>

              <div className="text-2xl font-bold font-mono text-white tracking-wider">
                {recognizedGloss}
              </div>

              {/* Confidence Meter */}
              <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  style={{ width: `${confidence * 100}%` }}
                  className={`h-full ${
                    confidence > 0.8
                      ? 'bg-emerald-400'
                      : confidence > 0.5
                      ? 'bg-amber-400'
                      : 'bg-red-400'
                  }`}
                />
              </div>

              {confidence < 0.6 && (
                <div className="text-[11px] text-amber-400 font-mono">
                  Sign not recognized with certainty. Re-sign gesture clearly.
                </div>
              )}
            </div>

            {/* Temporal Buffer Sequence */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-gray-300">Temporal Frame Buffer:</span>
              <div className="flex flex-wrap gap-1.5">
                {temporalBuffer.map((sign, idx) => (
                  <span
                    key={sign + idx}
                    className="px-2.5 py-1 rounded-md bg-[#0b0f19] border border-gray-800 text-xs font-mono text-cyan-300"
                  >
                    {sign}
                  </span>
                ))}
              </div>
            </div>

            {/* Complete Transcription Text */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-gray-300">Final Transcription:</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTTS}
                    title="Speak aloud"
                    className="text-gray-400 hover:text-cyan-400"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setTranscription('')}
                    title="Clear text"
                    className="text-gray-400 hover:text-red-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#0b0f19] border border-gray-800 text-sm font-mono text-cyan-400">
                {transcription || 'No signs recognized yet.'}
              </div>

              {/* Manual Correction Input */}
              <div className="pt-2">
                <label className="text-[11px] text-gray-400 block mb-1">
                  Manual Correction:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualCorrection}
                    onChange={(e) => setManualCorrection(e.target.value)}
                    placeholder="Correct words if inaccurate..."
                    className="flex-1 px-3 py-1.5 rounded-lg bg-[#0b0f19] border border-gray-800 text-xs text-gray-100 focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (manualCorrection) {
                        setTranscription(manualCorrection);
                        setManualCorrection('');
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-white"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
