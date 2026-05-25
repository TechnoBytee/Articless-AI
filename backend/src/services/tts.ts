import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const audioDir = path.join(__dirname, '../../../data/audio');
if (!fs.existsSync(audioDir)) {
  fs.mkdirSync(audioDir, { recursive: true });
}

export const generateAudio = async (text: string): Promise<string> => {
  const tts = new MsEdgeTTS();
  await tts.setMetadata('tr-TR-EmelNeural', OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
  
  // Generate a unique filename based on the text hash
  const hash = crypto.createHash('md5').update(text).digest('hex');
  const filename = `${hash}.mp3`;
  const filepath = path.join(audioDir, filename);

  if (fs.existsSync(filepath)) {
      return filename; // Return cached if exists
  }

  return new Promise((resolve, reject) => {
    let streamObj: any;
    try {
      streamObj = tts.toStream(text);
      if (!streamObj || !streamObj.audioStream) {
        throw new Error('TTS streamObj veya audioStream oluşturulamadı.');
      }
    } catch (err) {
      if (fs.existsSync(filepath)) {
        try { fs.unlinkSync(filepath); } catch (_) {}
      }
      return reject(err);
    }

    const writeStream = fs.createWriteStream(filepath);
    let finished = false;

    const cleanupAndReject = (err: any) => {
      if (finished) return;
      finished = true;
      writeStream.destroy();
      try {
        if (streamObj.audioStream && typeof streamObj.audioStream.destroy === 'function') {
          streamObj.audioStream.destroy();
        }
      } catch (_) {}
      if (fs.existsSync(filepath)) {
        try { fs.unlinkSync(filepath); } catch (_) {}
      }
      reject(err);
    };

    streamObj.audioStream.on('error', (err: any) => {
      cleanupAndReject(err);
    });

    writeStream.on('error', (err: any) => {
      cleanupAndReject(err);
    });

    writeStream.on('finish', () => {
      finished = true;
      resolve(filename);
    });

    try {
      streamObj.audioStream.pipe(writeStream);
    } catch (err) {
      cleanupAndReject(err);
    }
  });
};
