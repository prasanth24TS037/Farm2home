from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.notification import Notification
from app.core.jwt_handler import get_current_user_token

router = APIRouter(prefix="/notifications", tags=["Notifications"])

def format_relative_time(dt: Optional[datetime]) -> str:
    if not dt:
        return "Recently"
    now = datetime.utcnow()
    diff = now - dt
    seconds = int(diff.total_seconds())

    if seconds < 60:
        return "Just now"
    elif seconds < 3600:
        mins = seconds // 60
        return f"{mins}m ago"
    elif seconds < 86400:
        hours = seconds // 3600
        return f"{hours}h ago"
    elif seconds < 172800:
        return "Yesterday"
    else:
        days = seconds // 86400
        if days < 7:
            return f"{days}d ago"
        return dt.strftime("%b %d")

def serialize_notification(n: Notification):
    return {
        "id": n.id,
        "user_id": n.user_id,
        "title": n.title,
        "message": n.message,
        "type": n.type or "order",
        "related_order_id": n.related_order_id,
        "related_delivery_id": n.related_delivery_id,
        "is_read": bool(n.is_read),
        "created_at": n.created_at.isoformat() if n.created_at else None,
        "formatted_time": format_relative_time(n.created_at),
        "date_label": n.created_at.strftime("%b %d, %I:%M %p") if n.created_at else ""
    }

@router.get("")
def get_user_notifications(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    unread_only: bool = Query(False),
    token_payload: dict = Depends(get_current_user_token),
    db: Session = Depends(get_db)
):
    """
    Returns the current authenticated user's notifications, newest first,
    scoped strictly to current_user.id from JWT.
    """
    user_id = int(token_payload.get("sub"))

    query = db.query(Notification).filter(Notification.user_id == user_id)
    if unread_only:
        query = query.filter(Notification.is_read == False)

    total_count = query.count()
    unread_count = db.query(Notification).filter(
        Notification.user_id == user_id,
        Notification.is_read == False
    ).count()

    notifications = (
        query
        .order_by(Notification.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    return {
        "notifications": [serialize_notification(n) for n in notifications],
        "unread_count": unread_count,
        "total_count": total_count,
        "page": page,
        "limit": limit,
        "total_pages": max(1, (total_count + limit - 1) // limit)
    }

@router.patch("/{notification_id}/read")
@router.post("/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    token_payload: dict = Depends(get_current_user_token),
    db: Session = Depends(get_db)
):
    """
    Marks a specific notification as read, ensuring strict ownership.
    """
    user_id = int(token_payload.get("sub"))
    notif = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == user_id
    ).first()

    if not notif:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found or access denied"
        )

    notif.is_read = True
    db.commit()

    unread_count = db.query(Notification).filter(
        Notification.user_id == user_id,
        Notification.is_read == False
    ).count()

    return {
        "status": "success",
        "message": "Notification marked as read",
        "notification": serialize_notification(notif),
        "unread_count": unread_count
    }

@router.patch("/read-all")
@router.post("/read-all")
@router.post("/mark-read")
def mark_all_notifications_read(
    token_payload: dict = Depends(get_current_user_token),
    db: Session = Depends(get_db)
):
    """
    Marks all notifications for the current authenticated user as read.
    """
    user_id = int(token_payload.get("sub"))
    updated_count = db.query(Notification).filter(
        Notification.user_id == user_id,
        Notification.is_read == False
    ).update({"is_read": True}, synchronize_session=False)

    db.commit()

    return {
        "status": "success",
        "message": "All notifications marked as read",
        "marked_count": updated_count,
        "unread_count": 0
    }
