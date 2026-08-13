"""
scripts/simulate_business.py

Generates realistic seed data for local development and demos:
- 6 branches across Karachi, Lahore, Islamabad
- ~100 products across Bread, Cakes, Pastries, Cookies, Savories with PKR pricing
- 365 days of historical orders with weekend rushes and a Ramadan-style seasonal
  spike, so the forecasting model has real weekly seasonality to learn from
- Inventory levels, waste logs, and product reviews

Run against the Business API's database:
    cd services/business-api
    python ../../scripts/simulate_business.py
"""
import os
import random
import sys
from datetime import datetime, timedelta

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "services", "business-api"))

from app.core.database import SessionLocal, Base, engine  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.models.models import (  # noqa: E402
    Branch,
    Customer,
    Inventory,
    Order,
    OrderItem,
    Product,
    Review,
    User,
    WasteLog,
)

random.seed(42)

BRANCHES = [
    ("DHA Phase 6, Karachi", "Khayaban-e-Sehar, DHA Phase 6, Karachi"),
    ("Clifton Block 5, Karachi", "Block 5, Clifton, Karachi"),
    ("Gulberg, Lahore", "MM Alam Road, Gulberg III, Lahore"),
    ("Bahadurabad, Karachi", "Bahadurabad Chowrangi, Karachi"),
    ("Blue Area, Islamabad", "Jinnah Avenue, Blue Area, Islamabad"),
    ("North Nazimabad, Karachi", "Block H, North Nazimabad, Karachi"),
]

CATEGORY_TEMPLATES = {
    "Bread": (["Sourdough Batard", "Multigrain Loaf", "Garlic Herb Focaccia", "Sesame Baguette", "Milk Bread Loaf", "Rye Bread", "Ciabatta", "Brioche Loaf"], (400, 600), "🍞"),
    "Cakes": (["Red Velvet Dream", "Nutella Overload", "Karachi Mango Cream", "Lotus Cheesecake", "Black Forest", "Pistachio Rose", "Caramel Drip", "Coconut Layer"], (2000, 2800), "🎂"),
    "Pastries": (["Baklava Croissant", "Nutella Danish", "Cream Cheese Roll", "Almond Croissant", "Chocolate Eclair", "Cinnamon Roll", "Fruit Tart", "Custard Bun"], (380, 550), "🥐"),
    "Cookies": (["Classic Chocolate Chunk", "Biscoff Lotus Swirl", "Pistachio Rose Crinkle", "Salted Caramel Stack", "Double Chocolate Brownie", "Oat & Honey", "Red Velvet Cookie", "White Choc Macadamia"], (550, 800), "🍪"),
    "Savories": (["Chicken Cheese Puff", "Beef Samosa Roll", "Spinach Feta Bake", "Chicken Tikka Croissant", "Vegetable Patty", "Mutton Roll", "Cheese Manakish", "Zaatar Pinwheel"], (240, 380), "🥟"),
}

CUSTOMER_NAMES = ["Ayesha", "Bilal", "Sana", "Hamza", "Fatima", "Usman", "Zara", "Ahmed", "Mahnoor", "Danish", "Areeba", "Farhan", "Hira", "Omar", "Sadia"]
WASTE_REASONS = ["Unsold end of day", "Damaged in transit", "Overproduction", "Quality control reject"]


def build_products():
    products = []
    for category, (names, price_range, emoji) in CATEGORY_TEMPLATES.items():
        for i, base_name in enumerate(names):
            for variant in range(1, 4):  # 3 variants per base name -> ~24 per category, ~120 total
                name = base_name if variant == 1 else f"{base_name} ({['Regular', 'Large', 'Mini'][variant - 1]})"
                price = random.randint(*price_range) + (variant - 1) * 150
                products.append(
                    dict(
                        name=name,
                        category=category,
                        price=float(price),
                        emoji=emoji,
                        description=f"A guest favorite from our {category.lower()} selection.",
                        sku=f"SKU-{category[:3].upper()}{i}{variant}{random.randint(100,999)}",
                    )
                )
    return products


def seasonal_multiplier(day: datetime) -> float:
    weekday = day.weekday()  # Mon=0 .. Sun=6
    mult = 1.0
    if weekday in (4, 5):  # Fri, Sat — weekend rush
        mult *= 1.6
    elif weekday == 6:  # Sun
        mult *= 1.25
    # A ~10-day seasonal spike roughly a third of the way through the year,
    # standing in for an Eid/festival demand surge.
    day_of_year = day.timetuple().tm_yday
    if 110 <= day_of_year <= 120:
        mult *= 1.8
    return mult


def run():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.query(Branch).count() > 0:
            print("Database already has data — skipping seed. Delete the tables first to reseed.")
            return

        print("Creating owner account (owner@crustissues.com / password123)...")
        owner = User(name="Demo Owner", email="owner@crustissues.com", password_hash=hash_password("password123"), role="owner")
        db.add(owner)

        print(f"Creating {len(BRANCHES)} branches...")
        branches = [Branch(name=n, address=a) for n, a in BRANCHES]
        db.add_all(branches)
        db.flush()

        product_dicts = build_products()
        print(f"Creating {len(product_dicts)} products...")
        products = [Product(**p) for p in product_dicts]
        db.add_all(products)
        db.flush()

        print("Creating inventory rows...")
        inventory_rows = []
        for branch in branches:
            for product in products:
                inventory_rows.append(
                    Inventory(
                        product_id=product.id,
                        branch_id=branch.id,
                        quantity=random.randint(2, 60),
                        safety_threshold=random.randint(15, 30),
                    )
                )
        db.add_all(inventory_rows)
        db.flush()

        print("Creating customers...")
        customers = [Customer(name=n, phone=f"03{random.randint(0,9)}{random.randint(10000000,99999999)}") for n in CUSTOMER_NAMES]
        db.add_all(customers)
        db.flush()

        print("Generating 365 days of order history (this takes a moment)...")
        # Realistic retail sales follow roughly a Pareto distribution — a
        # minority of SKUs drive most volume. Assign each product a skewed
        # popularity weight so bestsellers actually accumulate enough daily
        # history for Prophet, while long-tail items fall back to the simple
        # average model — which mirrors how real forecasting systems triage
        # fast movers vs. slow movers.
        weights = [random.paretovariate(1.5) for _ in products]

        today = datetime.utcnow().date()
        order_count = 0
        for days_ago in range(365, 0, -1):
            day = today - timedelta(days=days_ago)
            mult = seasonal_multiplier(datetime.combine(day, datetime.min.time()))
            orders_today = max(2, round(random.randint(8, 16) * mult))
            for _ in range(orders_today):
                branch = random.choice(branches)
                customer = random.choice(customers)
                order = Order(
                    customer_id=customer.id,
                    branch_id=branch.id,
                    status="delivered",
                    delivery_address="Order pickup",
                    created_at=datetime.combine(day, datetime.min.time()) + timedelta(hours=random.randint(11, 22), minutes=random.randint(0, 59)),
                )
                db.add(order)
                db.flush()

                total = 0.0
                k = random.randint(1, 3)
                chosen_idx = set(random.choices(range(len(products)), weights=weights, k=k * 3))
                chosen = [products[i] for i in list(chosen_idx)[:k]] or [random.choice(products)]
                for product in chosen:
                    qty = random.randint(1, 3)
                    total += product.price * qty
                    db.add(OrderItem(order_id=order.id, product_id=product.id, quantity=qty, unit_price=product.price))
                order.total = total
                order_count += 1
            if days_ago % 60 == 0:
                db.flush()
        print(f"  -> {order_count} orders created")

        print("Creating waste logs...")
        waste_rows = []
        for days_ago in range(60, 0, -1):
            if random.random() > 0.5:
                continue
            day = today - timedelta(days=days_ago)
            waste_rows.append(
                WasteLog(
                    product_id=random.choice(products).id,
                    branch_id=random.choice(branches).id,
                    quantity=random.randint(1, 8),
                    reason=random.choice(WASTE_REASONS),
                    date=day,
                )
            )
        db.add_all(waste_rows)

        print("Creating reviews...")
        review_texts = [
            ("Absolutely incredible, still warm when delivered!", 5),
            ("Loved this, will order again for sure.", 5),
            ("Good but the delivery took longer than expected.", 3),
            ("A bit too salty for my taste.", 2),
            ("Best in the city, hands down.", 5),
            ("Packaging could be better, arrived slightly squished.", 3),
            ("Quite stale, very disappointed with this order.", 1),
            ("New favorite in our house.", 5),
            ("Decent, nothing extraordinary though.", 3),
            ("Heavenly, so creamy and fresh.", 5),
        ]
        for text, rating in review_texts:
            db.add(Review(product_id=random.choice(products).id, customer_id=random.choice(customers).id, rating=rating, text=text, sentiment=None))

        db.commit()
        print("\nSeed complete.")
        print(f"  Branches: {len(branches)}")
        print(f"  Products: {len(products)}")
        print(f"  Orders:   {order_count}")
        print("\nLog in with: owner@crustissues.com / password123")
    finally:
        db.close()


if __name__ == "__main__":
    run()
