from app.core.config import settings

_client = None
if settings.gemini_api_key:
    from google import genai

    _client = genai.Client(api_key=settings.gemini_api_key)

VALID_LABELS = {"positive", "neutral", "negative"}


def _fallback_label(rating: int) -> str:
    """Used only when GEMINI_API_KEY isn't set, so the app is still usable
    out of the box in local dev without requiring an API key."""
    if rating >= 4:
        return "positive"
    if rating == 3:
        return "neutral"
    return "negative"


def classify_sentiment(text: str, rating: int) -> str:
    if _client is None:
        return _fallback_label(rating)

    prompt = (
        f"A customer left this product review with a star rating of {rating} out of 5. "
        f"Classify the overall sentiment as exactly one word: positive, neutral, or negative.\n\n"
        f'Review: "{text}"\n\nAnswer with exactly one word.'
    )
    try:
        response = _client.models.generate_content(model=settings.gemini_model, contents=prompt)
        label = (response.text or "").strip().lower()
        for candidate in VALID_LABELS:
            if candidate in label:
                return candidate
        return _fallback_label(rating)
    except Exception:
        return _fallback_label(rating)
