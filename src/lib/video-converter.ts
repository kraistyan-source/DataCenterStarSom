import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;

async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpeg && ffmpeg.loaded) return ffmpeg;
  ffmpeg = new FFmpeg();
  // Load from CDN
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
  await ffmpeg.load({
    coreURL: `${baseURL}/ffmpeg-core.js`,
    wasmURL: `${baseURL}/ffmpeg-core.wasm`,
  });
  return ffmpeg;
}

export type ConversionProgress = (ratio: number) => void;

/**
 * Returns true if the file needs conversion (MOV or non-MP4 video).
 */
export function needsConversion(file: File): boolean {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  return (
    type === 'video/quicktime' ||
    name.endsWith('.mov') ||
    (type.startsWith('video/') && type !== 'video/mp4' && type !== 'video/webm')
  );
}

/**
 * Converts a video file to MP4 using FFmpeg.wasm.
 * Returns the converted Blob.
 */
export async function convertToMp4(
  file: File,
  onProgress?: ConversionProgress
): Promise<Blob> {
  const ff = await getFFmpeg();

  if (onProgress) {
    ff.on('progress', ({ progress }) => {
      onProgress(Math.min(progress, 1));
    });
  }

  const inputName = 'input' + getExtension(file.name);
  const outputName = 'output.mp4';

  await ff.writeFile(inputName, await fetchFile(file));
  await ff.exec(['-i', inputName, '-c:v', 'libx264', '-preset', 'fast', '-crf', '28', '-c:a', 'aac', '-movflags', '+faststart', outputName]);

  const data = await ff.readFile(outputName);
  // Cleanup
  await ff.deleteFile(inputName);
  await ff.deleteFile(outputName);

  return new Blob([data], { type: 'video/mp4' });
}

function getExtension(filename: string): string {
  const dot = filename.lastIndexOf('.');
  return dot >= 0 ? filename.substring(dot) : '.mov';
}
