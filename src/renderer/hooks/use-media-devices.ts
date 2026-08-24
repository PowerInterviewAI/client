import { useEffect, useState } from 'react';

export interface MediaDevicesResult<T> {
  devices: T[];
  /**
   * False until the first `enumerateDevices()` call has settled.
   *
   * An empty list means two different things - "not asked yet" and "this machine has none" -
   * and callers that cannot tell them apart report the second one during the first few frames
   * after mount. Every consumer that renders a warning or blocks an action needs the difference.
   */
  ready: boolean;
}

export function useMediaDevices<T>(
  kind: MediaDeviceKind,
  transform: (devices: MediaDeviceInfo[]) => T[]
): MediaDevicesResult<T> {
  const [result, setResult] = useState<MediaDevicesResult<T>>({ devices: [], ready: false });

  useEffect(() => {
    let cancelled = false;

    async function fetch() {
      let devices: T[] = [];
      try {
        const all = await navigator.mediaDevices.enumerateDevices();
        devices = transform(all.filter((d) => d.kind === kind));
      } catch {
        // enumerateDevices is not available in all environments. Still marked ready: the answer
        // is "none available", and leaving it pending forever hides that from every caller.
      }
      if (cancelled) return;
      setResult({ devices, ready: true });
    }

    fetch();
    navigator.mediaDevices.addEventListener('devicechange', fetch);
    return () => {
      cancelled = true;
      navigator.mediaDevices.removeEventListener('devicechange', fetch);
    };
  }, [kind]); // eslint-disable-line react-hooks/exhaustive-deps

  return result;
}
