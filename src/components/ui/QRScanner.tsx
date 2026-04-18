import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';

interface QRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onResult: (result: string) => void;
}

type ScannerEngine = 'native' | 'fallback' | null;

type NativeBarcodeDetector = {
  detect: (image: ImageBitmapSource) => Promise<Array<{ rawValue?: string }>>;
};

type NativeBarcodeDetectorCtor = {
  new (options?: { formats?: string[] }): NativeBarcodeDetector;
  getSupportedFormats?: () => Promise<string[]>;
};

type QrScannerInstance = {
  start?: () => Promise<void>;
  stop: () => void;
  destroy?: () => void;
};

const SCAN_INTERVAL_MS = 70;
const NATIVE_FORMATS = ['qr_code', 'ean_13', 'code_128', 'ean_8', 'upc_a', 'upc_e'];
const BARCODE_ONLY_NATIVE_FORMATS = ['ean_13', 'code_128', 'ean_8', 'upc_a', 'upc_e'];
const FALLBACK_SUPPORTED_FORMATS = ['qr_code', 'ean_13', 'code_128', 'ean_8', 'upc_a', 'upc_e'];

const getBarcodeDetector = (): NativeBarcodeDetectorCtor | null => {
  const maybeWindow = window as unknown as { BarcodeDetector?: NativeBarcodeDetectorCtor };
  return maybeWindow.BarcodeDetector ?? null;
};

export function QRScanner({ isOpen, onClose, onResult }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fallbackScannerRef = useRef<QrScannerInstance | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastScanTsRef = useRef(0);
  const detectInFlightRef = useRef(false);
  const hasScannedRef = useRef(false);
  const aliveRef = useRef(false);

  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [engine, setEngine] = useState<ScannerEngine>(null);

  const isMobile = window.innerWidth < 768;

  const handleDetected = useCallback(
    (value: string) => {
      if (hasScannedRef.current) return;
      const normalized = value.trim();
      if (!normalized) return;
      hasScannedRef.current = true;
      onResult(normalized);
    },
    [onResult]
  );

  const stopScanner = useCallback(async () => {
    aliveRef.current = false;

    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    const fallback = fallbackScannerRef.current;
    fallbackScannerRef.current = null;
    if (fallback) {
      try {
        fallback.stop();
      } catch {
      }
      fallback.destroy?.();
    }

    const stream = streamRef.current;
    streamRef.current = null;
    if (stream) {
      for (const track of stream.getTracks()) {
        track.stop();
      }
    }

    const video = videoRef.current;
    if (video) {
      video.pause();
      video.srcObject = null;
    }

    detectInFlightRef.current = false;
    lastScanTsRef.current = 0;
    setEngine(null);
    setIsStarting(false);
  }, []);

  const startFallbackScanner = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    const [{ BrowserMultiFormatReader }, zxingLib] = await Promise.all([
      import('@zxing/browser'),
      import('@zxing/library'),
    ]);

    const hints = new Map();
    hints.set(zxingLib.DecodeHintType.POSSIBLE_FORMATS, [
      zxingLib.BarcodeFormat.QR_CODE,
      zxingLib.BarcodeFormat.EAN_13,
      zxingLib.BarcodeFormat.CODE_128,
      zxingLib.BarcodeFormat.EAN_8,
      zxingLib.BarcodeFormat.UPC_A,
      zxingLib.BarcodeFormat.UPC_E,
    ]);

    const reader = new BrowserMultiFormatReader(hints, {
      delayBetweenScanAttempts: 30,
      delayBetweenScanSuccess: 0,
      tryPlayVideoTimeout: 600,
    });

    const controls = await reader.decodeFromConstraints(
      {
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280, max: 1280 },
          height: { ideal: 720, max: 720 },
        },
      },
      video,
      (result, error) => {
        if (result) {
          handleDetected(result.getText());
          return;
        }

        if (!error) return;
        if ((error as { name?: string }).name === 'NotFoundException') return;
      }
    );

    fallbackScannerRef.current = {
      stop: () => controls.stop(),
    };
    setEngine('fallback');
    setIsStarting(false);
  }, [handleDetected]);

  const startNativeScanner = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const detectorClass = getBarcodeDetector();
    if (!detectorClass) {
      await startFallbackScanner();
      return;
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280, max: 1280 },
        height: { ideal: 720, max: 720 },
      },
    });

    streamRef.current = stream;
    video.srcObject = stream;
    video.setAttribute('playsinline', 'true');
    await video.play();

    let formats = NATIVE_FORMATS;
    if (detectorClass.getSupportedFormats) {
      const supported = await detectorClass.getSupportedFormats();
      const commonFormats = NATIVE_FORMATS.filter((item) => supported.includes(item));
      if (commonFormats.length > 0) {
        formats = commonFormats;
      }

      const hasAnyBarcodeSupport = BARCODE_ONLY_NATIVE_FORMATS.some((item) => formats.includes(item));
      if (!hasAnyBarcodeSupport) {
        await startFallbackScanner();
        return;
      }
    }

    const detector = new detectorClass({ formats });
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      throw new Error('No se pudo inicializar el contexto de procesamiento.');
    }

    setEngine('native');
    setIsStarting(false);

    const processFrame = async (timestamp: number) => {
      if (!aliveRef.current || hasScannedRef.current) {
        return;
      }

      animationFrameRef.current = requestAnimationFrame(processFrame);

      if (detectInFlightRef.current) return;
      if (timestamp - lastScanTsRef.current < SCAN_INTERVAL_MS) return;
      if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;

      const sourceWidth = video.videoWidth;
      const sourceHeight = video.videoHeight;
      if (!sourceWidth || !sourceHeight) return;

      const roiWidth = Math.floor(sourceWidth * 0.86);
      const roiHeight = Math.floor(sourceHeight * 0.30);
      const sx = Math.floor((sourceWidth - roiWidth) / 2);
      const sy = Math.floor((sourceHeight - roiHeight) / 2);

      canvas.width = roiWidth;
      canvas.height = roiHeight;
      ctx.drawImage(video, sx, sy, roiWidth, roiHeight, 0, 0, roiWidth, roiHeight);

      detectInFlightRef.current = true;
      lastScanTsRef.current = timestamp;

      try {
        const results = await detector.detect(canvas);
        const match = results.find((item) => Boolean(item.rawValue));
        if (match?.rawValue) {
          handleDetected(match.rawValue);
        }
      } finally {
        detectInFlightRef.current = false;
      }
    };

    animationFrameRef.current = requestAnimationFrame(processFrame);
  }, [handleDetected, startFallbackScanner]);

  useEffect(() => {
    if (!isOpen) {
      void stopScanner();
      setError(null);
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError('Este navegador no permite acceso a la cámara.');
      return;
    }

    hasScannedRef.current = false;
    setError(null);
    setIsStarting(true);
    aliveRef.current = true;

    void startNativeScanner().catch(async (err: unknown) => {
      const message = err instanceof Error ? err.message : 'No se pudo iniciar el escáner.';
      const detectorClass = getBarcodeDetector();

      if (detectorClass) {
        setError(message);
        setIsStarting(false);
        return;
      }

      try {
        await startFallbackScanner();
      } catch (fallbackError) {
        const fallbackMessage =
          fallbackError instanceof Error ? fallbackError.message : 'No se pudo iniciar la cámara.';
        setError(fallbackMessage);
        setIsStarting(false);
      }
    });

    return () => {
      void stopScanner();
    };
  }, [isOpen, startFallbackScanner, startNativeScanner, stopScanner]);

  const engineLabel = useMemo(() => {
    if (engine === 'native') return 'Escaneo nativo';
    if (engine === 'fallback') return 'Escaneo fallback';
    return 'Iniciando cámara';
  }, [engine]);

  if (!isOpen) return null;

  const shellClassName = isMobile
    ? 'fixed inset-0 z-[200] flex flex-col bg-black'
    : 'fixed inset-0 z-[200] flex items-center justify-center bg-black/60';

  const panelClassName = isMobile
    ? 'relative flex-1 flex flex-col bg-black'
    : 'relative w-full max-w-md rounded-xl overflow-hidden bg-black shadow-xl';

  return (
    <div className={shellClassName}>
      <div className={panelClassName}>
        <div className="flex items-center justify-between px-4 py-3 bg-slate-900/90 backdrop-blur-sm shrink-0">
          <div>
            <h2 className="text-base font-semibold text-white">Escanear QR / Código</h2>
            <p className="text-xs text-slate-300">{engineLabel}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-800 text-white transition-colors"
            aria-label="Cerrar escáner"
          >
            <X size={20} />
          </button>
        </div>

        <div className="relative flex-1 bg-black overflow-hidden">
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            muted
            playsInline
            autoPlay
          />

          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="w-[86%] h-[30%] rounded-2xl border-2 border-emerald-400/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
          </div>

          {isStarting && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/35">
              <div className="rounded-xl bg-slate-900/90 px-4 py-3 text-sm text-white">
                Activando cámara...
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="px-4 py-3 text-sm text-red-300 bg-slate-900 border-t border-slate-800">
            {error}
          </div>
        )}

        {engine === 'fallback' && (
          <div className="px-4 py-2 text-xs text-amber-300 bg-slate-900 border-t border-slate-800">
            Fallback activo: soporte para {FALLBACK_SUPPORTED_FORMATS.join(', ')}.
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
