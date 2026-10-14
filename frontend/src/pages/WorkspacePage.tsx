import { useState, useRef, useEffect } from 'react';
import {
  AlertCircle,
  Camera,
  Lock,
  Send,
  Sparkles,
  Trash2,
  Video,
  Volume2,
} from 'lucide-react';
import { AvatarViewer } from '../components/avatar/AvatarViewer.tsx';
import { normalizeSignKey } from '../components/avatar/clipMapper.ts';
import { translateText } from '../api/translation.ts';
import { recognizeLandmarkSequence } from '../api/recognition.ts';
import { LandmarkTracker } from '../services/recognition/landmarkTracker.ts';
import { TemporalFrameBuffer } from '../services/recognition/temporalBuffer.ts';

export function WorkspacePage() {
  // Mode: 'split' | 'avatar-only' | 'camera-only'
  const [layoutMode, setLayoutMode] = useState<'split' | 'avatar-only' | 'camera-only'>('split');
  const [sharedTranscript, setSharedTranscript] = useState(false);

  // Left side: Camera / Recognition State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<'idle' | 'granted' | 'denied'>('idle');
  const [recognizedText, setRecognizedText] = useState('');
  const [recognizedConfidence, setRecognizedConfidence] = useState(0.85);
  const [manualCorrection, setManualCorrection] = useState('');
  const [isLandmarkOverlay, setIsLandmarkOverlay] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const trackerRef = useRef<LandmarkTracker>(new LandmarkTracker());
  const temporalBufferRef = useRef<TemporalFrameBuffer>(new TemporalFrameBuffer(30));
  const lastInferenceRef = useRef<number>(0);

  useEffect(() => {
    trackerRef.current.initialize();
  }, []);

  const processWorkspaceFrame = () => {
    if (!videoRef.current || !canvasRef.current || !isCameraActive) {
      if (isCameraActive) animationFrameRef.current = requestAnimationFrame(processWorkspaceFrame);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.readyState >= 2) {
      const now = performance.now();
      const landmarks = trackerRef.current.detect(video, now);
      if (landmarks) {
        temporalBufferRef.current.push(landmarks);
        trackerRef.current.drawOverlay(canvas, landmarks, isLandmarkOverlay);

        if (now - lastInferenceRef.current > 1500 && temporalBufferRef.current.size() >= 15) {
          lastInferenceRef.current = now;
          recognizeLandmarkSequence(temporalBufferRef.current.getFrames(), undefined, 'en')
            .then((res) => {
              if (res.is_recognized && res.prediction) {
                setRecognizedConfidence(res.prediction.confidence);
                setRecognizedText((prev) => {
                  const words = prev.trim().split(/\s+/).filter(Boolean);
                  if (words.length === 0 || words[words.length - 1] !== res.prediction!.gloss) {
                    return prev ? `${prev} ${res.prediction!.gloss}` : res.prediction!.gloss;
                  }
                  return prev;
                });
              }
            })
            .catch(() => {});
        }
      }
    }

    animationFrameRef.current = requestAnimationFrame(processWorkspaceFrame);
  };

  // Handle camera toggle
  const toggleCamera = async () => {
    if (isCameraActive) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setIsCameraActive(false);
      return;
    }

    try {
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
      setCameraPermission('granted');
      animationFrameRef.current = requestAnimationFrame(processWorkspaceFrame);
    } catch {
      setCameraPermission('denied');
      setIsCameraActive(false);
    }
  };

  // Right side: Text to Avatar State
  const [inputText, setInputText] = useState('Hello friend welcome');
  const [avatarGlosses, setAvatarGlosses] = useState<string[]>(['HELLO', 'FRIEND', 'WELCOME']);
  const [translationStatus, setTranslationStatus] = useState<string>('Ready');


  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Handle Text to ISL submission
  const handleTranslateText = async () => {
    if (!inputText.trim()) return;

    try {
      const response = await translateText({ text: inputText.trim(), source_language: 'en' });
      setAvatarGlosses(response.reordered_glosses);
      setTranslationStatus(`Generated ${response.reordered_glosses.length} ISL signs (${response.coverage.coverage_percentage}% coverage).`);
    } catch {
      // Fallback
      const tokens = inputText
        .trim()
        .split(/\s+/)
        .map((w) => normalizeSignKey(w));
      setAvatarGlosses(tokens);
      setTranslationStatus(`Generated sequence of ${tokens.length} signs.`);
    }

    if (sharedTranscript) {
      setRecognizedText(inputText);
    }
  };


  // TTS audio playback
  const handleTTS = (text: string) => {
    if ('speechSynthesis' in window && text) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Workspace Header & Mode Controls */}
      <div className="rounded-xl border border-gray-800 bg-[#111827] p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            Two-Way ISL Communication Workspace
          </h2>
          <p className="text-xs text-gray-400">
            Independent bidirectional channels. Left: Camera / Video recognition. Right: Text to 3D avatar.
          </p>
        </div>

        {/* Layout & Sync Controls */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Shared Transcript Toggle */}
          <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-800 text-gray-300 cursor-pointer hover:border-gray-700">
            <input
              type="checkbox"
              checked={sharedTranscript}
              onChange={(e) => setSharedTranscript(e.target.checked)}
              className="rounded bg-gray-800 border-gray-700 text-cyan-500 focus:ring-0"
            />
            <span>Sync Shared Transcript</span>
          </label>

          {/* View Mode Buttons */}
          <div className="flex items-center gap-1 bg-gray-900 p-1 rounded-lg border border-gray-800">
            <button
              type="button"
              onClick={() => setLayoutMode('split')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                layoutMode === 'split' ? 'bg-cyan-500 text-gray-950 font-bold' : 'text-gray-400 hover:text-white'
              }`}
            >
              Split View
            </button>
            <button
              type="button"
              onClick={() => setLayoutMode('camera-only')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                layoutMode === 'camera-only' ? 'bg-cyan-500 text-gray-950 font-bold' : 'text-gray-400 hover:text-white'
              }`}
            >
              Camera Only
            </button>
            <button
              type="button"
              onClick={() => setLayoutMode('avatar-only')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                layoutMode === 'avatar-only' ? 'bg-cyan-500 text-gray-950 font-bold' : 'text-gray-400 hover:text-white'
              }`}
            >
              Avatar Only
            </button>
          </div>
        </div>
      </div>

      {/* Main Split Grid */}
      <div
        className={`grid gap-6 ${
          layoutMode === 'split'
            ? 'grid-cols-1 lg:grid-cols-2'
            : layoutMode === 'camera-only'
            ? 'grid-cols-1'
            : 'grid-cols-1'
        }`}
      >
        {/* LEFT CHANNEL: Direction B - Camera ISL Recognition */}
        {(layoutMode === 'split' || layoutMode === 'camera-only') && (
          <div className="rounded-xl border border-gray-800 bg-[#111827] p-5 flex flex-col gap-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-blue-950 border border-blue-800 flex items-center justify-center text-blue-400">
                  <Video className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">ISL to Text Channel</h3>
                  <p className="text-[11px] text-gray-400">MediaPipe landmark extraction & recognition</p>
                </div>
              </div>

              {/* Recording / Active Status Indicator */}
              <div className="flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    isCameraActive
                      ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                      : 'bg-gray-600'
                  }`}
                />
                <span className="text-xs text-gray-400 font-mono">
                  {isCameraActive ? 'LIVE' : 'STANDBY'}
                </span>
              </div>
            </div>

            {/* Video Viewport */}
            <div className="relative w-full h-[280px] sm:h-[320px] rounded-lg overflow-hidden bg-[#0b0f19] border border-gray-800 flex items-center justify-center">
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
                    <div className="absolute top-2 right-2 pointer-events-none px-2 py-0.5 rounded bg-black/70 text-cyan-400 text-[10px] font-mono border border-cyan-800">
                      DEBUG: 21 Landmarks
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center p-6 text-center text-gray-500">
                  <Camera className="w-12 h-12 mb-2 text-gray-600" />
                  <p className="text-xs max-w-xs">
                    Camera is currently off. Click Start Camera to initialize vision pipeline.
                  </p>
                  {cameraPermission === 'denied' && (
                    <div className="mt-2 text-xs text-red-400 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Camera permission was denied.
                    </div>
                  )}
                </div>
              )}

              {/* Camera Action Overlay */}
              <div className="absolute bottom-3 right-3 flex items-center gap-2">
                {isCameraActive && (
                  <button
                    type="button"
                    onClick={() => setIsLandmarkOverlay(!isLandmarkOverlay)}
                    className="px-2.5 py-1.5 rounded-md bg-gray-900/90 border border-gray-700 text-[10px] text-cyan-300 font-mono shadow-lg"
                  >
                    Overlay: {isLandmarkOverlay ? 'ON' : 'OFF'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={toggleCamera}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors shadow-lg ${
                    isCameraActive
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : 'bg-blue-600 hover:bg-blue-500 text-white'
                  }`}
                >
                  {isCameraActive ? 'Stop Camera' : 'Start Camera'}
                </button>
              </div>
            </div>

            {/* Recognition Output & Transcription */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span className="font-semibold text-gray-300">Recognized Transcription:</span>
                <span className="text-[11px] font-mono text-cyan-400">
                  Confidence: {(recognizedConfidence * 100).toFixed(0)}%
                </span>
              </div>

              <div className="p-3 rounded-lg bg-[#0b0f19] border border-gray-800 text-sm font-mono text-cyan-300 flex items-center justify-between">
                <span>{recognizedText || 'Waiting for signing...'}</span>
                <button
                  type="button"
                  onClick={() => handleTTS(recognizedText)}
                  title="Speak via TTS"
                  className="p-1 rounded text-gray-400 hover:text-cyan-400 transition-colors"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>

              {/* Manual Correction Box */}
              <div className="pt-2">
                <label className="text-[11px] text-gray-400 block mb-1">
                  Manual Correction / Adjustment:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualCorrection}
                    onChange={(e) => setManualCorrection(e.target.value)}
                    placeholder="Correct transcription if needed..."
                    className="flex-1 px-3 py-1.5 rounded-lg bg-[#0b0f19] border border-gray-800 text-xs text-gray-100 focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (manualCorrection) {
                        setRecognizedText(manualCorrection);
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

            {/* Privacy Guarantee Notice */}
            <div className="mt-auto pt-3 border-t border-gray-800 flex items-center justify-between text-[11px] text-gray-400">
              <div className="flex items-center gap-1.5 text-emerald-400 font-mono">
                <Lock className="w-3.5 h-3.5" />
                <span>Zero background streaming. Recording is user-initiated.</span>
              </div>
              <button
                type="button"
                onClick={() => setRecognizedText('')}
                className="text-gray-400 hover:text-red-400 flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            </div>
          </div>
        )}

        {/* RIGHT CHANNEL: Direction A - Text to 3D Avatar */}
        {(layoutMode === 'split' || layoutMode === 'avatar-only') && (
          <div className="rounded-xl border border-gray-800 bg-[#111827] p-5 flex flex-col gap-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Text to ISL Channel</h3>
                  <p className="text-[11px] text-gray-400">Rule-based sign mapping & 3D avatar rendering</p>
                </div>
              </div>

              <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono">
                Status: {translationStatus}
              </span>
            </div>

            {/* Text Input Area */}
            <div className="space-y-2">
              <div className="relative">
                <textarea
                  rows={2}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Enter sentence or words in English (e.g. Hello friend welcome)..."
                  className="w-full px-3 py-2 rounded-lg bg-[#0b0f19] border border-gray-800 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-cyan-500 resize-none font-sans"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-400 font-mono">
                  {inputText.length} chars | {inputText.trim() ? inputText.trim().split(/\s+/).length : 0} words
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setInputText('')}
                    className="text-[11px] text-gray-400 hover:text-gray-200"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={handleTranslateText}
                    className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>Translate to Avatar</span>
                    <Send className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>

            {/* Embedded 3D Avatar Viewer */}
            <div className="w-full">
              <AvatarViewer
                initialGlosses={avatarGlosses}
                autoPlay={true}
                heightClassName="h-[360px]"
                showSequenceList={true}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
