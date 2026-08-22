import { spawn } from "child_process";
import { promises as fs } from "fs";
import path from "path";

const VOICE_MAPPING: Record<string, { voice: string; defaultRate: string; defaultPitch: string }> = {
  kim: { voice: "ko-KR-SunHiNeural", defaultRate: "+3%", defaultPitch: "+0Hz" },
  lee: { voice: "ko-KR-JiMinNeural", defaultRate: "+2%", defaultPitch: "+0Hz" },
  park: { voice: "ko-KR-BongJinNeural", defaultRate: "-3%", defaultPitch: "+0Hz" },
  jeong: { voice: "ko-KR-InJoonNeural", defaultRate: "-2%", defaultPitch: "+0Hz" },
  choi: { voice: "ko-KR-HyunSuNeural", defaultRate: "+2%", defaultPitch: "+0Hz" },
  han: { voice: "ko-KR-HyunSuNeural", defaultRate: "-4%", defaultPitch: "-2Hz" },
  female1: { voice: "ko-KR-SunHiNeural", defaultRate: "+0%", defaultPitch: "+0Hz" },
  female2: { voice: "ko-KR-JiMinNeural", defaultRate: "+0%", defaultPitch: "+0Hz" },
  male1: { voice: "ko-KR-BongJinNeural", defaultRate: "-2%", defaultPitch: "+0Hz" },
  male2: { voice: "ko-KR-InJoonNeural", defaultRate: "-2%", defaultPitch: "+0Hz" },
  natural: { voice: "ko-KR-InJoonNeural", defaultRate: "-2%", defaultPitch: "+0Hz" },
};

export interface TTSOptions { text: string; voiceType: string; rate?: string; pitch?: string }

function normalizeInterviewQuestion(text: string) {
  return text
    .replace(/\s+/g, " ")
    .replace(/([.!?])(?=\S)/g, "$1 ")
    .trim()
    .slice(0, 800);
}

/** Generate one question in a temporary file and return bytes only. Nothing is uploaded or retained. */
export async function generateTTS(options: TTSOptions): Promise<string> {
  const profile = VOICE_MAPPING[options.voiceType] || VOICE_MAPPING.natural;
  const text = normalizeInterviewQuestion(options.text);
  const rate = options.rate && options.rate !== "+0%" ? options.rate : profile.defaultRate;
  // 질문 음성의 과도한 음높이 변형은 한국어 운율을 깨뜨리므로 서버에서 안전 범위로 고정합니다.
  const pitch = profile.defaultPitch;
  const tempFilePath = path.join("/tmp", `jobhill_tts_${Date.now()}_${Math.random().toString(36).slice(2, 9)}.mp3`);

  try {
    await new Promise<void>((resolve, reject) => {
      const pythonCode = `
import asyncio
import sys
from edge_tts import Communicate
async def main():
    text, voice, rate, pitch, output_path = sys.argv[1:6]
    await Communicate(text=text, voice=voice, rate=rate, pitch=pitch).save(output_path)
asyncio.run(main())
`;
      const processHandle = spawn("python3", ["-c", pythonCode, text, profile.voice, rate, pitch, tempFilePath], {
        env: { ...process.env, PYTHONHOME: "", PYTHONPATH: "" },
      });
      let stderr = "";
      processHandle.stderr.on("data", (data) => { stderr += data.toString(); });
      processHandle.on("error", reject);
      processHandle.on("close", (code) => code === 0 ? resolve() : reject(new Error(`Edge TTS failed${stderr ? `: ${stderr.trim().slice(0, 300)}` : ""}`)));
    });
    const audio = await fs.readFile(tempFilePath);
    return `data:audio/mpeg;base64,${audio.toString("base64")}`;
  } finally {
    await fs.unlink(tempFilePath).catch(() => undefined);
  }
}
