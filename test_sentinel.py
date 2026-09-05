import sys
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

from src.sentinel import sentinel

question = "How are current insulin preparations produced?"

result = sentinel(question)

print("\n")
print("SENTINEL RESULT")

print("\nQUESTION:")
print(result["question"])

print("\nRETRIEVED CHUNKS:")
for chunk in result.get("retrieved_chunks", []):
    print(f"- [{chunk.get('title')}] {chunk.get('text', '')[:200]}...")

print("\nANSWER:")
print(result.get("answer"))

print("\nFAITHFULNESS:")
print(result.get("faithfulness_probability"))

print("\nUNFAITHFULNESS:")
print(result.get("unfaithfulness_probability"))

print("\nCLASSIFIER:")
print(result.get("classifier_label"))

print("\nDECISION:")
print(result["decision"])

