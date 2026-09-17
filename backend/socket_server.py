import socketio

# Create Socket.IO server with ASGI mode
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*",
    logger=False,
    engineio_logger=False,
)

ADMIN_ROOM = "admin_room"

@sio.event
async def connect(sid, environ):
    # Connected client
    pass

@sio.event
async def disconnect(sid):
    # Disconnected client
    pass

@sio.event
async def join_admin_room(sid, data=None):
    await sio.enter_room(sid, ADMIN_ROOM)

async def emit_new_order(order_data: dict):
    """Notify owner of new order to trigger alarm and notification sound."""
    await sio.emit("new_order_received", order_data, room=ADMIN_ROOM)
    # Also broadcast globally so customer and owner are notified
    await sio.emit("new_order_received", order_data)

async def emit_order_status_updated(order_data: dict):
    """Broadcast order status update."""
    payload = {"order": order_data}
    await sio.emit("order_status_updated", payload, room=ADMIN_ROOM)
    await sio.emit("order_status_updated", payload)

async def emit_low_stock_alert(alert_data: dict):
    """Alert owner of low stock on a product variant."""
    await sio.emit("low_stock_alert", alert_data, room=ADMIN_ROOM)
    await sio.emit("low_stock_alert", alert_data)

async def emit_product_updated(change_data: dict):
    """Broadcast product modification."""
    await sio.emit("product_updated", change_data, room=ADMIN_ROOM)
    await sio.emit("product_updated", change_data)
