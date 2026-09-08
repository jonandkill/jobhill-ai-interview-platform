import ast
import pathlib
import unittest


ROOT = pathlib.Path(__file__).parent
APP_SOURCE = (ROOT / "app.py").read_text(encoding="utf-8")


class VoiceCloneContractTest(unittest.TestCase):
    def test_python_sources_compile(self):
        for filename in ("app.py", "download_model.py"):
            ast.parse((ROOT / filename).read_text(encoding="utf-8"), filename=filename)

    def test_fixed_private_voice_clone_contract(self):
        self.assertIn("Qwen/Qwen3-TTS-12Hz-0.6B-Base", APP_SOURCE)
        self.assertIn("jobnkill-professor-01", APP_SOURCE)
        self.assertIn("create_voice_clone_prompt", APP_SOURCE)
        self.assertIn("generate_voice_clone", APP_SOURCE)
        self.assertNotIn("generate_custom_voice", APP_SOURCE)

    def test_no_voice_recording_is_committed(self):
        private_audio = [
            path
            for path in ROOT.rglob("*")
            if path.suffix.lower() in {".wav", ".m4a", ".mp3", ".flac"}
        ]
        self.assertEqual(private_audio, [])


if __name__ == "__main__":
    unittest.main()
