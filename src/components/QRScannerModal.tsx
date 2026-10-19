import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { X, Camera, RefreshCw, AlertCircle, Search, Sparkles } from 'lucide-react';
import { UserProfile } from '../types';
import { findUserByStudyId } from '../services/userService';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserFound: (user: UserProfile) => void;
  onNotify: (title: string, message: string, type?: 'success' | 'info' | 'error') => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  onUserFound,
  onNotify,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  // Manual fallback input
  const [manualStudyId, setManualStudyId] = useState('');
  const [isSearchingManual, setIsSearchingManual] = useState(false);

  // Start Camera
  const startCamera = async (mode: 'environment' | 'user') => {
    setCameraError(null);
    setIsScanning(true);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera access is not supported by your browser. Please use the manual Study ID lookup below.');
      setIsScanning(false);
      return;
    }

    try {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
      }
    } catch (err: any) {
      console.warn('Camera request failed:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera permission was denied. You can allow camera access in your browser settings or use the Study ID search below.');
      } else if (err.name === 'NotFoundError') {
        setCameraError('No camera device was detected on your hardware.');
      } else {
        setCameraError('Unable to open camera stream. Please use manual Study ID input.');
      }
      setIsScanning(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      startCamera(facingMode);
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsScanning(false);
  };

  // Frame scanning loop
  useEffect(() => {
    let animationFrameId: number;

    const scanFrame = async () => {
      if (!isOpen || !videoRef.current || !canvasRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.height = video.videoHeight;
        canvas.width = video.videoWidth;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });

          if (code && code.data) {
            handleScannedPayload(code.data);
            return; // stop scanning loop on hit
          }
        }
      }

      animationFrameId = requestAnimationFrame(scanFrame);
    };

    if (isOpen && isScanning && !cameraError) {
      animationFrameId = requestAnimationFrame(scanFrame);
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isOpen, isScanning, cameraError]);

  const handleScannedPayload = async (data: string) => {
    stopCamera();

    // Check if URL or Study ID
    let extractedStudyId: string | null = null;

    if (data.includes('studyId=')) {
      const match = data.match(/studyId=([A-Za-z0-9_-]+)/);
      if (match && match[1]) {
        extractedStudyId = decodeURIComponent(match[1]);
      }
    } else if (/^SM-\d+$/i.test(data.trim())) {
      extractedStudyId = data.trim().toUpperCase();
    }

    if (!extractedStudyId) {
      onNotify('Unrecognized QR Code', 'This QR code is not a valid Study Mods profile.', 'error');
      // restart scanning after brief pause
      setTimeout(() => startCamera(facingMode), 1500);
      return;
    }

    onNotify('QR Scanned', `Looking up ${extractedStudyId}...`, 'info');
    try {
      const user = await findUserByStudyId(extractedStudyId);
      if (user) {
        onNotify('Member Found', `Found ${user.displayName}!`, 'success');
        onUserFound(user);
        onClose();
      } else {
        onNotify('Not Found', `No registered member found with Study ID ${extractedStudyId}.`, 'error');
        setTimeout(() => startCamera(facingMode), 1500);
      }
    } catch (err: any) {
      onNotify('Lookup Error', err.message || 'Failed to check database.', 'error');
      setTimeout(() => startCamera(facingMode), 1500);
    }
  };

  const handleManualSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = manualStudyId.trim().toUpperCase();
    if (!clean) return;

    setIsSearchingManual(true);
    try {
      const user = await findUserByStudyId(clean);
      if (user) {
        onNotify('Member Found', `Found ${user.displayName}!`, 'success');
        onUserFound(user);
        onClose();
      } else {
        onNotify('Member Not Found', `No registered user with Study ID "${clean}".`, 'error');
      }
    } catch (err: any) {
      onNotify('Search Error', err.message || 'Database search failed.', 'error');
    } finally {
      setIsSearchingManual(false);
    }
  };

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm liquid-glass-card rounded-3xl p-6 shadow-2xl border border-white flex flex-col items-center">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors z-20"
          aria-label="Close Scanner"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Camera className="w-4 h-4" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Scan Study QR</h3>
        </div>
        <p className="text-xs text-slate-500 mb-4 text-center">
          Point camera at a classmate's Study Mods QR code
        </p>

        {/* Video Viewport */}
        <div className="relative w-64 h-64 rounded-2xl overflow-hidden bg-slate-900 shadow-inner flex items-center justify-center border border-slate-700/40">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Scanner Overlay Frame */}
          {!cameraError && isScanning && (
            <div className="absolute inset-6 border-2 border-indigo-400/80 rounded-2xl pointer-events-none flex items-center justify-center">
              {/* Corner accents */}
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white" />

              {/* Glowing animated scanline */}
              <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-indigo-400 to-transparent shadow-[0_0_12px_#818cf8] animate-pulse" />
            </div>
          )}

          {/* Camera Error / Permission Banner */}
          {cameraError && (
            <div className="absolute inset-0 p-4 bg-slate-900/90 flex flex-col items-center justify-center text-center text-white z-10">
              <AlertCircle className="w-8 h-8 text-rose-400 mb-2" />
              <p className="text-xs text-slate-300 font-medium px-2 leading-relaxed">
                {cameraError}
              </p>
              <button
                onClick={() => startCamera(facingMode)}
                className="mt-3 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry Camera
              </button>
            </div>
          )}

          {/* Camera Switch button */}
          {!cameraError && (
            <button
              onClick={toggleFacingMode}
              className="absolute bottom-3 right-3 p-2 rounded-full bg-slate-900/60 hover:bg-slate-900/80 text-white text-xs backdrop-blur-sm transition-all"
              title="Flip camera"
              aria-label="Flip camera"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Manual Fallback Input */}
        <div className="w-full mt-5 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>Manual Study ID Search</span>
          </div>

          <form onSubmit={handleManualSearch} className="flex gap-2">
            <input
              type="text"
              value={manualStudyId}
              onChange={(e) => setManualStudyId(e.target.value)}
              placeholder="e.g. SM-49218"
              className="flex-1 px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 uppercase tracking-wider font-mono"
            />
            <button
              type="submit"
              disabled={isSearchingManual || !manualStudyId.trim()}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
            >
              {isSearchingManual ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Search className="w-3.5 h-3.5" />
              )}
              Find
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
