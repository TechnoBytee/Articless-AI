"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAudio = void 0;
const msedge_tts_1 = require("msedge-tts");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const crypto_1 = __importDefault(require("crypto"));
const audioDir = path_1.default.join(__dirname, '../../../data/audio');
if (!fs_1.default.existsSync(audioDir)) {
    fs_1.default.mkdirSync(audioDir, { recursive: true });
}
const generateAudio = async (text) => {
    const tts = new msedge_tts_1.MsEdgeTTS();
    await tts.setMetadata('tr-TR-EmelNeural', msedge_tts_1.OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    // Generate a unique filename based on the text hash
    const hash = crypto_1.default.createHash('md5').update(text).digest('hex');
    const filename = `${hash}.mp3`;
    const filepath = path_1.default.join(audioDir, filename);
    if (fs_1.default.existsSync(filepath)) {
        return filename; // Return cached if exists
    }
    return new Promise((resolve, reject) => {
        try {
            const streamObj = tts.toStream(text);
            const writeStream = fs_1.default.createWriteStream(filepath);
            streamObj.audioStream.pipe(writeStream);
            writeStream.on('finish', () => resolve(filename));
            writeStream.on('error', reject);
        }
        catch (error) {
            reject(error);
        }
    });
};
exports.generateAudio = generateAudio;
