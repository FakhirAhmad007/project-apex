from app.core.config import settings

_client = None
if settings.gemini_api_key:
    from google import genai

    _client = genai.Client(api_key=settings.gemini_api_key)


def _fallback_summary(facts: dict) -> str:
    top = ", ".join(facts["top_products"]) if facts["top_products"] else "no standout sellers"
    branch = facts["top_branch"] or "n/a"
    alerts = facts["low_stock_count"]
    return (
        f"Yesterday brought in Rs. {facts['revenue']:,.0f} across {facts['order_count']} orders, "
        f"led by {branch}. Top sellers were {top}. "
        + (
            f"{alerts} product{'s' if alerts != 1 else ''} are near their reorder threshold and may need restocking."
            if alerts
            else "Inventory levels look healthy across branches."
        )
    )


def generate_daily_summary(facts: dict) -> str:
    if _client is None:
        return _fallback_summary(facts)

    top_products = ", ".join(facts["top_products"]) if facts["top_products"] else "no sales recorded"
    waste_lines = "; ".join(facts["waste_events"]) if facts["waste_events"] else "none notable"

    prompt = f"""You are writing a 3-sentence plain-language daily business brief for a busy
multi-branch bakery/retail owner in Pakistan. Facts for {facts['for_date']}:
- Total revenue: Rs. {facts['revenue']:,.0f}
- Orders: {facts['order_count']}
- Top-selling products: {top_products}
- Best-performing branch: {facts['top_branch'] or 'n/a'}
- Waste events: {waste_lines}
- Products currently near/below reorder threshold: {facts['low_stock_count']}

Write EXACTLY 3 short sentences, warm and direct, no headers, no bullet points,
no markdown, plain text only. Mention revenue, one highlight, and one actionable
heads-up."""

    try:
        response = _client.models.generate_content(model=settings.gemini_model, contents=prompt)
        text = (response.text or "").strip()
        return text or _fallback_summary(facts)
    except Exception:
        return _fallback_summary(facts)
