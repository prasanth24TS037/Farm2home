from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.notification import Notification
from app.models.order import Order, OrderItem
from app.models.delivery import Delivery
from app.models.payout import Payout
from app.models.farmer import FarmerProfile
from app.models.user import User

class NotificationService:
    @staticmethod
    def create_order_farmer_notifications(order: Order, db: Session) -> List[Notification]:
        """
        When an order is created or confirmed, creates a distinct notification for each farmer
        who has at least one item in this order.
        Each notification strictly contains only THAT farmer's items and their own subtotal.
        """
        if not order.items:
            return []

        # Group items strictly by farmer
        farmer_items_map = {}
        for item in order.items:
            farmer = item.farmer or (item.product.farmer if item.product else None)
            if farmer and farmer.user_id:
                if farmer.id not in farmer_items_map:
                    farmer_items_map[farmer.id] = {
                        "farmer": farmer,
                        "items": [],
                        "subtotal": 0.0
                    }
                farmer_items_map[farmer.id]["items"].append(item)
                farmer_items_map[farmer.id]["subtotal"] += (item.subtotal or (item.quantity * item.unit_price))

        customer_name = "A customer"
        if order.customer and order.customer.user and order.customer.user.full_name:
            customer_name = order.customer.user.full_name

        created_notifs = []
        for farmer_id, data in farmer_items_map.items():
            farmer = data["farmer"]
            f_items = data["items"]
            farmer_subtotal = data["subtotal"]

            # Guard against duplicate notification for this order
            existing = db.query(Notification).filter(
                Notification.user_id == farmer.user_id,
                Notification.related_order_id == order.id,
                Notification.type == "new_order"
            ).first()
            if existing:
                continue

            # Format items summary specific to this farmer only
            item_snippets = [
                f"{it.product.name if it.product else 'Harvest Item'} ({it.quantity}{it.product.unit if it.product else 'kg'})"
                for it in f_items
            ]
            items_str = ", ".join(item_snippets) if item_snippets else "Fresh Produce"

            notif = Notification(
                user_id=farmer.user_id,
                title=f"New Harvest Order #{order.order_number}",
                message=f"New order: {customer_name} ordered {items_str} — ₹{farmer_subtotal:,.2f}.",
                type="new_order",
                related_order_id=order.id,
                created_at=datetime.utcnow()
            )
            db.add(notif)
            created_notifs.append(notif)

        if created_notifs:
            db.flush()
        return created_notifs

    @staticmethod
    def create_delivery_assignment_notification(delivery: Delivery, db: Session) -> Optional[Notification]:
        """
        Notifies a specific delivery agent when a delivery leg is assigned to them.
        Includes real pickup and drop details.
        """
        if not delivery.delivery_agent or not delivery.delivery_agent.user_id:
            return None

        agent_user_id = delivery.delivery_agent.user_id
        order = delivery.order
        ord_num = order.order_number if order else f"ORD-{delivery.order_id}"

        farmer_name = delivery.farmer.farm_name if delivery.farmer else "Local Farm"
        customer_name = (
            order.customer.user.full_name
            if (order and order.customer and order.customer.user)
            else "Customer"
        )
        pickup_loc = delivery.pickup_address or "Farm pickup"
        drop_loc = delivery.drop_address or "Customer address"

        # Check if already notified for this exact delivery leg assignment
        existing = db.query(Notification).filter(
            Notification.user_id == agent_user_id,
            Notification.related_delivery_id == delivery.id,
            Notification.type == "new_assignment"
        ).first()
        if existing:
            return existing

        notif = Notification(
            user_id=agent_user_id,
            title=f"New Delivery Assignment #{ord_num}",
            message=f"New pickup: {farmer_name}'s farm ({pickup_loc}) → {customer_name}'s address ({drop_loc}). Payout: ₹{delivery.payout_amount:.0f}.",
            type="new_assignment",
            related_order_id=delivery.order_id,
            related_delivery_id=delivery.id,
            created_at=datetime.utcnow()
        )
        db.add(notif)
        db.flush()
        return notif

    @staticmethod
    def create_delivery_status_notifications(delivery: Delivery, new_status: str, db: Session) -> List[Notification]:
        """
        Creates customer, farmer, and agent notifications when delivery status transitions.
        """
        created = []
        order = delivery.order
        ord_num = order.order_number if order else f"ORD-{delivery.order_id}"
        farmer_name = delivery.farmer.farm_name if delivery.farmer else "Farm"
        customer_name = (
            order.customer.user.full_name
            if (order and order.customer and order.customer.user)
            else "Customer"
        )

        if new_status in ["picked_up", "out_for_delivery"]:
            # Notify Customer: "Your order is on the way"
            if order and order.customer and order.customer.user_id:
                existing_cust = db.query(Notification).filter(
                    Notification.user_id == order.customer.user_id,
                    Notification.related_delivery_id == delivery.id,
                    Notification.type == "order_picked_up"
                ).first()
                if not existing_cust:
                    cust_notif = Notification(
                        user_id=order.customer.user_id,
                        title=f"Order #{ord_num} is on the way! 🚚",
                        message=f"Your farm-fresh harvest from {farmer_name} has been picked up by the delivery partner and is on the way.",
                        type="order_picked_up",
                        related_order_id=delivery.order_id,
                        related_delivery_id=delivery.id,
                        created_at=datetime.utcnow()
                    )
                    db.add(cust_notif)
                    created.append(cust_notif)

        elif new_status == "delivered":
            # 1. Notify Customer: "Order delivered"
            if order and order.customer and order.customer.user_id:
                existing_cust = db.query(Notification).filter(
                    Notification.user_id == order.customer.user_id,
                    Notification.related_delivery_id == delivery.id,
                    Notification.type == "order_delivered"
                ).first()
                if not existing_cust:
                    cust_notif = Notification(
                        user_id=order.customer.user_id,
                        title=f"Order #{ord_num} Delivered! 🌾",
                        message=f"Your harvest produce from {farmer_name} has arrived at your doorstep. Enjoy the freshness!",
                        type="order_delivered",
                        related_order_id=delivery.order_id,
                        related_delivery_id=delivery.id,
                        created_at=datetime.utcnow()
                    )
                    db.add(cust_notif)
                    created.append(cust_notif)

            # 2. Notify Farmer: "Your produce has been delivered to customer"
            if delivery.farmer and delivery.farmer.user_id:
                existing_farmer = db.query(Notification).filter(
                    Notification.user_id == delivery.farmer.user_id,
                    Notification.related_delivery_id == delivery.id,
                    Notification.type == "order_delivered"
                ).first()
                if not existing_farmer:
                    f_items = [it for it in (order.items if order else []) if it.farmer_id == delivery.farmer_id]
                    items_str = ", ".join(f"{it.product.name} ({it.quantity}{it.product.unit})" for it in f_items if it.product) or "fresh produce"
                    farmer_notif = Notification(
                        user_id=delivery.farmer.user_id,
                        title=f"Harvest Delivered: Order #{ord_num}",
                        message=f"Your harvest produce ({items_str}) for order #{ord_num} was successfully delivered to {customer_name}.",
                        type="order_delivered",
                        related_order_id=delivery.order_id,
                        related_delivery_id=delivery.id,
                        created_at=datetime.utcnow()
                    )
                    db.add(farmer_notif)
                    created.append(farmer_notif)

            # 3. Notify Delivery Agent: "Delivery completed + payout added"
            if delivery.delivery_agent and delivery.delivery_agent.user_id:
                existing_driver = db.query(Notification).filter(
                    Notification.user_id == delivery.delivery_agent.user_id,
                    Notification.related_delivery_id == delivery.id,
                    Notification.type == "order_delivered"
                ).first()
                if not existing_driver:
                    driver_notif = Notification(
                        user_id=delivery.delivery_agent.user_id,
                        title="Delivery Completed! 🎉",
                        message=f"Order #{ord_num} delivered successfully. +₹{delivery.payout_amount:.0f} added to your earnings.",
                        type="order_delivered",
                        related_order_id=delivery.order_id,
                        related_delivery_id=delivery.id,
                        created_at=datetime.utcnow()
                    )
                    db.add(driver_notif)
                    created.append(driver_notif)

        if created:
            db.flush()
        return created

    @staticmethod
    def create_payout_notification(payout: Payout, db: Session) -> Optional[Notification]:
        """
        Creates payout processed / submitted notification for farmer or delivery agent.
        """
        user_id = None
        if payout.farmer and payout.farmer.user_id:
            user_id = payout.farmer.user_id
        elif payout.delivery_agent and payout.delivery_agent.user_id:
            user_id = payout.delivery_agent.user_id

        if not user_id:
            return None

        if payout.status == "paid":
            title = "Payout Processed 💰"
            msg = f"Your payout of ₹{payout.amount:,.2f} ({payout.payout_reference}) has been processed and credited to your account ({payout.account_reference_masked})."
        else:
            title = "Payout Request Submitted"
            msg = f"Your settlement payout request for ₹{payout.amount:,.2f} ({payout.payout_reference}) is pending processing."

        notif = Notification(
            user_id=user_id,
            title=title,
            message=msg,
            type="payout_processed",
            created_at=datetime.utcnow()
        )
        db.add(notif)
        db.flush()
        return notif
