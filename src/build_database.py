from datasets import load_dataset
import chromadb
from sentence_transformers import SentenceTransformer

dataset = load_dataset("MedRAG/textbooks")
df = dataset["train"].to_pandas()

df["content_length"] = df["content"].str.len()
before = len(df)
df = df[df["content_length"] >= 50].reset_index(drop=True)
print(f"Cleaned: {before} -> {len(df)} chunks")

client = chromadb.PersistentClient(path="data/chroma_db")
collection = client.get_or_create_collection(name="medical_chunks_full")
model = SentenceTransformer("all-MiniLM-L6-v2")

titles = df["title"].unique()
for title in titles:
    book_df = df[df["title"] == title]
    print(f"Processing {title} ({len(book_df)} chunks)...")

    embeddings = model.encode(
        book_df["content"].tolist(),
        show_progress_bar=True,
        batch_size=64
    )

    batch_size = 5000
    for start in range(0, len(book_df), batch_size):
        end = min(start + batch_size, len(book_df))
        collection.add(
            ids=book_df["id"].iloc[start:end].tolist(),
            embeddings=embeddings[start:end].tolist(),
            documents=book_df["content"].iloc[start:end].tolist(),
            metadatas=[{"title": t} for t in book_df["title"].iloc[start:end].tolist()]
        )

    print(f"{title} added to database.")

print("Total chunks stored:", collection.count())