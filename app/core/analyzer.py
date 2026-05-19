"""Viral clip detection — supports OpenAI GPT and Groq LLaMA"""
import json
import re
from openai import OpenAI

# Provider configs for LLM
LLM_PROVIDERS = {
    'openai': {
        'base_url': None,
        'model': 'gpt-4o-mini',
    },
    'groq': {
        'base_url': 'https://api.groq.com/openai/v1',
        'model': 'llama-3.1-8b-instant', # More stable rate limits than 70b
    }
}

SYSTEM_PROMPT = """You are a world-class Viral Content Strategist and Video Editor for high-profile podcasts (Joe Rogan, Diary of a CEO, Alex Hormozi style).

Your task is to analyze the podcast transcript and extract the absolute BEST moments that will explode on social media (TikTok, Reels, Shorts).

CRITICAL DIRECTIVES:
1. THE HOOK IS EVERYTHING: Prioritize moments that start with a "Pattern Interrupt" — a shocking statement, a deep question, a counter-intuitive fact, or high-emotion energy.
2. RETENTION FOCUSED: Clips should maintain high tension or high value throughout. No "dead air" or slow build-ups.
3. COMPLETENESS: A clip must be a self-contained story or point. It must have a setup, a middle (climax/insight), and a satisfying resolution or "loopable" ending.
4. AGGRESSIVE SELECTION: Do not pick boring segments. If only 3 moments are truly viral, only pick 3. If the whole thing is gold, pick up to 8.

SELECTION CRITERIA:
- CONTROVERSY: Hot takes that people will argue about in the comments.
- EMOTION: Moments of raw vulnerability, extreme joy, or intense passion.
- VALUE: "Aha!" moments where the listener learns something life-changing in 60 seconds.
- HUMOR: Genuine laugh-out-loud moments or sharp wit.
- CLIFFHANGERS: Moments that make people want to watch the full episode.

OUTPUT REQUIREMENTS:
- Duration: 30-75 seconds is the "sweet spot" for virality.
- Timing: Ensure start_time and end_time are extremely precise based on the transcript.
- JSON: Return ONLY valid JSON in the specified format.

JSON FORMAT:
{
    "clips": [
        {
            "title": "CATCHY VIRAL TITLE",
            "hook_caption": "RETENTION HOOK (Text that would be the first thing people see)",
            "start_time": 00.0,
            "end_time": 00.0,
            "virality_score": 9.8,
            "reason": "Why this specific moment will trigger the algorithm",
            "category": "hot_take",
            "hashtags": ["#viral", "#podcast", "#hook"]
        }
    ]
}"""


def clean_and_parse_json(text):
    """Extract and parse JSON from LLM response, handling markdown blocks or formatting issues"""
    if not text:
        return None
    text = text.strip()
    
    # Remove markdown code block wrappers if present (e.g. ```json ... ```)
    match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', text, re.IGNORECASE)
    if match:
        text = match.group(1).strip()
        
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Fallback: try to find the outer JSON object { ... } or list [ ... ]
        try:
            start_idx = text.find('{')
            end_idx = text.rfind('}')
            if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
                return json.loads(text[start_idx:end_idx + 1])
        except Exception:
            pass
    return None


def _run_analyze_transcript(transcript_data, api_key, progress_callback=None, provider='groq'):
    """Send transcript to LLM to find viral-worthy moments with strict validation"""
    config = LLM_PROVIDERS.get(provider, LLM_PROVIDERS['groq'])

    kwargs = {'api_key': api_key}
    if config['base_url']:
        kwargs['base_url'] = config['base_url']
    client = OpenAI(**kwargs)

    if progress_callback:
        progress_callback("Analyzing transcript for viral moments...", 58)

    # Get video duration from transcript_data
    duration = float(transcript_data.get('duration', 0.0))
    if duration <= 0.0 and transcript_data.get('segments'):
        duration = float(transcript_data['segments'][-1].get('end', 0.0))

    # Group segments into chunks to avoid token limits
    MAX_WORDS_PER_CHUNK = 1000  # approx 1300 tokens
    chunks = []
    current_chunk = []
    current_word_count = 0
    
    for seg in transcript_data['segments']:
        words_in_seg = len(seg.get('text', '').split())
        if current_word_count + words_in_seg > MAX_WORDS_PER_CHUNK and current_chunk:
            chunks.append(current_chunk)
            current_chunk = [seg]
            current_word_count = words_in_seg
        else:
            current_chunk.append(seg)
            current_word_count += words_in_seg
            
    if current_chunk:
        chunks.append(current_chunk)

    all_clips = []
    total_chunks = len(chunks)
    
    if progress_callback:
        progress_callback(f"AI is finding viral moments across {total_chunks} parts...", 60)
        
    for i, chunk in enumerate(chunks):
        segments_text = "\n".join([
            f"[{seg['start']:.1f}s - {seg['end']:.1f}s] {seg['text']}"
            for seg in chunk
        ])
        
        user_prompt = f"""Here is a section of the podcast transcript with timestamps:
 
{segments_text}
 
Identify the top 1-3 most viral-worthy moments in this section. Each clip should be 30-90 seconds.
Return ONLY valid JSON."""

        create_kwargs = {
            'model': config['model'],
            'messages': [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt}
            ],
            'temperature': 0.7,
            'max_tokens': 1000,
            'response_format': {"type": "json_object"}
        }
        
        try:
            response = client.chat.completions.create(**create_kwargs)
            raw_content = response.choices[0].message.content
            result = clean_and_parse_json(raw_content)
            
            if result and isinstance(result, dict):
                raw_clips = result.get('clips', [])
                if isinstance(raw_clips, list):
                    for clip in raw_clips:
                        if not isinstance(clip, dict):
                            continue
                            
                        # Sanitize text fields
                        title = str(clip.get('title', 'Viral Clip moment')).strip()
                        if not title:
                            title = "Viral Clip moment"
                            
                        hook_caption = str(clip.get('hook_caption', title)).strip()
                        if not hook_caption:
                            hook_caption = title
                            
                        reason = str(clip.get('reason', 'High virality segment.')).strip()
                        category = str(clip.get('category', 'general')).strip()
                        
                        # Validate hashtags
                        raw_tags = clip.get('hashtags', ['#viral', '#shorts'])
                        if isinstance(raw_tags, list):
                            hashtags = [str(t).strip() for t in raw_tags if t]
                        else:
                            hashtags = ['#viral', '#shorts']
                            
                        # Parse start_time and end_time
                        try:
                            start_time = float(clip.get('start_time', 0.0))
                        except (ValueError, TypeError):
                            start_time = 0.0
                            
                        try:
                            end_time = float(clip.get('end_time', start_time + 30.0))
                        except (ValueError, TypeError):
                            end_time = start_time + 30.0
                            
                        # Keep start_time within bounds
                        if start_time < 0.0:
                            start_time = 0.0
                        if duration > 0.0 and start_time >= duration:
                            start_time = max(0.0, duration - 30.0)
                            
                        # Keep end_time within bounds
                        if duration > 0.0 and end_time > duration:
                            end_time = duration
                            
                        # Ensure duration of clip is valid
                        if end_time <= start_time:
                            if duration > start_time:
                                end_time = min(duration, start_time + 30.0)
                            else:
                                start_time = max(0.0, end_time - 30.0)
                                
                        # If the clip is extremely short (< 2.0s), make it longer
                        if (end_time - start_time) < 2.0:
                            if duration > start_time + 10.0:
                                end_time = min(duration, start_time + 30.0)
                            else:
                                start_time = max(0.0, end_time - 30.0)
                                
                        # Round times to 1 decimal place
                        start_time = round(start_time, 1)
                        end_time = round(end_time, 1)
                        
                        # Validate virality_score
                        try:
                            virality_score = float(clip.get('virality_score', 8.5))
                        except (ValueError, TypeError):
                            virality_score = 8.5
                        virality_score = max(0.0, min(10.0, virality_score))
                        
                        all_clips.append({
                            'title': title,
                            'hook_caption': hook_caption,
                            'start_time': start_time,
                            'end_time': end_time,
                            'virality_score': virality_score,
                            'reason': reason,
                            'category': category,
                            'hashtags': hashtags
                        })
        except Exception as e:
            print(f"Error analyzing chunk {i+1}: {e}")
            
        if progress_callback:
            pct = 60 + int(((i + 1) / total_chunks) * 10)
            progress_callback(f"Analyzed part {i+1} of {total_chunks}...", pct)

    # Fallback: if no clips found, generate at least one default clip
    if not all_clips:
        print("No viral moments found or analysis failed. Generating fallback clips.")
        total_dur = duration if duration > 0.0 else 30.0
        clip_end = min(total_dur, 60.0)
        all_clips.append({
            'title': "Spotlight Moment",
            'hook_caption': "Must-watch segment from this episode",
            'start_time': 0.0,
            'end_time': round(clip_end, 1),
            'virality_score': 8.0,
            'reason': "Fallback clip generated automatically.",
            'category': "general",
            'hashtags': ["#podcast", "#viral", "#spotlight"]
        })
        
        if total_dur > 120.0:
            mid_start = round(total_dur / 2.0, 1)
            mid_end = min(total_dur, mid_start + 45.0)
            all_clips.append({
                'title': "Key Insight",
                'hook_caption': "A deep insight from the middle of the discussion",
                'start_time': mid_start,
                'end_time': round(mid_end, 1),
                'virality_score': 8.2,
                'reason': "Fallback middle clip generated automatically.",
                'category': "general",
                'hashtags': ["#insight", "#viral"]
            })

    # Sort and take top ones
    all_clips.sort(key=lambda x: x.get('virality_score', 0), reverse=True)
    top_clips = all_clips[:8]

    if progress_callback:
        progress_callback(f"Found {len(top_clips)} viral moments!", 70)

    return top_clips


def analyze_transcript(transcript_data, api_key, progress_callback=None, provider='groq'):
    """Send transcript to LLM to find viral-worthy moments with automatic OpenAI fallback on rate limit"""
    try:
        return _run_analyze_transcript(transcript_data, api_key, progress_callback, provider)
    except Exception as e:
        err_msg = str(e).lower()
        if provider == 'groq' and ("rate_limit" in err_msg or "429" in err_msg or "rate limit" in err_msg):
            from app.config import OPENAI_API_KEY
            if OPENAI_API_KEY:
                if progress_callback:
                    progress_callback("Groq LLM rate limit hit. Falling back to OpenAI GPT...", 59)
                print("[Analyzer] Groq rate limit hit. Falling back to OpenAI GPT...")
                try:
                    return _run_analyze_transcript(transcript_data, OPENAI_API_KEY, progress_callback, provider='openai')
                except Exception as openai_err:
                    raise RuntimeError(f"Analysis failed: Groq rate limit exceeded and OpenAI fallback also failed: {openai_err}")
            else:
                raise RuntimeError(
                    f"Groq LLM rate limit exceeded. Please wait a few minutes, or set "
                    f"OPENAI_API_KEY in your .env file to enable automatic fallback. Details: {e}"
                )
        raise e
