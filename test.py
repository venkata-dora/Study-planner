import subprocess
import time
def test_stream():
    proc = subprocess.Popen(["ollama", "run", "qwen3.5:4b", "hi"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    out, err = proc.communicate()
    print("RETURN CODE:", proc.returncode)
    print("OUT:", out)
test_stream()
