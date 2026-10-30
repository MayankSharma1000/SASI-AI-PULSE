import json
import sys

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


GENERIC_TAGS = {
    "ai",
    "industry-news",
    "technology",
    "news",
    "artificial intelligence",
    "machine learning",
}


def item_text(item):
    title = item.get("title") or ""
    summary = item.get("summary") or ""

    tags = [
        str(tag)
        for tag in (item.get("topicTags") or [])
        if str(tag).strip().lower() not in GENERIC_TAGS
    ]

    # Give titles greater influence than summaries.
    return " ".join([title, title, title, summary, summary, *tags])


def cluster_matches(candidate, existing_items, threshold=0.75):
    eligible = [
        item for item in existing_items
        if item.get("type") == candidate.get("type")
    ]

    if not eligible:
        return []

    documents = [
        item_text(candidate),
        *[item_text(item) for item in eligible],
    ]

    if not documents[0].strip():
        return []

    vectorizer = TfidfVectorizer(
        lowercase=True,
        stop_words="english",
        ngram_range=(1, 2),
        sublinear_tf=True,
    )

    try:
        matrix = vectorizer.fit_transform(documents)
    except ValueError:
        return []

    scores = cosine_similarity(matrix[0:1], matrix[1:]).flatten()

    matches = []

    for item, score in zip(eligible, scores):
        score = float(score)

        if score >= threshold:
            matches.append({
                "id": str(item.get("_id") or item.get("id") or ""),
                "similarity": round(score, 6),
            })

    return sorted(
        matches,
        key=lambda match: match["similarity"],
        reverse=True,
    )


def main():
    request = json.load(sys.stdin)

    result = cluster_matches(
        request.get("candidate", {}),
        request.get("existingItems", []),
        float(request.get("threshold", 0.75)),
    )

    json.dump(result, sys.stdout)


if __name__ == "__main__":
    main()
