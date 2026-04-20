import { useState, useEffect } from "react";

interface StreamConfig {
  cameraId: string;
  rtspUrl?: string; // Future implementation: RTSP stream URL
  fallbackImageUrl?: string;
}

interface StreamStatus {
  isConnecting: boolean;
  isConnected: boolean;
  error: Error | null;
  streamUrl: string; // The active URL to feed to a video element
}

/**
 * Architectural Hook for CCTV IP Camera streaming.
 * Currently uses mock/fallback images, but designed to easily swap to WebRTC/RTSP when hardware is ready.
 */
export const useCCTVStream = (config: StreamConfig): StreamStatus => {
  const [status, setStatus] = useState<StreamStatus>({
    isConnecting: true,
    isConnected: false,
    error: null,
    streamUrl: "",
  });

  useEffect(() => {
    // Mock connection process
    let mounted = true;

    const connectStream = async () => {
      try {
        // In future: establish WebRTC peer connection or setup RTSP proxy here
        // For now, simulate network delay then serve fallback
        await new Promise((resolve) => setTimeout(resolve, 800));

        if (mounted) {
          setStatus({
            isConnecting: false,
            isConnected: true,
            error: null,
            streamUrl: config.fallbackImageUrl || "",
          });
        }
      } catch (err) {
        if (mounted) {
          setStatus({
            isConnecting: false,
            isConnected: false,
            error:
              err instanceof Error
                ? err
                : new Error("Failed to connect to camera"),
            streamUrl: "",
          });
        }
      }
    };

    connectStream();

    return () => {
      mounted = false;
      // In future: cleanup RTCPeerConnection here
    };
  }, [config.cameraId, config.rtspUrl, config.fallbackImageUrl]);

  return status;
};
