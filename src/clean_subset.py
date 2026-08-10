import pandas as pd

df = pd.read_csv("data/raw/subset.csv")
df["content_length"] = df["content"].str.len()

before = len(df)

df_clean = df[df["content_length"] >= 50].reset_index(drop=True)

after = len(df_clean)
print(f"Removed {before - after} junk chunks ({before} -> {after})")


df_clean.to_csv("data/raw/subset.csv", index=False)
print("Saved cleaned subset to data/raw/subset.csv")