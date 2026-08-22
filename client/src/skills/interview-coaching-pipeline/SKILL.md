# AI Interview Coaching Pipeline Skill

## Overview
This skill provides a comprehensive, repeatable framework for designing, developing, and refining AI-driven mock interview platforms. It integrates multi-step wizard configurations, competency-based question generation, real-time voice synthesis with distinct interviewer profiles, audio-reactive waveform animations, user answer recording with STT transcripts, side-by-side comparison viewers, word cloud keyword visualization, category-filtered question list PDF exports, step-by-step skeleton loaders, and filler-word / repetition script highlighting.

## Core Architecture & Workflow
1. **Multi-Step Setup Wizard**:
   - Deconstructs complex onboarding into sequential phases (Basic Info, Resume Check, Stage Selection, Mode Selection, Interviewer Avatar, Timing/Recording) to reduce user cognitive load.
   - Persists user preferences and subtitles across sessions via browser storage (`localStorage`).

2. **Competency-Based Question Generation & Evaluation**:
   - Maps interview stages (Basic Interview, Personality Test, Situational Roleplay, Strategy Games, Deep Follow-up Questions) to dynamic LLM prompt generation structures.
   - Generates immediate multi-perspective feedback (scores, strengths, improvements, suggested answers) upon answer submission.
   - Features stage-aware skeleton loading animations during Whisper STT transcription and AI model answer generation to maintain engagement.

3. **Distinct Voice Synthesis & Audio Feedback**:
   - Assigns unique male and female neural voice IDs and pitch/speed offsets to distinct interviewer personas.
   - Provides real-time audio playback rate adjustments (0.8x - 1.3x), volume sliders, voice preview samples, and dynamic audio-reactive waveform animations during speech.
   - Enables audio recording of user answers during interview sessions, paired with STT transcription viewers, one-click clipboard copying, and visual highlighting of filler words (e.g., "어", "음") and repetitions.

4. **Analytics, History & Export Features**:
   - Implements job role and date range filtering on historical interview sessions with competency growth trend visualizations and keyword word clouds.
   - Supports bookmarking/favorites for difficult questions with instant 'Retry Single Question' and 'Incorrect Note Interview' modes.
   - Provides secure report sharing via unique links with optional password protection and expiration dates.
   - Delivers publication-quality PDF and Word exports featuring Noto Sans CJK Korean font support, side-by-side comparison tables contrasting raw user transcripts with AI correction guides, and category-filtered question list exports.
