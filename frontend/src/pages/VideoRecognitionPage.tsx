import { useState } from 'react';
import {
  Clock,
  Download,
  Film,
  Sliders,
  Upload,
  Video,
} from 'lucide-react';

export function VideoRecognitionPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [samplingRate, setSamplingRate] = useState<number>(15);
  const [batchSize, setBatchSize] = useState<number>(32);
  const [processingStatus, setProcessingStatus] = useState<'idle' | 'processing' | 'completed'>('idle');
  const [progressPct, setProgressPct] = useState<number>(0);
  const [extractedGlosses, setExtractedGlosses] = useState<Array<{ gloss: string; time: string; confidence: number }>>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setProcessingStatus('processing');
    setProgressPct(10);

    const interval = setInterval(() => {
      setProgressPct((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setProcessingStatus('completed');
          setExtractedGlosses([
            { gloss: 'HELLO', time: '00:01.2', confidence: 0.94 },
            { gloss: 'NAME', time: '00:02.5', confidence: 0.89 },
            { gloss: 'FRIEND', time: '00:04.1', confidence: 0.91 },
            { gloss: 'WELCOME', time: '00:05.8', confidence: 0.95 },
          ]);
          return 100;
        }
        return prev + 25;
      });
    }, 300);
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(extractedGlosses, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', 'isl_video_recognition.json');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="rounded-xl border border-gray-800 bg-[#111827] p-6 shadow-xl">
        <div className="max-w-3xl space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-950 text-blue-400 border border-blue-800 text-xs font-mono">
            <Film className="w-3.5 h-3.5" />
            <span>Direction B: Uploaded Sign Video Recognition</span>
          </div>
          <h2 className="text-2xl font-bold text-white">Batch Recognition from Uploaded Signing Videos</h2>
          <p className="text-sm text-gray-300 leading-relaxed">
            Upload pre-recorded videos of sign language communication. Configurable frame sampling extracts spatial landmarks and passes sequence embeddings through the batch inference pipeline.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Upload & Sampling Settings Column */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="rounded-xl border border-gray-800 bg-[#111827] p-5 flex flex-col gap-4 shadow-xl">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Upload className="w-4 h-4 text-cyan-400" />
              <span>Upload Video of Signing</span>
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

            {/* Inference Parameters */}
            <div className="space-y-3 pt-2 border-t border-gray-800">
              <div className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                <span>Extraction Parameters</span>
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-gray-400 mb-1">
                  <span>Frame Sampling Rate:</span>
                  <span className="font-mono text-cyan-400">{samplingRate} FPS</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[10, 15, 30].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => setSamplingRate(rate)}
                      className={`py-1.5 rounded text-xs font-mono border transition-colors ${
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
                  <span>Inference Batch Size:</span>
                  <span className="font-mono text-cyan-400">{batchSize} frames</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[16, 32, 64].map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setBatchSize(size)}
                      className={`py-1.5 rounded text-xs font-mono border transition-colors ${
                        batchSize === size
                          ? 'bg-cyan-950 border-cyan-800 text-cyan-300 font-semibold'
                          : 'bg-[#0b0f19] border-gray-800 text-gray-400 hover:text-white'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            {processingStatus === 'processing' && (
              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between text-xs text-gray-400 font-mono">
                  <span>Extracting landmarks...</span>
                  <span className="text-cyan-400">{progressPct}%</span>
                </div>
                <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${progressPct}%` }}
                    className="h-full bg-cyan-400 transition-all duration-300"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Results Column */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="rounded-xl border border-gray-800 bg-[#111827] p-5 flex flex-col gap-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h3 className="text-sm font-bold text-white">Recognized Sign Sequence</h3>
              {extractedGlosses.length > 0 && (
                <button
                  type="button"
                  onClick={handleExportJson}
                  className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-gray-200 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export JSON</span>
                </button>
              )}
            </div>

            {extractedGlosses.length > 0 ? (
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-[#0b0f19] border border-gray-800 space-y-2">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Full Reconstructed Sentence:
                  </div>
                  <div className="text-lg font-mono font-bold text-cyan-300">
                    {extractedGlosses.map((g) => g.gloss).join(' ')}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-semibold text-gray-400">Detailed Sign Timestamp Breakdown:</div>
                  <div className="space-y-2">
                    {extractedGlosses.map((item, idx) => (
                      <div
                        key={item.gloss + idx}
                        className="p-3 rounded-lg bg-[#0b0f19] border border-gray-800 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <span className="h-6 w-6 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-400 text-xs font-mono flex items-center justify-center font-bold">
                            {idx + 1}
                          </span>
                          <div>
                            <div className="text-sm font-bold text-white font-mono">{item.gloss}</div>
                            <div className="text-[10px] text-gray-500 font-mono flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {item.time}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-xs font-mono text-emerald-400">
                            {(item.confidence * 100).toFixed(0)}% confidence
                          </div>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800 font-mono">
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
                Upload a signing video to begin automated sequence extraction and recognition.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
