export class AudioPlayer {
  volume = 1;
  loop = false;
  playing = false;
  play() { this.playing = true; }
  pause() { this.playing = false; }
  seekTo(_pos: number) {}
  remove() { this.playing = false; }
}

export function createAudioPlayer(_source: unknown): AudioPlayer {
  return new AudioPlayer();
}

export async function setAudioModeAsync(_opts: unknown): Promise<void> {}
