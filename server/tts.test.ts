import { describe, it, expect, beforeAll } from 'vitest';
import { generateTTS } from './_core/edgeTTS';
import { storagePut } from './storage';

describe('TTS API', () => {
  it('should generate TTS audio for female voice', async () => {
    const result = await generateTTS({
      text: '안녕하세요. 면접관입니다.',
      voiceType: 'female1',
      rate: '+0%',
      pitch: '+0Hz',
    });
    
    expect(result).toBeTruthy();
    expect(result).toContain('http');
    expect(result).toContain('.mp3');
  }, 30000); // 30초 타임아웃
  
  it('should generate TTS audio for male voice', async () => {
    const result = await generateTTS({
      text: '자기소개를 해주세요.',
      voiceType: 'male1',
      rate: '+0%',
      pitch: '+0Hz',
    });
    
    expect(result).toBeTruthy();
    expect(result).toContain('http');
    expect(result).toContain('.mp3');
  }, 30000);
  
  it('should apply rate and pitch adjustments', async () => {
    const result = await generateTTS({
      text: '이 질문에 대해 답변해주세요.',
      voiceType: 'female1',
      rate: '+20%',
      pitch: '+10Hz',
    });
    
    expect(result).toBeTruthy();
    expect(result).toContain('http');
  }, 30000);
});
