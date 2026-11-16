# p5-av-sync (WARN): the delivered mp4's audio and video line up. ffprobe reads both streams of ctx["mp4"]:
#   - the audio starts more than 0.1 s after (or before) the video (a late first sample reads as a lip-sync / cue offset),
#   - the two streams differ in length by more than 0.15 s (audio running past or short of the picture),
#   - the film has a mix.wav but the mp4 has no audio stream.
# AAC adds ~1024 samples of priming (~21 ms): that is inside the 0.1 s tolerance and is not reported.
# Silence with "qa": {"p5-av-sync": false}.
import json, os, subprocess

KIND = "warn"


def _probe(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "stream=codec_type,start_time,duration", "-of", "json", path],
                       capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(r.stderr.strip().splitlines()[-1] if r.stderr.strip() else "ffprobe failed")
    out = {}
    for s in json.loads(r.stdout).get("streams", []):
        def num(k):
            try: return float(s.get(k))
            except (TypeError, ValueError): return None
        out.setdefault(s["codec_type"], {"start": num("start_time") or 0.0, "duration": num("duration")})
    return out


def check(ctx):
    mp4 = ctx.get("mp4")
    if not mp4 or not os.path.exists(mp4):
        return []
    try:
        s = _probe(mp4)
    except Exception as e:  # a WARN check never fails the run
        return [f"av-sync skipped: {e}"]
    v, a = s.get("video"), s.get("audio")
    if not v:
        return []
    if not a:
        return ["av-sync: the mp4 has no audio stream"] if os.path.exists(os.path.join(ctx["proj"], "mix.wav")) else []
    lines = []
    if abs(a["start"] - v["start"]) > 0.1:
        lines.append(f"av-sync: audio starts at {a['start']:.3f}s, video at {v['start']:.3f}s (offset {a['start'] - v['start']:+.3f}s)")
    if a["duration"] and v["duration"] and abs(a["duration"] - v["duration"]) > 0.15:
        lines.append(f"av-sync: audio is {a['duration']:.2f}s, video {v['duration']:.2f}s (differ by {a['duration'] - v['duration']:+.2f}s)")
    return lines
