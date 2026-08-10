from datasets import load_dataset
import pandas as pd

dataset = load_dataset("MedRAG/textbooks")
df = dataset["train"].to_pandas()


chosen_titles = ["Anatomy_Gray", "Pathoma_Husain", "Pharmacology_Katzung"]
subset = df[df["title"].isin(chosen_titles)].reset_index(drop=True)

print("Subset shape:", subset.shape)
print(subset["title"].value_counts())


subset.to_csv("data/raw/subset.csv", index=False)
print("Saved to data/raw/subset.csv")