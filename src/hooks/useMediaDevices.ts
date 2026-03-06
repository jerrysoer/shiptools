"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { AudioDevice, VideoDevice } from "@/lib/recording/types";
import {
  getAudioInputDevices,
  getVideoInputDevices,
} from "@/lib/recording/devices";

/**
 * Device selection + permission tracking.
 *
 * Usage:
 *   const {
 *     audioInputs, videoInputs, permissionState,
 *     selectedAudioInput, setSelectedAudioInput,
 *     selectedVideoInput, setSelectedVideoInput,
 *     refresh,
 *   } = useMediaDevices();
 */
export function useMediaDevices() {
  const [audioInputs, setAudioInputs] = useState<AudioDevice[]>([]);
  const [videoInputs, setVideoInputs] = useState<VideoDevice[]>([]);
  const [selectedAudioInput, setSelectedAudioInput] = useState<string>("");
  const [selectedVideoInput, setSelectedVideoInput] = useState<string>("");
  const [permissionState, setPermissionState] = useState<
    "prompt" | "granted" | "denied"
  >("prompt");

  // Use refs for selected values so refresh has a stable identity
  const selectedAudioRef = useRef(selectedAudioInput);
  selectedAudioRef.current = selectedAudioInput;
  const selectedVideoRef = useRef(selectedVideoInput);
  selectedVideoRef.current = selectedVideoInput;

  const refresh = useCallback(async () => {
    try {
      const [audio, video] = await Promise.all([
        getAudioInputDevices(),
        getVideoInputDevices(),
      ]);
      setAudioInputs(audio);
      setVideoInputs(video);
      if (audio.length > 0 && !selectedAudioRef.current) {
        setSelectedAudioInput(audio[0].deviceId);
      }
      if (video.length > 0 && !selectedVideoRef.current) {
        setSelectedVideoInput(video[0].deviceId);
      }
      setPermissionState("granted");
    } catch {
      setPermissionState("denied");
    }
  }, []);

  useEffect(() => {
    refresh();
    // Listen for device changes (hot-plug)
    navigator.mediaDevices?.addEventListener("devicechange", refresh);
    return () => {
      navigator.mediaDevices?.removeEventListener("devicechange", refresh);
    };
  }, [refresh]);

  return {
    audioInputs,
    videoInputs,
    permissionState,
    selectedAudioInput,
    setSelectedAudioInput,
    selectedVideoInput,
    setSelectedVideoInput,
    refresh,
  };
}
