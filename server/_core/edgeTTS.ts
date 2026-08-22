import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { storagePut } from '../storage';

// 6명 면접관 아바타별 완전히 다른 마이크로소프트 신경망 음성 매핑 (김지현, 이수진, 박준혁, 정민수, 최현우, 한승민)
const VOICE_MAPPING: Record<string, { voice: string; defaultRate: string; defaultPitch: string }> = {
  kim: { voice: 'ko-KR-SunHiNeural', defaultRate: '+15%', defaultPitch: '+8Hz' },         // 김지현 팀장: 또렷하고 빠른 전문 여성
  lee: { voice: 'ko-KR-JiMinNeural', defaultRate: '+5%', defaultPitch: '+15Hz' },        // 이수진 매니저: 밝고 친근한 높은 여성
  park: { voice: 'ko-KR-BongJinNeural', defaultRate: '-12%', defaultPitch: '-15Hz' },    // 박준혁 부장: 무게감 있고 낮은 중후한 남성
  jeong: { voice: 'ko-KR-InJoonNeural', defaultRate: '-3%', defaultPitch: '-5Hz' },      // 정민수 차장: 차분하고 신중한 남성
  choi: { voice: 'ko-KR-SoonBokNeural', defaultRate: '+10%', defaultPitch: '+2Hz' },     // 최현우 리드: 열정적이고 빠른 테크 남성
  han: { voice: 'ko-KR-HyunSuNeural', defaultRate: '-15%', defaultPitch: '-18Hz' },      // 한승민 상무: 매우 낮고 권위 있는 임원 남성
  // 레거시 폴백
  female1: { voice: 'ko-KR-SunHiNeural', defaultRate: '+15%', defaultPitch: '+8Hz' },
  female2: { voice: 'ko-KR-JiMinNeural', defaultRate: '+5%', defaultPitch: '+15Hz' },
  male1: { voice: 'ko-KR-BongJinNeural', defaultRate: '-12%', defaultPitch: '-15Hz' },
  male2: { voice: 'ko-KR-InJoonNeural', defaultRate: '-3%', defaultPitch: '-5Hz' },
  natural: { voice: 'ko-KR-InJoonNeural', defaultRate: '+0%', defaultPitch: '+0Hz' },
};

export interface TTSOptions {
  text: string;
  voiceType: string;
  rate?: string; // 속도 조절 (예: '+20%', '-10%', '+0%')
  pitch?: string; // 음높이 조절 (예: '+5Hz', '-10Hz', '+0Hz')
}

/**
 * Edge TTS를 사용하여 텍스트를 음성으로 변환하고 S3에 업로드
 * @param options TTS 옵션
 * @returns S3에 업로드된 오디오 파일 URL
 */
export async function generateTTS(options: TTSOptions): Promise<string> {
  const { text, voiceType, rate = '+0%', pitch = '+0Hz' } = options;
  
  // voiceType에 따른 음성 및 고유 프로필 선택
  const profile = VOICE_MAPPING[voiceType] || VOICE_MAPPING.natural;
  const voice = profile.voice;
  const finalRate = rate !== '+0%' ? rate : profile.defaultRate;
  const finalPitch = pitch !== '+0Hz' ? pitch : profile.defaultPitch;
  
  // 임시 파일 경로
  const tempDir = '/tmp';
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(7);
  const tempFilePath = path.join(tempDir, `tts_${timestamp}_${randomSuffix}.mp3`);
  
  try {
    // Edge TTS 명령 실행
    await new Promise<void>((resolve, reject) => {
      // 사용자 텍스트를 Python 코드 문자열에 삽입하지 않고 argv로 전달한다.
      // 따옴표·개행·백슬래시가 포함된 질문도 안전하게 처리할 수 있다.
      const pythonCode = `
import asyncio
import sys
from edge_tts import Communicate

async def main():
    text, voice, rate, pitch, output_path = sys.argv[1:6]
    communicate = Communicate(text=text, voice=voice, rate=rate, pitch=pitch)
    await communicate.save(output_path)

asyncio.run(main())
`;
      
      // PYTHONHOME/PYTHONPATH 환경변수가 충돌을 일으킬 수 있으므로 제거
      const pythonProcess = spawn('python3', ['-c', pythonCode, text, voice, finalRate, finalPitch, tempFilePath], {
        env: {
          ...process.env,
          PYTHONHOME: '',
          PYTHONPATH: '',
        }
      });
      
      let stderr = '';
      
      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Edge TTS failed${stderr ? `: ${stderr.trim().slice(0, 500)}` : ''}`));
        } else {
          resolve();
        }
      });
      
      pythonProcess.on('error', (error) => {
        reject(error);
      });
    });
    
    // 생성된 오디오 파일 읽기
    const audioBuffer = await fs.readFile(tempFilePath);
    
    // S3에 업로드
    const s3Key = `tts/${timestamp}_${randomSuffix}.mp3`;
    const { url } = await storagePut(s3Key, audioBuffer, 'audio/mpeg');
    
    // 임시 파일 삭제
    await fs.unlink(tempFilePath).catch(() => {});
    
    return url;
  } catch (error) {
    // 임시 파일 삭제 (오류 발생 시에도)
    await fs.unlink(tempFilePath).catch(() => {});
    throw error;
  }
}
