"""
Cut Aligner — Snaps LLM clip boundaries to natural speech pauses.

When the LLM picks start/end times, they often land mid-word.
This module finds the nearest silence gap in the Whisper word list
and shifts the boundary to land on a clean natural pause.
"""


def snap_to_silence(target_time: float, words: list, direction: str = "nearest",
                    window: float = 2.0, min_gap: float = 0.15) -> float:
    """
    Snaps a target timestamp to the nearest silence boundary in the word list.

    Args:
        target_time: The raw timestamp from the LLM.
        words: Full word list with 'start' and 'end' timestamps from Whisper.
        direction: 'start' snaps backward (find gap before target),
                   'end' snaps forward (find gap after target),
                   'nearest' picks whichever clean gap is closest.
        window: How many seconds around target_time to search.
        min_gap: Minimum silence duration in seconds to qualify as a pause.

    Returns:
        Adjusted timestamp that lands on a silence boundary,
        or the original target_time if no suitable pause is found.
    """
    if not words:
        return target_time

    # Find all silence gaps within the search window
    candidates = []
    for i in range(len(words) - 1):
        gap_start = words[i]['end']
        gap_end = words[i + 1]['start']
        gap_duration = gap_end - gap_start

        # Only consider real silences
        if gap_duration < min_gap:
            continue

        # The silence midpoint
        gap_mid = (gap_start + gap_end) / 2

        # Only look within our search window
        if abs(gap_mid - target_time) > window:
            continue

        candidates.append({
            'time': gap_start,       # Use start of silence (cleanest cut point)
            'distance': abs(gap_start - target_time),
            'gap': gap_duration
        })

    if not candidates:
        return target_time

    # Sort by distance, then prefer larger gaps as tiebreaker
    candidates.sort(key=lambda c: (c['distance'], -c['gap']))
    best = candidates[0]

    print(f"[CutAligner] Snapped {target_time:.2f}s → {best['time']:.2f}s "
          f"(gap: {best['gap']:.2f}s, shift: {best['distance']:.2f}s)")

    return best['time']


def align_clip_boundaries(clips_info: list, words: list) -> list:
    """
    Applies silence-snapping to start and end times of all clips.

    The LLM start time is snapped with direction='start' (search backward)
    to ensure we don't clip the beginning of a sentence.
    The LLM end time is snapped with direction='end' (search forward)
    to ensure we don't cut off the last word.

    Args:
        clips_info: List of clip dicts with 'start_time' and 'end_time'.
        words: Full Whisper word list.

    Returns:
        Updated clips_info list with snapped timestamps.
    """
    if not words:
        return clips_info

    aligned = []
    for clip in clips_info:
        original_start = clip['start_time']
        original_end = clip['end_time']

        snapped_start = snap_to_silence(original_start, words, direction='start')
        snapped_end = snap_to_silence(original_end, words, direction='end')

        # Safety: never let the clip become less than 10 seconds
        if snapped_end - snapped_start < 10.0:
            print(f"[CutAligner] Clip too short after snapping, using originals.")
            snapped_start = original_start
            snapped_end = original_end

        updated_clip = dict(clip)
        updated_clip['start_time'] = snapped_start
        updated_clip['end_time'] = snapped_end
        aligned.append(updated_clip)

    return aligned
