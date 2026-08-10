import pandas as pd
import numpy as np
import chromadb

df = pd.read_csv("data/raw/subset.csv")
embeddings = np.load("data/raw/subset_embeddings.npy")

client = chromadb.PersistentClient(path="data/chroma_db")
collection = client.get_or_create_collection(name="medical_chunks")

# Add data in batches of 5000 (safely under Chroma's limit)
batch_size = 5000
total = len(df)

for start in range(0, total, batch_size):
    end = min(start + batch_size, total)

    collection.add(
        ids=df["id"].iloc[start:end].tolist(),
        embeddings=embeddings[start:end].tolist(),
        documents=df["content"].iloc[start:end].tolist(),
        metadatas=[{"title": t} for t in df["title"].iloc[start:end].tolist()]
    )
    print(f"Added rows {start} to {end}")

print("Total chunks stored:", collection.count())