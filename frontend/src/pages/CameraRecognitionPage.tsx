import { useState, useRef, useEffect, useCallback } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Camera,
  Check,
  Copy,
  Info,
  Lock,
  Pause,
  Play,
  Trash2,
  Volume2,
  X,
} from 'lucide-react';
import {
  getModelMetadata,
  recognizeLandmarkSequence,
  ModelMetadataResponse,
} from '../api/recognition.ts';
import { LandmarkTracker } from '../services/recognition/landmarkTracker.ts';
import { TemporalFrameBuffer } from '../services/recognition/temporalBuffer.ts';

export function CameraRecognitionPage() {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isStreamPaused, setIsStreamPaused] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<'idle' | 'granted' | 'denied'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLandmarkOverlay, setIsLandmarkOverlay] = useState(true);
  const [isRecognizing, setIsRecognizing] = useState(false);

  // Recognition metrics
  const [recognizedGloss, setRecognizedGloss] = useState<string>('WAITING_FOR_SIGN');
  const [confidence, setConfidence] = useState<number>(0.0);
  const [isSignRecognized, setIsSignRecognized] = useState<boolean>(true);
  const [temporalBufferList, setTemporalBufferList] = useState<string[]>([]);
  const [transcription, setTranscription] = useState<string>('');
  const [manualCorrection, setManualCorrection] = useState('');
  const [copied, setCopied] = useState(false);

  // Model limitations modal state
  const [isModelInfoOpen, setIsModelInfoOpen] = useState(false);
  const [modelMetadata, setModelMetadata] = useState<ModelMetadataResponse | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const trackerRef = useRef<LandmarkTracker>(new LandmarkTracker());
  const temporalBufferRef = useRef<TemporalFrameBuffer>(new TemporalFrameBuffer(30));
  const lastInferenceTimeRef = useRef<number>(0);

  // Load model metadata on mount
  useEffect(() => {
    trackerRef.current.initialize();
    getModelMetadata()
      .then((data) => setModelMetadata(data))
      .catch((err) => console.warn('Failed to load model metadata:', err));
  }, []);

  const handleLandmarkInference = useCallback(async () => {
    if (isRecognizing) return;
    const frames = temporalBufferRef.current.getFrames();
    if (frames.length < 15) return;

    try {
      setIsRecognizing(true);
      const res = await recognizeLandmarkSequence(frames, undefined, 'en');
      if (res.is_recognized && res.prediction) {
        const newGloss = res.prediction.gloss;
        setRecognizedGloss(newGloss);
        setConfidence(res.prediction.confidence);
        setIsSignRecognized(true);

        // Update temporal list
        setTemporalBufferList((prev) => [...prev.slice(-4), newGloss]);

        // Append to running transcription if different from immediate last word
        setTranscription((prev) => {
          const words = prev.trim().split(/\s+/).filter(Boolean);
          if (words.length === 0 || words[words.length - 1] !== newGloss) {
            return prev ? `${prev} ${newGloss}` : newGloss;
          }
          return prev;
        });
      } else {
        setIsSignRecognized(false);
        setConfidence(0.40);
        setRecognizedGloss('SIGN_NOT_RECOGNIZED');
      }
    } catch (err: any) {
      console.warn('Inference request error:', err);
    } finally {
      setIsRecognizing(false);
    }
  }, [isRecognizing]);

  const processFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || isStreamPaused) {
      animationFrameRef.current = requestAnimationFrame(processFrame);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.readyState >= 2) {
      const now = performance.now();
      const landmarks = trackerRef.current.detect(video, now);

      if (landmarks) {
        temporalBufferRef.current.push(landmarks);

        // Draw debug overlay
        trackerRef.current.drawOverlay(canvas, landmarks, isLandmarkOverlay);

        // Check if motion is active and throttle inference to every ~1200ms
        if (now - lastInferenceTimeRef.current > 1200 && temporalBufferRef.current.size() >= 15) {
          lastInferenceTimeRef.current = now;
          handleLandmarkInference();
        }
      }
    }

    animationFrameRef.current = requestAnimationFrame(processFrame);
  }, [isLandmarkOverlay, isStreamPaused, handleLandmarkInference]);

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
        videoRef.current.play().catch(() => {});
      }
      setIsCameraActive(true);
      setIsStreamPaused(false);
      setCameraPermission('granted');

      // Start processing loop
      animationFrameRef.current = requestAnimationFrame(processFrame);
    } catch (err: any) {
      setCameraPermission('denied');
      setErrorMessage(
        err.name === 'NotAllowedError'
          ? 'Camera access was denied by the user. Please grant permission in browser settings.'
          : `Failed to access camera device: ${err.message || 'Unknown device error'}`
      );
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    temporalBufferRef.current.clear();
    setIsCameraActive(false);
    setIsStreamPaused(false);
  };

  const togglePause = () => {
    if (!videoRef.current) return;
    if (isStreamPaused) {
      videoRef.current.play();
      setIsStreamPaused(false);
    } else {
      videoRef.current.pause();
      setIsStreamPaused(true);
    }
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

  const handleCopy = () => {
    if (!transcription) return;
    navigator.clipboard.writeText(transcription);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApplyCorrection = () => {
    if (manualCorrection.trim()) {
      setTranscription(manualCorrection.trim());
      setManualCorrection('');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="rounded-xl border border-gray-800 bg-[#111827] p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="max-w-3xl space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-950 text-blue-400 border border-blue-800 text-xs font-mono">
              <Camera className="w-3.5 h-3.5" />
              <span>Direction B: Real-time Camera Vision Pipeline</span>
            </div>
            <h2 className="text-2xl font-bold text-white">Live Camera ISL Sign Recognition</h2>
            <p className="text-sm text-gray-300 leading-relaxed">
              Extracts 21 hand and upper-body pose landmarks in the browser. Sliding temporal windows are classified by the versioned recognition service. Zero background recording or cloud video streaming.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsModelInfoOpen(true)}
            className="self-start md:self-center px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-mono border border-gray-700 flex items-center gap-2 cursor-pointer transition-colors"
          >
            <Info className="w-4 h-4 text-cyan-400" />
            <span>Supported Signs & Limitations</span>
          </button>
        </div>
      </div>

      {/* Honesty Rule 4 Disclosure Banner */}
      <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-800/80 text-amber-200 text-xs space-y-1.5 leading-relaxed">
        <div className="font-semibold text-amber-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span>Honesty Rule 4: Landmark Extraction vs. Semantic Sign Recognition</span>
        </div>
        <p>
          MediaPipe landmark coordinate extraction is <strong>NOT</strong> sign recognition; it is a spatial debug overlay. Recognition requires a trained temporal sequence model. Currently operating in a labelled <strong>DEMO MODE</strong> across the 12 seeded vocabulary items. Gestures below 60% confidence strictly trigger an explicit <em>"Sign not recognized"</em> state.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Video Viewport Column */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="rounded-xl border border-gray-800 bg-[#111827] p-5 flex flex-col gap-4 shadow-xl">
            {/* Viewport Header */}
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    isCameraActive
                      ? isStreamPaused
                        ? 'bg-amber-400'
                        : 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                      : 'bg-gray-600'
                  }`}
                />
                <span className="text-xs font-mono font-semibold text-white">
                  {isCameraActive
                    ? isStreamPaused
                      ? 'STREAM PAUSED'
                      : 'LIVE CAMERA STREAM'
                    : 'CAMERA STANDBY'}
                </span>
                {isRecognizing && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 animate-pulse">
                    INFERRING...
                  </span>
                )}
              </div>

              {/* Landmark Overlay Toggle */}
              {isCameraActive && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={togglePause}
                    className="px-2.5 py-1 rounded text-[11px] font-mono border border-gray-700 bg-gray-800 hover:bg-gray-700 text-gray-200 flex items-center gap-1 cursor-pointer"
                  >
                    {isStreamPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                    <span>{isStreamPaused ? 'Resume' : 'Pause'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsLandmarkOverlay(!isLandmarkOverlay)}
                    className={`px-2.5 py-1 rounded text-[11px] font-mono border transition-colors cursor-pointer ${
                      isLandmarkOverlay
                        ? 'bg-cyan-950 border-cyan-800 text-cyan-300'
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
                    }`}
                  >
                    Landmarks: {isLandmarkOverlay ? 'ON' : 'OFF'}
                  </button>
                </div>
              )}
            </div>

            {/* Video & Canvas Stream Container */}
            <div className="relative w-full h-[360px] sm:h-[420px] rounded-xl overflow-hidden bg-[#0b0f19] border border-gray-800 flex items-center justify-center">
              {isCameraActive ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover transform -scale-x-100"
                  />
                  <canvas
                    ref={canvasRef}
                    width={640}
                    height={480}
                    className="absolute inset-0 w-full h-full object-cover pointer-events-none transform -scale-x-100"
                  />
                  {isLandmarkOverlay && (
                    <div className="absolute top-3 right-3 pointer-events-none px-2 py-1 rounded bg-black/80 text-cyan-400 text-[10px] font-mono border border-cyan-800">
                      DEBUG SKELETON ACTIVE
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center text-gray-400 space-y-3">
                  <Camera className="w-16 h-16 text-gray-600" />
                  <p className="text-sm max-w-sm text-gray-300">
                    Camera access starts strictly upon clicking below. No video or imagery is ever uploaded or recorded in the background.
                  </p>
                  {(errorMessage || cameraPermission === 'denied') && (
                    <div className="text-xs text-red-400 flex items-center gap-1.5 bg-red-950/50 p-2.5 rounded-lg border border-red-800 max-w-md">
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

              {/* Stop Camera Button */}
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
              <span>Full stream hardware release enforced on stop. Zero unprompted network telemetry.</span>
            </div>
          </div>
        </div>

        {/* Recognition Output & Analytics Column */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="rounded-xl border border-gray-800 bg-[#111827] p-5 flex flex-col gap-4 shadow-xl">
            <h3 className="text-sm font-semibold text-white border-b border-gray-800 pb-3 flex items-center justify-between">
              <span>Recognition Metrics & Output</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-800">
                v0.1.0-demo
              </span>
            </h3>

            {/* Current Detected Gloss */}
            <div className="p-4 rounded-xl bg-[#0b0f19] border border-gray-800 space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span className="font-semibold">Detected Sign:</span>
                <span className="font-mono text-cyan-400">
                  Confidence: {(confidence * 100).toFixed(0)}%
                </span>
              </div>

              <div
                className={`text-2xl font-bold font-mono tracking-wider ${
                  isSignRecognized ? 'text-white' : 'text-amber-400 text-lg'
                }`}
              >
                {recognizedGloss}
              </div>

              {/* Confidence Meter */}
              <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  style={{ width: `${confidence * 100}%` }}
                  className={`h-full transition-all duration-300 ${
                    confidence >= 0.8
                      ? 'bg-emerald-400'
                      : confidence >= 0.6
                      ? 'bg-cyan-400'
                      : 'bg-amber-400'
                  }`}
                />
              </div>

              {!isSignRecognized && (
                <div className="text-[11px] text-amber-400 font-mono flex items-center gap-1.5 pt-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Sign not recognized with certainty. Re-sign gesture clearly.</span>
                </div>
              )}
            </div>

            {/* Temporal Buffer Sequence Queue */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-gray-300">
                Recent Detected Buffer Sequence:
              </span>
              <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2 rounded-lg bg-[#0b0f19] border border-gray-800">
                {temporalBufferList.length > 0 ? (
                  temporalBufferList.map((sign, idx) => (
                    <span
                      key={sign + idx}
                      className="px-2.5 py-1 rounded-md bg-cyan-950 border border-cyan-800 text-xs font-mono text-cyan-300"
                    >
                      {sign}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-gray-600 font-mono self-center">
                    Awaiting gesture motion...
                  </span>
                )}
              </div>
            </div>

            {/* Transcription Output */}
            <div className="space-y-2 pt-2 border-t border-gray-800">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-gray-300">Accumulated Transcription:</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopy}
                    disabled={!transcription}
                    title="Copy transcription"
                    className="text-gray-400 hover:text-cyan-400 disabled:opacity-40 cursor-pointer"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={handleTTS}
                    disabled={!transcription}
                    title="Speak aloud"
                    className="text-gray-400 hover:text-cyan-400 disabled:opacity-40 cursor-pointer"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTranscription('');
                      setTemporalBufferList([]);
                    }}
                    disabled={!transcription}
                    title="Clear transcript"
                    className="text-gray-400 hover:text-red-400 disabled:opacity-40 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#0b0f19] border border-gray-800 text-sm font-mono text-cyan-400 min-h-[50px]">
                {transcription || (
                  <span className="text-gray-600">No signs recognized yet.</span>
                )}
              </div>

              {/* Manual Correction Input */}
              <div className="pt-2 space-y-1">
                <label className="text-[11px] text-gray-400 block font-medium">
                  Manual Correction & Sentence Editing:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualCorrection}
                    onChange={(e) => setManualCorrection(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleApplyCorrection()}
                    placeholder="Type words to replace or correct transcript..."
                    className="flex-1 px-3 py-1.5 rounded-lg bg-[#0b0f19] border border-gray-800 text-xs text-gray-100 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCorrection}
                    className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-white cursor-pointer font-medium"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Model Limitations & Specs Modal */}
      {isModelInfoOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="rounded-xl border border-gray-800 bg-[#111827] max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-cyan-400" />
                <h3 className="text-lg font-bold text-white">
                  ISL Recognition Model Specifications & Limitations
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModelInfoOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed text-gray-300">
              <div className="p-3 rounded-lg bg-cyan-950/40 border border-cyan-800/60 font-mono text-cyan-200">
                Model: <strong>{modelMetadata?.model_id || 'isl-heuristic-demo'}</strong> | Version:{' '}
                <strong>{modelMetadata?.model_version || 'v0.1.0-demo'}</strong> | Status:{' '}
                <span className="text-amber-400 font-bold">DEMO FALLBACK</span>
              </div>

              <div>
                <h4 className="font-semibold text-white mb-1.5">
                  Supported Vocabulary ({modelMetadata?.supported_vocabulary.length || 12} signs):
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {(modelMetadata?.supported_vocabulary || [
                    'HELLO', 'THANK_YOU', 'PLEASE', 'NAME', 'HELP', 'YES',
                    'NO', 'WATER', 'GOOD', 'WELCOME', 'SIGN', 'FRIEND'
                  ]).map((sign) => (
                    <span
                      key={sign}
                      className="px-2 py-0.5 rounded bg-[#0b0f19] border border-gray-800 text-cyan-400 font-mono text-[11px]"
                    >
                      {sign}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-white mb-1.5">Operational Limitations:</h4>
                <ul className="list-disc pl-5 space-y-1 text-gray-400">
                  {(modelMetadata?.limitations || [
                    'Operating in labelled DEMO MODE via geometric heuristics.',
                    'MediaPipe landmark extraction is a spatial coordinate overlay, NOT sign recognition.',
                    'Recognizes only the 12 seeded vocabulary items under unobstructed frontal framing.',
                    'Does not detect non-manual signals (facial expressions, head tilts, mouthings).',
                    'Gestures falling below 60% confidence strictly trigger "Sign not recognized".',
                  ]).map((lim, idx) => (
                    <li key={idx}>{lim}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-white mb-1.5">Input Tensor Format Specification:</h4>
                <div className="p-3 rounded-lg bg-[#0b0f19] border border-gray-800 font-mono text-[11px] text-gray-300 space-y-1">
                  <div>Tensor Shape: (batch_size, sequence_length, 75)</div>
                  <div>Sequence Window: 15 to 60 frames (0.5s to 2.0s at 30 FPS)</div>
                  <div>Coordinates: Normalized [0.0, 1.0] relative to viewport anchor</div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-800 flex justify-end">
              <button
                type="button"
                onClick={() => setIsModelInfoOpen(false)}
                className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white text-xs font-semibold cursor-pointer"
              >
                Close Disclosures
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
