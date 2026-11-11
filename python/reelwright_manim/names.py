"""`from reelwright_manim.names import *`: the engine render picked ($RW_MANIM engine, default ce) plus aliases.

Write scenes with CE names; under GL they map to Create=ShowCreation, MathTex=Tex (math), Tex=TexText.
CE also gets ShowCreation and TexText. RWScene is RWScene (CE) or RWSceneGL (GL).
Licence: imports Manim CE or ManimGL (both MIT), installed by the user.
"""
import json as _json
import os as _os

from .core import ENV as _ENV

ENGINE = _json.loads(_os.environ.get(_ENV) or "{}").get("engine", "ce")

if ENGINE == "gl":
    from manimlib import *  # noqa: F401,F403
    from .gl import RWSceneGL as RWScene  # noqa: F401
    Create = ShowCreation  # noqa: F405
    MathTex = Tex  # noqa: F405
    Tex = TexText  # noqa: F405
else:
    from manim import *  # noqa: F401,F403
    from .ce import RWScene, RWMovingScene, RW3DScene  # noqa: F401
    ShowCreation = Create  # noqa: F405
    TexText = Tex  # noqa: F405
