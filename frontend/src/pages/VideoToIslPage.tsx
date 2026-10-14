import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Ban,
  Clock,
  Download,
  Film,
  Languages,
  Loader2,
  Maximize2,
  Minimize2,
  RefreshCw,
  Sparkles,
  Subtitles,
  Upload,
  Video,
} from 'lucide-react';
import { AvatarViewer } from '../components/avatar/AvatarViewer.tsx';
import {
  cancelJob,
  JobStatusResponse,
  pollJobStatus,
  retranslateSegment,
  retryJob,
  uploadVideoForTranscription,
  VideoTranscriptSegment,
} from '../api/media.ts';

export function VideoToIslPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [sourceLanguage, setSourceLanguage] = useState<'en' | 'hi'>('en');

  // Background Job State
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatusResponse['status'] | 'idle'>('idle');
  const [jobProgress, setJobProgress] = useState<number>(0);
  const [jobErrorMessage, setJobErrorMessage] = useState<string | null>(null);
  const [noAudioStreamNotice, setNoAudioStreamNotice] = useState<string | null>(null);

  // Transcript Segments State
  const [segments, setSegments] = useState<VideoTranscriptSegment[]>([
    {
      id: 'seg-1',
      start: 0.0,
      end: 2.5,
      text: 'Hello and welcome friend',
      glosses: ['HELLO', 'WELCOME', 'FRIEND'],
      unsupported_tokens: [],
      grammar_audit: [],
    },
    {
      id: 'seg-2',
      start: 2.6,
      end: 5.0,
      text: 'Please give water and help',
      glosses: ['PLEASE', 'WATER', 'HELP'],
      unsupported_tokens: [],
      grammar_audit: [],
    },
  ]);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState(0);

  // Video and Avatar Viewport Controls
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [showCaptions, setShowCaptions] = useState(true);
  const [avatarExpanded, setAvatarExpanded] = useState(false);
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [editText, setEditText] = useState<string>('');

  // Polling loop for active background jobs
  useEffect(() => {
    if (!activeJobId || jobStatus === 'completed' || jobStatus === 'failed' || jobStatus === 'cancelled') {
      return;
    }

    const intervalId = setInterval(async () => {
      try {
        const job = await pollJobStatus(activeJobId);
        setJobStatus(job.status);
        setJobProgress(job.progress);

        if (job.status === 'completed') {
          if (job.result_data?.status === 'no_audio_stream') {
            setNoAudioStreamNotice(
              job.result_data.message ||
                'Video contains no audio stream. If this is a video of a person signing, route to ISL recognition.'
            );
          } else if (job.result_data?.segments && job.result_data.segments.length > 0) {
            setSegments(job.result_data.segments);
            setActiveSegmentIndex(0);
          }
        } else if (job.status === 'failed') {
          setJobErrorMessage(job.error_message || 'Video processing encountered a server failure.');
        } else if (job.status === 'cancelled') {
          setJobErrorMessage('Job was cancelled.');
        }
      } catch (err: unknown) {
        console.error('Job polling error:', err);
      }
    }, 1500);

    return () => clearInterval(intervalId);
  }, [activeJobId, jobStatus]);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setJobErrorMessage(null);
    setNoAudioStreamNotice(null);
    setJobStatus('idle');
    setJobProgress(0);
    setActiveJobId(null);

    const url = URL.createObjectURL(file);
    setVideoPreviewUrl(url);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleStartTranscription = async () => {
    if (!selectedFile) return;

    setJobErrorMessage(null);
    setNoAudioStreamNotice(null);
    setJobStatus('queued');
    setJobProgress(5);

    try {
      const job = await uploadVideoForTranscription(selectedFile, sourceLanguage);
      setActiveJobId(job.id);
      setJobStatus(job.status);
      setJobProgress(job.progress);
    } catch (err: unknown) {
      setJobStatus('failed');
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setJobErrorMessage(msg);
    }
  };

  const handleCancelJob = async () => {
    if (!activeJobId) return;
    try {
      const job = await cancelJob(activeJobId);
      setJobStatus(job.status);
      setJobErrorMessage('Job was cancelled by user.');
    } catch (err: unknown) {
      console.error('Cancel job error:', err);
    }
  };

  const handleRetryJob = async () => {
    if (!activeJobId) return;
    try {
      const job = await retryJob(activeJobId);
      setJobStatus(job.status);
      setJobProgress(job.progress);
      setJobErrorMessage(null);
      setNoAudioStreamNotice(null);
    } catch (err: unknown) {
      console.error('Retry job error:', err);
    }
  };

  const handleSegmentSelect = (index: number) => {
    setActiveSegmentIndex(index);
    const seg = segments[index];
    if (seg && videoRef.current) {
      videoRef.current.currentTime = seg.start;
      videoRef.current.play().catch(() => {});
    }
  };

  const handleSegmentTextSave = async (index: number, newText: string) => {
    if (!newText.trim()) {
      setEditingSegmentId(null);
      return;
    }

    let updatedSegment = { ...segments[index], text: newText };
    try {
      const res = await retranslateSegment(newText, sourceLanguage);
      updatedSegment = {
        ...updatedSegment,
        glosses: res.glosses,
        unsupported_tokens: res.unsupported_tokens,
        grammar_audit: res.grammar_audit,
      };
    } catch (err) {
      console.warn('Segment retranslation failed:', err);
    }

    setSegments((prev) => {
      const copy = [...prev];
      copy[index] = updatedSegment;
      return copy;
    });
    setEditingSegmentId(null);
  };

  const activeSegment = segments[activeSegmentIndex] || segments[0];
  const activeGlosses = activeSegment?.glosses || ['HELLO'];

  const exportVttCaptions = () => {
    let vtt = 'WEBVTT\n\n';
    segments.forEach((seg, i) => {
      const formatTime = (sec: number) => {
        const date = new Date(sec * 1000);
        return date.toISOString().substr(11, 12);
      };
      vtt += `${i + 1}\n${formatTime(seg.start)} --> ${formatTime(seg.end)}\n${seg.text}\n\n`;
    });

    const blob = new Blob([vtt], { type: 'text/vtt' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transcript.vtt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="rounded-xl border border-gray-800 bg-[#111827] p-6 shadow-xl">
        <div className="max-w-3xl space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 text-xs font-mono">
            <Film className="w-3.5 h-3.5" />
            <span>Direction A: Video Speech to ISL</span>
          </div>
          <h2 className="text-2xl font-bold text-white">Transcribe Video Audio into ISL Avatar Signing</h2>
          <p className="text-sm text-gray-300 leading-relaxed">
            Upload videos containing spoken speech. The server extracts audio safely using explicit argument lists (zero shell injection) and transcribes segments via faster-whisper. Segments synchronize with the 3D avatar.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Upload & Segment Timeline Column */}
        <div className={avatarExpanded ? 'lg:col-span-4 flex flex-col gap-4' : 'lg:col-span-5 flex flex-col gap-4'}>
          <div className="rounded-xl border border-gray-800 bg-[#111827] p-5 flex flex-col gap-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Upload className="w-4 h-4 text-cyan-400" />
                <span>Upload Video with Speech</span>
              </h3>

              {/* Language Selector */}
              <div className="flex items-center gap-1.5 text-xs">
                <Languages className="w-3.5 h-3.5 text-gray-400" />
                <select
                  value={sourceLanguage}
                  onChange={(e) => setSourceLanguage(e.target.value as 'en' | 'hi')}
                  className="bg-[#0b0f19] border border-gray-700 rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="en">English</option>
                  <option value="hi">Hindi (हिन्दी)</option>
                </select>
              </div>
            </div>

            {/* Video File Dropzone */}
            <label className="border-2 border-dashed border-gray-700 hover:border-cyan-500 rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-[#0b0f19]">
              <input
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                onChange={handleFileInputChange}
                className="hidden"
              />
              <Video className="w-8 h-8 text-gray-500 mb-2" />
              <span className="text-xs font-semibold text-gray-200">
                {selectedFile ? selectedFile.name : 'Choose video file (MP4, WebM, MOV)'}
              </span>
              <span className="text-[10px] text-gray-500 mt-1">
                Audio extraction via ffmpeg + faster-whisper (Max 100MB)
              </span>
            </label>

            {/* Start Processing Action */}
            {selectedFile && jobStatus === 'idle' && (
              <button
                type="button"
                onClick={handleStartTranscription}
                className="w-full py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-gray-950 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Extract Audio & Transcribe to ISL</span>
              </button>
            )}

            {/* Job Status Banner & Progress */}
            {(jobStatus === 'queued' || jobStatus === 'processing') && (
              <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 flex flex-col gap-2.5 text-xs">
                <div className="flex items-center justify-between font-mono">
                  <span className="flex items-center gap-2 text-cyan-400 font-semibold">
                    <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                    <span>
                      {jobStatus === 'queued' ? 'Job queued in background...' : 'Processing video & audio...'}
                    </span>
                  </span>
                  <span className="text-gray-400">{jobProgress}%</span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-cyan-500 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${jobProgress}%` }}
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleCancelJob}
                    className="text-[11px] text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Ban className="w-3 h-3" />
                    <span>Cancel Processing</span>
                  </button>
                </div>
              </div>
            )}

            {/* Error or Cancelled Notice with Retry */}
            {(jobStatus === 'failed' || jobStatus === 'cancelled') && (
              <div className="p-3.5 rounded-lg bg-red-950/40 border border-red-800 flex flex-col gap-2 text-xs text-red-200">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="font-semibold text-red-300">
                      {jobStatus === 'cancelled' ? 'Job Cancelled' : 'Processing Failed'}
                    </span>
                    <p className="text-[11px] text-red-200/90">{jobErrorMessage}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRetryJob}
                  className="self-end px-3 py-1 rounded bg-red-900/60 hover:bg-red-800 border border-red-700 text-[11px] font-bold text-red-100 flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Retry Job</span>
                </button>
              </div>
            )}

            {/* Video without Audio Stream Notice per Requirements */}
            {noAudioStreamNotice && (
              <div className="p-4 rounded-lg bg-amber-950/40 border border-amber-800 flex flex-col gap-2 text-xs text-amber-200">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="font-bold text-amber-300">No Audio Stream Detected</span>
                    <p className="text-[11px] leading-relaxed text-amber-200/90">{noAudioStreamNotice}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-amber-900/60">
                  <a
                    href="#video-recognition"
                    className="px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold text-[11px] flex items-center gap-1 transition-colors"
                  >
                    <span>Route to ISL Video Recognition</span>
                    <ArrowRight className="w-3 h-3" />
                  </a>
                  <a
                    href="#image-to-isl"
                    className="px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-200 text-[11px] transition-colors"
                  >
                    <span>Try Document/OCR</span>
                  </a>
                </div>
              </div>
            )}

            {/* Segment Review & Synchronized Timeline */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs border-b border-gray-800 pb-2">
                <span className="font-semibold text-gray-300">Synchronized Transcript Segments:</span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-cyan-400 font-mono">
                    {segments.length} Segments
                  </span>
                  {segments.length > 0 && (
                    <button
                      type="button"
                      onClick={exportVttCaptions}
                      title="Export WebVTT Captions"
                      className="p-1 rounded hover:bg-gray-800 text-gray-400 hover:text-cyan-400 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {segments.map((seg, idx) => (
                  <div
                    key={seg.id}
                    onClick={() => handleSegmentSelect(idx)}
                    className={`p-3 rounded-lg border transition-all cursor-pointer ${
                      activeSegmentIndex === idx
                        ? 'bg-cyan-950/60 border-cyan-500 shadow-md shadow-cyan-500/10'
                        : 'bg-[#0b0f19] border-gray-800 hover:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-mono text-gray-400 mb-1.5">
                      <span className="flex items-center gap-1 text-cyan-400 font-semibold">
                        <Clock className="w-3 h-3" />
                        {seg.start.toFixed(1)}s - {seg.end.toFixed(1)}s
                      </span>
                      <span className="text-[10px] uppercase font-bold text-gray-500">
                        Segment {idx + 1}
                      </span>
                    </div>

                    {editingSegmentId === seg.id ? (
                      <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editText}
                          autoFocus
                          onChange={(e) => setEditText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleSegmentTextSave(idx, e.currentTarget.value);
                            }
                          }}
                          onBlur={(e) => handleSegmentTextSave(idx, e.currentTarget.value)}
                          className="w-full px-2 py-1 rounded bg-gray-900 border border-cyan-500 text-xs text-gray-100 focus:outline-none"
                        />
                        <span className="text-[10px] text-gray-500">Press Enter or click away to save re-translation</span>
                      </div>
                    ) : (
                      <p
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingSegmentId(seg.id);
                          setEditText(seg.text);
                        }}
                        title="Click to edit transcript segment"
                        className="text-xs text-gray-200 hover:text-cyan-300 transition-colors"
                      >
                        {seg.text}
                      </p>
                    )}

                    {/* Gloss Badges */}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {seg.glosses.map((g, gIdx) => (
                        <span
                          key={`${g}-${gIdx}`}
                          className="px-1.5 py-0.5 rounded bg-gray-800 text-cyan-300 font-mono text-[10px] border border-cyan-950"
                        >
                          {g}
                        </span>
                      ))}
                    </div>

                    {/* Honesty Rule 2 Unsupported tokens warning */}
                    {seg.unsupported_tokens && seg.unsupported_tokens.length > 0 && (
                      <div className="mt-1.5 text-[10px] text-red-300/90 font-mono">
                        Unsupported: {seg.unsupported_tokens.join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Video Preview & Avatar Output Column */}
        <div className={avatarExpanded ? 'lg:col-span-8 flex flex-col gap-4' : 'lg:col-span-7 flex flex-col gap-4'}>
          {/* Side-by-Side or Stacked Video & Avatar Player */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* HTML5 Video Player */}
            <div className="rounded-xl border border-gray-800 bg-[#111827] p-4 flex flex-col gap-3 shadow-xl">
              <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                <span className="text-xs font-semibold text-gray-200 flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Video Preview</span>
                </span>

                <button
                  type="button"
                  onClick={() => setShowCaptions(!showCaptions)}
                  title="Toggle captions overlay"
                  className={`text-xs px-2 py-0.5 rounded flex items-center gap-1 border transition-colors ${
                    showCaptions
                      ? 'bg-cyan-950 border-cyan-700 text-cyan-300'
                      : 'bg-gray-800 border-gray-700 text-gray-400'
                  }`}
                >
                  <Subtitles className="w-3 h-3" />
                  <span>Captions</span>
                </button>
              </div>

              <div className="relative rounded-lg overflow-hidden bg-black flex items-center justify-center min-h-[220px]">
                {videoPreviewUrl ? (
                  <video
                    ref={videoRef}
                    controls
                    src={videoPreviewUrl}
                    className="w-full max-h-[240px] object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-gray-600 gap-2 p-6">
                    <Video className="w-8 h-8 opacity-40" />
                    <span className="text-xs">No video loaded</span>
                  </div>
                )}

                {/* Subtitle / Caption Overlay */}
                {showCaptions && activeSegment && (
                  <div className="absolute bottom-10 left-4 right-4 bg-black/85 text-white text-xs px-3 py-1.5 rounded text-center backdrop-blur-sm pointer-events-none">
                    {activeSegment.text}
                  </div>
                )}
              </div>
            </div>

            {/* Avatar Header & Viewport Controls */}
            <div className="rounded-xl border border-gray-800 bg-[#111827] p-4 flex flex-col gap-3 shadow-xl">
              <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Segment {activeSegmentIndex + 1} Avatar Signing</span>
                </span>

                <button
                  type="button"
                  onClick={() => setAvatarExpanded(!avatarExpanded)}
                  title={avatarExpanded ? 'Standard viewport' : 'Expand avatar'}
                  className="p-1 rounded hover:bg-gray-800 text-gray-400 hover:text-cyan-400 transition-colors"
                >
                  {avatarExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </button>
              </div>

              <AvatarViewer
                initialGlosses={activeGlosses}
                autoPlay={false}
                heightClassName="h-[240px]"
                showSequenceList={false}
              />
            </div>
          </div>

          {/* Full Interactive Avatar Playback Controls & Sequence List */}
          <div className="rounded-xl border border-gray-800 bg-[#111827] p-5 flex flex-col gap-4 shadow-xl">
            <h3 className="text-sm font-bold text-white flex items-center justify-between border-b border-gray-800 pb-3">
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>Full ISL Sequence for Segment {activeSegmentIndex + 1}</span>
              </span>
              <span className="text-xs font-mono text-cyan-400">
                {activeGlosses.length} Glosses
              </span>
            </h3>

            <AvatarViewer
              initialGlosses={activeGlosses}
              autoPlay={false}
              heightClassName="h-[360px]"
              showSequenceList={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
