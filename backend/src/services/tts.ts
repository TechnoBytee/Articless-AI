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
    try {
        const streamObj = tts.toStream(text);
        const writeStream = fs.createWriteStream(filepath);
        
        streamObj.audioStream.pipe(writeStream);
        writeStream.on('finish', () => resolve(filename));
        writeStream.on('error', reject);
    } catch (error) {
        reject(error);
    }
  });
};
