import { useState, useRef, useEffect } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Clock,
  Download,
  Film,
  FileText,
  Sliders,
  Upload,
  Video,
  XCircle,
} from 'lucide-react';
import {
  uploadSigningVideoForRecognition,
  pollVideoRecognitionJob,
  cancelVideoRecognitionJob,
  VideoRecognitionSegment,
} from '../api/recognition.ts';

export function VideoRecognitionPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [samplingRate, setSamplingRate] = useState<number>(15);
  const [batchSize, setBatchSize] = useState<number>(32);

  // Job state
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<'idle' | 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled'>('idle');
  const [progressPct, setProgressPct] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Recognition results
  const [extractedSegments, setExtractedSegments] = useState<VideoRecognitionSegment[]>([]);
  const [reconstructedText, setReconstructedText] = useState<string>('');

  const pollTimerRef = useRef<number | null>(null);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      if (videoPreviewUrl) {
        URL.revokeObjectURL(videoPreviewUrl);
      }
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, [videoPreviewUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      setErrorMessage('Video file exceeds maximum size limit of 50MB.');
      return;
    }

    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl);
    }

    setSelectedFile(file);
    setVideoPreviewUrl(URL.createObjectURL(file));
    setErrorMessage(null);
    setJobStatus('idle');
    setProgressPct(0);
    setExtractedSegments([]);
    setReconstructedText('');
  };

  const startRecognition = async () => {
    if (!selectedFile) return;

    try {
      setErrorMessage(null);
      setJobStatus('queued');
      setProgressPct(5);

      const res = await uploadSigningVideoForRecognition(
        selectedFile,
        samplingRate,
        batchSize,
        'en'
      );

      setCurrentJobId(res.job_id);
      setJobStatus('processing');

      // Start polling
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);

      pollTimerRef.current = window.setInterval(async () => {
        try {
          const pollRes = await pollVideoRecognitionJob(res.job_id);
          setProgressPct(pollRes.progress);

          if (pollRes.status === 'completed') {
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
            setJobStatus('completed');
            setExtractedSegments(pollRes.segments);
            setReconstructedText(pollRes.full_transcript);
          } else if (pollRes.status === 'failed') {
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
            setJobStatus('failed');
            setErrorMessage(pollRes.error_message || 'Video recognition failed.');
          } else if (pollRes.status === 'cancelled') {
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
            setJobStatus('cancelled');
          }
        } catch (pollErr: any) {
          console.warn('Job polling error:', pollErr);
        }
      }, 750);
    } catch (err: any) {
      setJobStatus('failed');
      setErrorMessage(err.message || 'Failed to dispatch video recognition job.');
    }
  };

  const handleCancel = async () => {
    if (!currentJobId) return;
    try {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      await cancelVideoRecognitionJob(currentJobId);
      setJobStatus('cancelled');
    } catch (err: any) {
      console.warn('Failed to cancel job:', err);
    }
  };

  const handleSegmentGlossChange = (id: number, newGloss: string) => {
    const updated = extractedSegments.map((seg) =>
      seg.id === id ? { ...seg, gloss: newGloss.toUpperCase() } : seg
    );
    setExtractedSegments(updated);
    const valid = updated
      .map((s) => s.gloss)
      .filter((g) => g && g !== 'SIGN_NOT_RECOGNIZED');
    setReconstructedText(valid.join(' '));
  };

  const handleExportJson = () => {
    const exportPayload = {
      filename: selectedFile?.name || 'signing_video.mp4',
      model_version: 'v0.1.0-demo',
      is_demo: true,
      full_transcript: reconstructedText,
      sampling_rate_fps: samplingRate,
      batch_size_frames: batchSize,
      segments: extractedSegments,
    };
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(exportPayload, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = 'isl_video_recognition.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleExportVtt = () => {
    let vtt = 'WEBVTT - AI SignBridge ISL Recognition Subtitles\n\n';
    extractedSegments.forEach((seg, i) => {
      const formatTime = (sec: number) => {
        const m = Math.floor(sec / 60)
          .toString()
          .padStart(2, '0');
        const s = (sec % 60).toFixed(3).padStart(6, '0');
        return `00:${m}:${s}`;
      };
      vtt += `${i + 1}\n${formatTime(seg.start)} --> ${formatTime(seg.end)}\n${seg.gloss}\n\n`;
    });

    const blob = new Blob([vtt], { type: 'text/vtt;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'isl_recognition.vtt';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="rounded-xl border border-gray-800 bg-[#111827] p-6 shadow-xl">
        <div className="max-w-3xl space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-950 text-blue-400 border border-blue-800 text-xs font-mono">
            <Film className="w-3.5 h-3.5" />
            <span>Direction B: Uploaded Signing Video Recognition</span>
          </div>
          <h2 className="text-2xl font-bold text-white">
            Batch Sequence Recognition from Uploaded Signing Videos
          </h2>
          <p className="text-sm text-gray-300 leading-relaxed">
            Upload pre-recorded videos of sign language communication. Configurable frame sampling extracts temporal landmarks, passing windowed sequence batches to the versioned recognition service.
          </p>
        </div>
      </div>

      {/* Honesty Disclosure Banner */}
      <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-800/80 text-amber-200 text-xs space-y-1.5 leading-relaxed">
        <div className="font-semibold text-amber-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span>Honesty Rule Disclosures: Video Recognition & Model Bounds</span>
        </div>
        <p>
          Batch video recognition operates through the <strong>v0.1.0-demo</strong> heuristic interface covering the 12 seeded signs. Video frames are sampled and batched securely without external cloud upload. Unconfident segments are strictly marked <em>"SIGN_NOT_RECOGNIZED"</em> to preserve linguistic accuracy.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Upload & Controls Column */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="rounded-xl border border-gray-800 bg-[#111827] p-5 flex flex-col gap-4 shadow-xl">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Upload className="w-4 h-4 text-cyan-400" />
              <span>Select Signing Video</span>
            </h3>

            {/* Video File Dropzone */}
            <label className="border-2 border-dashed border-gray-700 hover:border-cyan-500 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-[#0b0f19]">
              <input
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                onChange={handleFileChange}
                className="hidden"
              />
              <Video className="w-10 h-10 text-gray-500 mb-2" />
              <span className="text-xs font-semibold text-gray-200">
                {selectedFile ? selectedFile.name : 'Choose video file (MP4, WebM)'}
              </span>
              <span className="text-[10px] text-gray-500 mt-1">
                Max 50MB | Clear signing view recommended
              </span>
            </label>

            {/* Video Preview Player */}
            {videoPreviewUrl && (
              <div className="relative rounded-lg overflow-hidden border border-gray-800 bg-black aspect-video flex items-center justify-center">
                <video
                  src={videoPreviewUrl}
                  controls
                  className="w-full h-full object-contain"
                />
              </div>
            )}

            {/* Extraction Parameters */}
            <div className="space-y-3 pt-2 border-t border-gray-800">
              <div className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                <span>Extraction & Inference Parameters</span>
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-gray-400 mb-1">
                  <span>Sampling Frame Rate:</span>
                  <span className="font-mono text-cyan-400">{samplingRate} FPS</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[10, 15, 30].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => setSamplingRate(rate)}
                      disabled={jobStatus === 'processing'}
                      className={`py-1.5 rounded text-xs font-mono border transition-colors cursor-pointer ${
                        samplingRate === rate
                          ? 'bg-cyan-950 border-cyan-800 text-cyan-300 font-semibold'
                          : 'bg-[#0b0f19] border-gray-800 text-gray-400 hover:text-white'
                      }`}
                    >
                      {rate} FPS
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-gray-400 mb-1">
                  <span>Sequence Window Batch Size:</span>
                  <span className="font-mono text-cyan-400">{batchSize} frames</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[16, 32, 64].map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setBatchSize(size)}
                      disabled={jobStatus === 'processing'}
                      className={`py-1.5 rounded text-xs font-mono border transition-colors cursor-pointer ${
                        batchSize === size
                          ? 'bg-cyan-950 border-cyan-800 text-cyan-300 font-semibold'
                          : 'bg-[#0b0f19] border-gray-800 text-gray-400 hover:text-white'
                      }`}
                    >
                      {size} frames
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2">
              {jobStatus === 'processing' ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-gray-300 font-mono">
                    <span>Extracting frames & inferring...</span>
                    <span className="text-cyan-400 font-bold">{progressPct}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${progressPct}%` }}
                      className="h-full bg-cyan-400 transition-all duration-300"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="w-full mt-2 py-2 rounded-lg bg-red-950 hover:bg-red-900 text-red-200 border border-red-800 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Cancel Recognition Job</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={startRecognition}
                  disabled={!selectedFile}
                  className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed text-gray-950 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/20 transition-all"
                >
                  <Film className="w-4 h-4" />
                  <span>Start Video Sequence Recognition</span>
                </button>
              )}

              {errorMessage && (
                <div className="mt-3 p-2.5 rounded-lg bg-red-950/60 border border-red-800 text-xs text-red-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {jobStatus === 'cancelled' && (
                <div className="mt-3 p-2.5 rounded-lg bg-amber-950/60 border border-amber-800 text-xs text-amber-300 flex items-center gap-2 font-mono">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Job cancelled by user.</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Results Column */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="rounded-xl border border-gray-800 bg-[#111827] p-5 flex flex-col gap-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h3 className="text-sm font-bold text-white">Recognized Sequence Output</h3>
              {extractedSegments.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportJson}
                    className="px-2.5 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-gray-200 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer border border-gray-700"
                  >
                    <Download className="w-3.5 h-3.5 text-cyan-400" />
                    <span>JSON</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportVtt}
                    className="px-2.5 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-gray-200 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer border border-gray-700"
                  >
                    <FileText className="w-3.5 h-3.5 text-cyan-400" />
                    <span>WebVTT</span>
                  </button>
                </div>
              )}
            </div>

            {extractedSegments.length > 0 ? (
              <div className="space-y-4">
                {/* Reconstructed Sentence */}
                <div className="p-4 rounded-xl bg-[#0b0f19] border border-gray-800 space-y-1.5">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Full Reconstructed Sentence:
                  </div>
                  <div className="text-lg font-mono font-bold text-cyan-300">
                    {reconstructedText || 'No confident signs recognized in video.'}
                  </div>
                </div>

                {/* Segment List */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-gray-400 flex items-center justify-between">
                    <span>Segment Timeline & Sign Breakdown (Click gloss to edit):</span>
                    <span className="text-[11px] font-mono text-gray-500">
                      {extractedSegments.length} segments
                    </span>
                  </div>

                  <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                    {extractedSegments.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-lg bg-[#0b0f19] border border-gray-800 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <span className="h-6 w-6 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-400 text-xs font-mono flex items-center justify-center font-bold">
                            {item.id}
                          </span>
                          <div>
                            <input
                              type="text"
                              value={item.gloss}
                              onChange={(e) => handleSegmentGlossChange(item.id, e.target.value)}
                              className="text-sm font-bold text-white font-mono bg-transparent border-b border-dashed border-gray-700 focus:border-cyan-400 focus:outline-none w-44"
                            />
                            <div className="text-[10px] text-gray-500 font-mono flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3" />
                              <span>
                                {item.start.toFixed(1)}s - {item.end.toFixed(1)}s
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right flex flex-col items-end gap-1">
                          <div
                            className={`text-xs font-mono ${
                              item.confidence >= 0.8
                                ? 'text-emerald-400'
                                : item.confidence >= 0.6
                                ? 'text-cyan-400'
                                : 'text-amber-400'
                            }`}
                          >
                            {(item.confidence * 100).toFixed(0)}% confidence
                          </div>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800 font-mono">
                            demo inference
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500 text-xs">
                Upload a video of signing and click <em>"Start Video Sequence Recognition"</em> to begin automated landmark extraction and sequence inference.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
