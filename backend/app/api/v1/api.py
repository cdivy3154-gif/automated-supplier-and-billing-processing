from fastapi import APIRouter
from app.api.v1.endpoints import (
    approvals,
    auth,
    bills,
    deliveries,
    health,
    orders,
    payments,
    receipts,
    suppliers,
)

api_router = APIRouter()

api_router.include_router(health.router, prefix="/health", tags=["Health"])
api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(suppliers.router, prefix="/suppliers", tags=["Suppliers"])
api_router.include_router(orders.router, prefix="/orders", tags=["Supply Orders"])
api_router.include_router(deliveries.router, prefix="/deliveries", tags=["Deliveries"])
api_router.include_router(receipts.router, prefix="/receipts", tags=["Delivery Receipts"])
api_router.include_router(bills.router, prefix="/bills", tags=["Bills"])
api_router.include_router(approvals.router, prefix="/approvals", tags=["Approvals & Workflows"])
api_router.include_router(payments.router, prefix="/payments", tags=["Simulated Payments"])
