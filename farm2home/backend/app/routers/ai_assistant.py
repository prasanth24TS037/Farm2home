from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.farmer import FarmerProfile
from app.models.product import Product
from app.models.order import Order, OrderItem
from app.core.jwt_handler import require_role

router = APIRouter(prefix="/ai", tags=["AI Assistant"])

class ChatMessage(BaseModel):
    role: str = Field(description="'user' or 'assistant'")
    content: str

class AIAssistantRequest(BaseModel):
    message: str
    language: str = "en"  # "en", "ta", "hi"
    history: Optional[List[ChatMessage]] = []

@router.post("/assistant")
def chat_with_assistant(
    req: AIAssistantRequest,
    token_payload: dict = Depends(require_role(["farmer", "admin"])),
    db: Session = Depends(get_db)
):
    user_id = int(token_payload.get("sub"))
    farmer = db.query(FarmerProfile).filter(FarmerProfile.user_id == user_id).first()

    if not farmer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Farmer profile not found"
        )

    # 1. Fetch Farmer Context
    products = db.query(Product).filter(Product.farmer_id == farmer.id).all()
    product_ids = [p.id for p in products]

    low_stock_prods = [p for p in products if 0 < p.stock_quantity <= p.low_stock_threshold]
    out_of_stock_prods = [p for p in products if p.stock_quantity <= 0]
    in_stock_prods = [p for p in products if p.stock_quantity > p.low_stock_threshold]

    # Recent orders for this farmer
    recent_order_items = (
        db.query(OrderItem, Order)
        .join(Order, OrderItem.order_id == Order.id)
        .filter(OrderItem.product_id.in_(product_ids))
        .order_by(Order.created_at.desc())
        .limit(10)
        .all()
    ) if product_ids else []

    # 2. Build Response based on intent & language
    msg_lower = req.message.lower().strip()
    lang = req.language.lower()

    reply, action = generate_assistant_response(
        query=msg_lower,
        original_query=req.message,
        lang=lang,
        farmer=farmer,
        products=products,
        low_stock_prods=low_stock_prods,
        out_of_stock_prods=out_of_stock_prods,
        in_stock_prods=in_stock_prods,
        recent_order_items=recent_order_items
    )

    return {
        "reply": reply,
        "language": lang,
        "suggested_action": action,
        "context_summary": {
            "total_products": len(products),
            "low_stock_count": len(low_stock_prods),
            "farm_name": farmer.farm_name
        }
    }


def generate_assistant_response(
    query: str,
    original_query: str,
    lang: str,
    farmer: FarmerProfile,
    products: List[Product],
    low_stock_prods: List[Product],
    out_of_stock_prods: List[Product],
    in_stock_prods: List[Product],
    recent_order_items: List[Any]
) -> tuple[str, Optional[Dict[str, Any]]]:
    farm_name = farmer.farm_name or "Your Organic Farm"
    action = None

    # Intent A: Low Stock / Inventory Status
    if any(k in query for k in ["stock", "low", "running low", "inventory", "இருப்பு", "குறைவு", "ஸ்டாக்", "स्टॉक", "कम", "माल"]):
        if not products:
            if lang == "ta":
                return "உங்கள் பண்ணையில் இன்னும் எந்த விளைபொருட்களும் சேர்க்கப்படவில்லை. 'பொருளைச் சேர்' பட்டனை அழுத்தி விளைபொருட்களைச் சேர்க்கவும்.", None
            elif lang == "hi":
                return "आपके खेत में अभी तक कोई उत्पाद नहीं जोड़ा गया है। कृपया 'उत्पाद जोड़ें' पर क्लिक करके फसल जोड़ें।", None
            return f"You don't have any products listed yet for {farm_name}. Tap 'Add Product' to list your fresh harvest.", None

        if low_stock_prods or out_of_stock_prods:
            actionable_prod = low_stock_prods[0] if low_stock_prods else out_of_stock_prods[0]
            action = {
                "type": "quick_stock",
                "product_id": actionable_prod.id,
                "product_name": actionable_prod.name,
                "current_stock": actionable_prod.stock_quantity,
                "unit": actionable_prod.unit,
                "suggested_stock": actionable_prod.low_stock_threshold * 3
            }

            if lang == "ta":
                items_str = ", ".join(f"**{p.name}** ({p.stock_quantity} {p.unit} மட்டுமே உள்ளது)" for p in low_stock_prods)
                out_str = f" மற்றும் தீர்ந்துபோனவை: {', '.join(p.name for p in out_of_stock_prods)}" if out_of_stock_prods else ""
                return f"⚠️ **இருப்பு எச்சரிக்கை**: உங்கள் பண்ணையில் பின்வரும் விளைபொருட்களின் இருப்பு குறைவாக உள்ளது:\n\n- {items_str}{out_str}.\n\nவாடிக்கையாளர் ஆர்டர்களைத் தடையின்றி பெற உடனடியாக அறுவடை அளவைப் புதுப்பிக்க பரிந்துரைக்கப்படுகிறது.", action
            elif lang == "hi":
                items_str = ", ".join(f"**{p.name}** (केवल {p.stock_quantity} {p.unit} शेष)" for p in low_stock_prods)
                out_str = f" और समाप्त: {', '.join(p.name for p in out_of_stock_prods)}" if out_of_stock_prods else ""
                return f"⚠️ **कम स्टॉक चेतावनी**: आपके खेत में इन उत्पादों का स्टॉक कम है:\n\n- {items_str}{out_str}।\n\nग्राहकों के नए ऑर्डर प्राप्त करने के लिए कृपया अपनी ताज़ा फसल का स्टॉक अपडेट करें।", action
            else:
                items_str = ", ".join(f"**{p.name}** ({p.stock_quantity} {p.unit} remaining)" for p in low_stock_prods)
                out_str = f" and out of stock: {', '.join(p.name for p in out_of_stock_prods)}" if out_of_stock_prods else ""
                return f"⚠️ **Low Stock Alert**: The following produce items are running low at {farm_name}:\n\n- {items_str}{out_str}.\n\nIt is recommended to replenish your stock to continue receiving direct customer orders.", action
        else:
            if lang == "ta":
                return f"✅ உங்கள் பண்ணையின் அனைத்து {len(products)} விளைபொருட்களும் போதுமான ஆரோக்கியமான இருப்பில் உள்ளன. எதிலும் பற்றாக்குறை இல்லை!", None
            elif lang == "hi":
                return f"✅ आपके खेत के सभी {len(products)} उत्पाद पर्याप्त स्टॉक में उपलब्ध हैं। कोई भी उत्पाद कम नहीं है!", None
            return f"✅ Excellent! All {len(products)} harvest items at {farm_name} are well stocked above safe thresholds.", None

    # Intent B: Price Updates & Market Rates
    if any(k in query for k in ["price", "rate", "cost", "change price", "update price", "விலை", "மதிப்பு", "ரூபாய்", "मूल्य", "भाव", "दाम", "कीमत"]):
        # Find if there is a suggested price difference
        diff_prod = next((p for p in products if p.ai_suggested_price and p.ai_suggested_price != p.price_per_unit), None)
        if not diff_prod and products:
            diff_prod = products[0]

        if diff_prod:
            target_price = diff_prod.ai_suggested_price or round(diff_prod.price_per_unit * 1.08, 1)
            action = {
                "type": "quick_price",
                "product_id": diff_prod.id,
                "product_name": diff_prod.name,
                "current_price": diff_prod.price_per_unit,
                "suggested_price": target_price,
                "unit": diff_prod.unit
            }

            if lang == "ta":
                return f"💡 **விலை ஆலோசனை**: உங்கள் **{diff_prod.name}** தற்போதைய விலை ₹{diff_prod.price_per_unit}/{diff_prod.unit}. தற்போதைய நேரடி சந்தை தேவை அடிப்படையில் நியாயமான விலை பரிந்துரை: **₹{target_price}/{diff_prod.unit}**.\n\nவிலையை மாற்ற விரும்பினால் கீழே உள்ள உறுதிசெய்தல் பொத்தானைப் பயன்படுத்தவும்.", action
            elif lang == "hi":
                return f"💡 **मूल्य सुझाव**: आपके **{diff_prod.name}** का वर्तमान मूल्य ₹{diff_prod.price_per_unit}/{diff_prod.unit} है। वर्तमान बाज़ार मांग के अनुसार उचित अनुशंसित मूल्य: **₹{target_price}/{diff_prod.unit}** है।\n\nमूल्य बदलने के लिए नीचे दिए गए बटन पर टैप करें।", action
            else:
                return f"💡 **Pricing Advisor**: Your **{diff_prod.name}** is currently priced at ₹{diff_prod.price_per_unit} per {diff_prod.unit}. Based on regional delta demand trends, our recommended fair direct rate is **₹{target_price} / {diff_prod.unit}**.\n\nYou can apply this recommendation directly below or edit manually in your dashboard.", action
        else:
            if lang == "ta":
                return "விலையை மாற்ற, உங்கள் விளைபொருட்கள் அட்டவணையில் உள்ள 'விலை திருத்து' (Edit Price) பொத்தானைப் பயன்படுத்தலாம்.", None
            elif lang == "hi":
                return "मूल्य बदलने के लिए उत्पाद सूची में 'मूल्य बदलें' (Edit Price) बटन का उपयोग करें।", None
            return "To update prices, click the 'Edit Price' button on any produce card in your dashboard or products list.", None

    # Intent C: Best Sellers / Sales Performance
    if any(k in query for k in ["best", "sold", "selling", "top", "விற்பனை", "அதிகம்", "சேல்ஸ்", "बिक्री", "सबसे ज्यादा"]):
        if recent_order_items:
            counts = {}
            for item, order in recent_order_items:
                pname = item.product.name if item.product else "Produce Item"
                counts[pname] = counts.get(pname, 0.0) + item.quantity

            top_item = sorted(counts.items(), key=lambda x: x[1], reverse=True)[0]
            if lang == "ta":
                return f"🏆 **சிறந்த விற்பனை**: உங்கள் பண்ணையில் சமீபத்தில் அதிகம் விற்பனையான விளைபொருள் **{top_item[0]}** (மொத்தம் {top_item[1]} அளவுகள் விற்கப்பட்டன). வாடிக்கையாளர்கள் இதற்கு நல்ல வரவேற்பு அளித்துள்ளனர்!", None
            elif lang == "hi":
                return f"🏆 **शीर्ष बिक्री**: आपके खेत में हाल ही में सबसे अधिक बिकने वाला उत्पाद **{top_item[0]}** रहा है (कुल {top_item[1]} इकाइयाँ बिकीं)।", None
            else:
                return f"🏆 **Top Seller**: Your top-performing harvest produce recently is **{top_item[0]}** with {top_item[1]} units sold across recent customer orders!", None
        else:
            fav = products[0].name if products else "Country Tomatoes"
            if lang == "ta":
                return f"📊 சந்தை நிலவரப்படி, **{fav}** மற்றும் நாட்டுக்காய்கறிகளுக்கு மண்டல அளவில் அதிக கிராக்கி நிலவுகிறது.", None
            elif lang == "hi":
                return f"📊 बाज़ार के अनुसार, **{fav}** और मौसमी हरी सब्जियों की मांग बहुत अच्छी है।", None
            return f"📊 Based on regional delta trends, organic staples like **{fav}** currently command high customer demand.", None

    # Intent D: Today's Orders / Recent Orders
    if any(k in query for k in ["order", "orders", "today", "recent", "ஆர்டர்", "ஆர்டர்கள்", "இன்று", "ऑर्डर", "आज"]):
        if recent_order_items:
            recent_orders_list = []
            seen_ids = set()
            for item, order in recent_order_items:
                if order.id not in seen_ids:
                    seen_ids.add(order.id)
                    recent_orders_list.append(order)

            count = len(recent_orders_list)
            sample = recent_orders_list[0]
            if lang == "ta":
                return f"📦 **ஆர்டர்கள் நிலை**: உங்கள் விளைபொருட்களைக் கொண்ட **{count} சமீபத்திய ஆர்டர்கள்** உள்ளன. சமீபத்திய ஆர்டர் #{sample.order_number} ({sample.status}) - ₹{sample.total_amount}. விவரங்களைக் காண 'Orders' பிரிவைப் பார்க்கவும்.", None
            elif lang == "hi":
                return f"📦 **ऑर्डर स्थिति**: आपके पास **{count} हाल के ऑर्डर** हैं। नवीनतम ऑर्डर #{sample.order_number} ({sample.status}) - ₹{sample.total_amount}। पूरा विवरण 'Orders' टैब में देखें।", None
            else:
                return f"📦 **Order Status**: You have **{count} active/recent customer orders**. Latest order #{sample.order_number} is currently in '{sample.status}' status (Total: ₹{sample.total_amount}).", None
        else:
            if lang == "ta":
                return "தற்போது நிலுவையில் புதிய ஆர்டர்கள் எதுவும் இல்லை. புதிய ஆர்டர் வந்தவுடன் உங்கள் திரையில் அறிவிப்பு தோன்றும்.", None
            elif lang == "hi":
                return "वर्तमान में कोई नया पेंडिंग ऑर्डर नहीं है। नया ऑर्डर आने पर आपको तुरंत सूचना मिलेगी।", None
            return "There are no pending orders right now. New direct customer orders will appear automatically in your notifications.", None

    # Default / General Agricultural & Farm Assistance
    if lang == "ta":
        return f"வணக்கம்! நான் உங்கள் **Farm2Home பண்ணை உதவியாளர்**. {farm_name} பண்ணையின் விளைபொருட்கள் இருப்பு, நேரடி சந்தை விலை நிர்ணயம், ஆர்டர்கள் நிலை மற்றும் இயற்கை விவசாய அறுவடை தொடர்பான எந்த கேள்வியையும் என்னிடம் கேட்கலாம்.", None
    elif lang == "hi":
        return f"नमस्ते! मैं आपका **Farm2Home सहायक** हूँ। आप {farm_name} के स्टॉक, बाज़ार मूल्य, हाल के ऑर्डर और फसल प्रबंधन से संबंधित कोई भी सवाल पूछ सकते हैं।", None
    else:
        return f"Hello! I am your **Farm2Home AI Assistant**. I can help you monitor inventory health for {farm_name}, advise on optimal direct farm prices, review customer orders, and answer harvest questions.", None
