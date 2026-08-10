import pandas as pd
import numpy as np
from sentence_transformers import SentenceTransformer

df = pd.read_csv("data/raw/subset.csv")
model = SentenceTransformer("all-MiniLM-L6-v2")

embeddings = model.encode(
    df["content"].tolist(),
    show_progress_bar=True,
    batch_size=32
)

print("Total embeddings:", len(embeddings))
print("Shape:", embeddings.shape)


np.save("data/raw/subset_embeddings.npy", embeddings)
print("Saved embeddings to data/raw/subset_embeddings.npy")