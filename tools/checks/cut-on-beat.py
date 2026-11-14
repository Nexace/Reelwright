# cut-on-beat (WARN, opt-in): hard cuts in the rendered mp4 land within 3 frames of the beat grid, and the grid matches the audio that
# was actually rendered (tools/beatsync.py has the method). Off unless project.json has "qa": {"cut-on-beat": true}; it decodes the
# whole mp4, so it is not run on every film. Standalone: python3 tools/beatsync.py <project>.
import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

KIND = "warn"


def check(ctx):
    if (ctx["P"].get("qa") or {}).get("cut-on-beat") is not True: return []
    import beatsync
    if not os.path.exists(ctx["mp4"]): return []
    t0, beat = beatsync.project_grid(ctx["proj"], ctx["P"])
    rep, _ = beatsync.analyse(ctx["mp4"], t0, beat, ctx["fps"])
    return beatsync.lines(rep)
