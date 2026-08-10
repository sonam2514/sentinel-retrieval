import pandas as pd

df = pd.read_csv("data/raw/subset.csv")
df["content_length"] = df["content"].str.len()

middle_range = df[(df["content_length"] >= 20) & (df["content_length"] < 50)]
print(middle_range[["id", "title", "content_length", "content"]].to_string())