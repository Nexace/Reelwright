# A stand-in for the faster-whisper package, for tools/selfcheck/q5-install.mjs only: no model, no audio is read. transcribe() returns the words in
# $FW_STUB_WORDS (JSON [[word, start, end], ...], with the leading space the real engine puts on a word) and logs every call to $FW_STUB_LOG;
# FW_STUB_FAIL=1 makes it raise, to prove the callers fall back.
import json, os


class _Word:
    def __init__(self, word, start, end):
        self.word, self.start, self.end = word, start, end


class _Segment:
    def __init__(self, words):
        self.words = words


class WhisperModel:
    def __init__(self, path, device="cpu", compute_type="int8", **kw):
        self.path, self.kw = path, kw

    def transcribe(self, audio, language=None, word_timestamps=False, **kw):
        if os.environ.get("FW_STUB_LOG"):
            with open(os.environ["FW_STUB_LOG"], "a") as f:
                f.write(json.dumps({"audio": os.path.basename(audio), "language": language, "word_timestamps": word_timestamps,
                                    "model": os.path.basename(self.path), "local_files_only": self.kw.get("local_files_only")}) + "\n")
        if os.environ.get("FW_STUB_FAIL"):
            raise RuntimeError("stub engine failure")
        words = json.loads(os.environ.get("FW_STUB_WORDS", "[[\" hello\", 0.1, 0.5], [\" world\", 0.5, 0.9]]"))
        return iter([_Segment([_Word(*w) for w in words])]), None
