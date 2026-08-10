from datasets import load_dataset
import pandas as pd

dataset = load_dataset("MedRAG/textbooks")
data = dataset["train"]

# Convert to a pandas DataFrame — a table, like an Excel sheet in Python
df = data.to_pandas()

# 1. Shape: (rows, columns)
print("Shape:", df.shape)

# 2. Column names and data types
print(df.info())

# 3. How many unique textbooks are there?
print("Unique textbooks:", df["title"].nunique())
print(df["title"].unique())

# 4. How many chunks per textbook (top 5)
print(df["title"].value_counts().head())

# 5. How long are the chunks, in characters? (min, max, average)
df["content_length"] = df["content"].str.len()
print(df["content_length"].describe())