# verify-av (WARN, opt-in): the rendered mp4's audio matches mix.wav to within a frame, globally and at every SFX cue (tools/verify_av.py
# has the method). Off unless project.json has "qa": {"verify-av": true}: it decodes the audio three times. Standalone: python3 tools/verify_av.py <project>.
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

KIND = "warn"


def check(ctx):
    if (ctx["P"].get("qa") or {}).get("verify-av") is not True: return []
    import verify_av
    proj, mix, tl = ctx["proj"], os.path.join(ctx["proj"], "mix.wav"), os.path.join(ctx["proj"], "timeline.json")
    if not (os.path.exists(ctx["mp4"]) and os.path.exists(mix)): return []
    cues = json.load(open(tl)).get("cues", []) if os.path.exists(tl) else []
    return verify_av.lines(verify_av.verify(ctx["mp4"], mix, cues, ctx["fps"]))
