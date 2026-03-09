import { useState, useRef, useEffect, useCallback } from 'react';

export function useVideoSystem(
    data: any,
    sendData: (updates: any) => Promise<void>,
    showToast: (msg: string, ok?: boolean) => void
) {
    const [videoList, setVideoList] = useState<string[]>([]);
    const [videoViewMode, setVideoViewMode] = useState<'playlist' | 'files'>('playlist');
    const [showStandbyConfirm, setShowStandbyConfirm] = useState(false);
    const [showClearPlaylistConfirm, setShowClearPlaylistConfirm] = useState(false);
    const [loadingVideos, setLoadingVideos] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const lastProgressSync = useRef(0);
    const lastVolumeRef = useRef(data?.volume || 50);

    // Derived video state
    const playlist = data?.videoPlaylist || [];
    const activeIndex = data?.activeVideoIndex ?? 0;
    const isPlaying = data?.isPlaying ?? false;
    const playbackMode = data?.playbackMode || 'normal';
    const activeFile = playlist[activeIndex];

    const handleVideoAction = useCallback(async (updates: any) => {
        await sendData(updates);
    }, [sendData]);

    const fetchVideos = useCallback(async () => {
        try {
            setLoadingVideos(true);
            const res = await fetch('http://localhost:3001/api/media/videos');
            const d = await res.json();
            if (d.success) setVideoList(d.videos);
        } catch (e) {
            console.error("Failed to fetch videos:", e);
        } finally {
            setLoadingVideos(false);
        }
    }, []);

    useEffect(() => {
        fetchVideos();
    }, [fetchVideos]);

    const toggleMute = () => {
        if ((data?.volume || 0) > 0) {
            lastVolumeRef.current = data?.volume || 50;
            handleVideoAction({ volume: 0 });
        } else {
            handleVideoAction({ volume: lastVolumeRef.current || 50 });
        }
    };

    const addToPlaylist = (file: string) => {
        const newPlaylist = [...playlist, file];
        handleVideoAction({ videoPlaylist: newPlaylist });
        showToast(`"${file}" ditambahkan ke playlist`);
    };

    const removeFromPlaylist = (idx: number) => {
        const newPlaylist = playlist.filter((_: any, i: number) => i !== idx);
        let newIndex = activeIndex;
        if (activeIndex >= newPlaylist.length && newPlaylist.length > 0) newIndex = newPlaylist.length - 1;
        handleVideoAction({ videoPlaylist: newPlaylist, activeVideoIndex: newIndex, playbackProgress: 0 });
    };

    const playVideoAt = (idx: number) => {
        handleVideoAction({ activeVideoIndex: idx, isPlaying: false, playbackProgress: 0 });
    };

    const togglePlay = () => {
        if (playlist.length === 0) return showToast('Playlist kosong');
        handleVideoAction({ isPlaying: !isPlaying });
        showToast(isPlaying ? 'Video dijeda' : 'Memutar video');
    };

    const nextVideo = () => {
        if (playlist.length === 0) return;
        if (playbackMode === 'normal' && activeIndex === playlist.length - 1) {
            handleVideoAction({
                activeVideoIndex: 0,
                isPlaying: false,
                playbackProgress: 0,
                tvStandby: true
            });
            return;
        }
        const nextIdx = (activeIndex + 1) % playlist.length;
        handleVideoAction({ activeVideoIndex: nextIdx, isPlaying: isPlaying, playbackProgress: 0 });
    };

    const prevVideo = () => {
        if (playlist.length === 0) return;
        const prevIdx = (activeIndex - 1 + playlist.length) % playlist.length;
        handleVideoAction({ activeVideoIndex: prevIdx, isPlaying: isPlaying, playbackProgress: 0 });
    };

    const toggleRepeat = () => {
        const repeatModes = ['normal', 'repeat-one', 'repeat-all'];
        const currentMode = playbackMode === 'shuffle' ? 'normal' : playbackMode;
        const nextMode = repeatModes[(repeatModes.indexOf(currentMode) + 1) % repeatModes.length];
        handleVideoAction({ playbackMode: nextMode });
        showToast(`Repeat: ${nextMode.charAt(0).toUpperCase() + nextMode.slice(1).toLowerCase()}`);
    };

    const toggleShuffle = () => {
        const isShuffle = playbackMode === 'shuffle';
        handleVideoAction({ playbackMode: isShuffle ? 'normal' : 'shuffle' });
        showToast(isShuffle ? 'Urutan normal' : 'Mode acak diaktifkan');
    };

    const handleSelectDirectory = async () => {
        try {
            // @ts-ignore
            const selectedDir = await window.require('electron').ipcRenderer.invoke('select-directory');
            if (selectedDir) {
                const res = await fetch('http://localhost:3001/api/media/directory', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ directory: selectedDir })
                });
                const d = await res.json();
                if (d.success) {
                    showToast(`Direktori diubah ke: ${selectedDir}`);
                    fetchVideos();
                    setVideoViewMode('files');
                }
            }
        } catch (e) {
            console.error("Failed to select directory:", e);
            showToast('Gagal membuka browser direktori');
        }
    };

    // Video effect for sync state
    useEffect(() => {
        if (!videoRef.current) return;
        const vid = videoRef.current;
        vid.volume = (data?.volume ?? 50) / 100;

        if (data?.isPlaying) {
            if (vid.paused) vid.play().catch(e => console.error("Play failed:", e));
        } else {
            if (!vid.paused) vid.pause();
        }
    }, [data?.isPlaying, data?.volume]);

    useEffect(() => {
        if (!videoRef.current || isNaN(videoRef.current.duration)) return;
        const vid = videoRef.current;
        const targetTime = ((data?.playbackProgress || 0) / 100) * (vid.duration || 1);
        if (Math.abs(vid.currentTime - targetTime) > 2) {
            vid.currentTime = targetTime;
        }
    }, [data?.playbackProgress]);

    return {
        // State
        videoList,
        videoViewMode,
        setVideoViewMode,
        showStandbyConfirm,
        setShowStandbyConfirm,
        showClearPlaylistConfirm,
        setShowClearPlaylistConfirm,
        loadingVideos,
        videoRef,
        lastProgressSync,
        // Derived
        playlist,
        activeIndex,
        isPlaying,
        playbackMode,
        activeFile,
        // Actions
        handleVideoAction,
        fetchVideos,
        toggleMute,
        addToPlaylist,
        removeFromPlaylist,
        playVideoAt,
        togglePlay,
        nextVideo,
        prevVideo,
        toggleRepeat,
        toggleShuffle,
        handleSelectDirectory,
    };
}
