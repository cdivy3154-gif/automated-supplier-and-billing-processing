from datetime import date, datetime
from decimal import Decimal
import uuid
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from supabase import Client

from app.core.config import settings
from app.dependencies.auth import get_current_active_user, require_roles
from app.dependencies.db import get_admin_db, get_user_db
from app.schemas.payment import (
    PaymentInitiate,
    PaymentResponse,
    PaymentSimulateStatus,
)
from app.schemas.user import UserContext, UserRole

router = APIRouter()

OFFICER_PAYMENT_ROLES = {
    UserRole.ADMIN,
    UserRole.FINANCE_OFFICER,
}


@router.post(
    "",
    response_model=PaymentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Initiate Simulated Payment",
    description="Finance officers initiate simulated payment processing for a fully approved bill. Amount is derived strictly from the bill total.",
)
def initiate_payment(
    payload: PaymentInitiate,
    current_user: UserContext = Depends(require_roles(UserRole.ADMIN, UserRole.FINANCE_OFFICER)),
    db: Client = Depends(get_user_db),
    admin_db: Optional[Client] = Depends(get_admin_db),
) -> PaymentResponse:
    # 1. Attempt atomic execution via PostgreSQL RPC (initiate_payment_atomic)
    rpc_payload = {
        "p_bill_id": str(payload.bill_id),
        "p_payment_reference": payload.payment_reference.strip() if payload.payment_reference else None,
        "p_actor_id": current_user.id,
    }

    try:
        rpc_resp = db.rpc("initiate_payment_atomic", rpc_payload).execute()
        if rpc_resp.data:
            return PaymentResponse.model_validate(rpc_resp.data)
    except HTTPException:
        raise
    except Exception as exc:
        err_str = str(exc).lower()
        is_missing_rpc = (
            "pgrst202" in err_str
            or "could not find the function" in err_str
            or ("initiate_payment_atomic" in err_str and ("not found" in err_str or "does not exist" in err_str))
        )
        if is_missing_rpc:
            if settings.is_production:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Transaction-safe database procedure 'initiate_payment_atomic' is unavailable in production.",
                )
        else:
            if "insufficient_privilege" in err_str or "not authorized" in err_str:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
            if "must be in approved" in err_str or "check_violation" in err_str:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
            if "unique" in err_str or "uq" in err_str:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    # 2. Hardened fallback flow using admin_db
    client = admin_db if admin_db else db

    # 2a. Fetch bill and verify status
    bill_resp = client.table("bills").select("*").eq("id", str(payload.bill_id)).execute()
    if not bill_resp.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Bill with ID '{payload.bill_id}' not found",
        )
    bill_data = bill_resp.data[0]

    # 2b. Idempotency Check: if active payment already exists, return it cleanly
    existing_payments = (
        client.table("payments")
        .select("*")
        .eq("bill_id", str(payload.bill_id))
        .execute()
    )
    for p in existing_payments.data:
        if str(p.get("status", "")).upper() not in ("FAILED", "REVERSED", "CANCELLED", "REJECTED"):
            return PaymentResponse.model_validate(p)

    # 2c. Verify bill status for new payment initiation
    bill_status = str(bill_data.get("status", "")).upper()
    if bill_status not in ("APPROVED", "PAYMENT_FAILED"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot initiate payment: bill must be in 'APPROVED' or 'PAYMENT_FAILED' status (current status: '{bill_status}')",
        )

    # 2c. Generate reference
    payment_ref = payload.payment_reference
    if not payment_ref:
        today_str = date.today().strftime("%Y%m%d")
        unique_suffix = uuid.uuid4().hex[:6].upper()
        payment_ref = f"PAY-{today_str}-{unique_suffix}"

    payment_record = {
        "bill_id": str(payload.bill_id),
        "payment_reference": payment_ref.strip(),
        # Authoritative amount strictly from bill total
        "amount": float(bill_data["total_amount"]),
        "status": "INITIATED",
        "initiated_by": current_user.id,
    }

    created_payment = None
    original_bill_status = bill_status

    try:
        pay_insert = client.table("payments").insert(payment_record).execute()
        if not pay_insert.data:
            raise RuntimeError("Failed to record payment in database")
        created_payment = pay_insert.data[0]

        # Update bill status
        bill_upd = client.table("bills").update({"status": "PAYMENT_PENDING"}).eq("id", str(payload.bill_id)).execute()
        if not bill_upd.data:
            raise RuntimeError(f"Failed to update bill '{payload.bill_id}' to PAYMENT_PENDING")

        # Mandatory Audit Log
        audit_res = client.table("audit_logs").insert({
            "actor_id": current_user.id,
            "action": "INITIATE_PAYMENT",
            "entity_type": "payments",
            "entity_id": created_payment["id"],
            "details": {
                "bill_id": str(payload.bill_id),
                "payment_reference": payment_ref,
                "amount": float(bill_data["total_amount"]),
            },
        }).execute()
        if not audit_res.data:
            raise RuntimeError("Failed to create mandatory payment audit log entry")

        return PaymentResponse.model_validate(created_payment)

    except HTTPException:
        raise
    except Exception as exc:
        # Atomic compensating rollback: remove created payment record and revert bill
        if created_payment and "id" in created_payment:
            try:
                client.table("payments").delete().eq("id", created_payment["id"]).execute()
            except Exception:
                pass
        try:
            client.table("bills").update({"status": original_bill_status}).eq("id", str(payload.bill_id)).execute()
        except Exception:
            pass

        err_msg = str(exc)
        if "unique" in err_msg.lower() or "uq" in err_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"An active payment record already exists for bill '{payload.bill_id}'",
            ) from exc
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error initiating payment: {err_msg}. State has been rolled back.",
        ) from exc


@router.get(
    "",
    response_model=List[PaymentResponse],
    summary="List Payments",
    description="Retrieve payment records. Suppliers only see payments for their own bills; officers can filter.",
)
def list_payments(
    bill_id: Optional[UUID] = Query(default=None, description="Filter by bill ID"),
    payment_status: Optional[str] = Query(default=None, alias="status", description="Filter by status"),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: UserContext = Depends(get_current_active_user),
    db: Client = Depends(get_user_db),
    admin_db: Optional[Client] = Depends(get_admin_db),
) -> List[PaymentResponse]:
    client = admin_db if admin_db else db

    if current_user.role == UserRole.SUPPLIER:
        if not current_user.supplier_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Supplier account is not linked to any supplier organization",
            )
        # Fetch bills belonging to this supplier
        supplier_bills = (
            client.table("bills")
            .select("id")
            .eq("supplier_id", str(current_user.supplier_id))
            .execute()
        )
        allowed_bill_ids = [b["id"] for b in supplier_bills.data]
        if not allowed_bill_ids:
            return []

        if bill_id and str(bill_id) not in allowed_bill_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access forbidden: cannot query payments for another supplier's bill",
            )

        query = client.table("payments").select("*")
        if bill_id:
            query = query.eq("bill_id", str(bill_id))
        else:
            # Filter in Python if multi-id PostgREST filter is restricted
            all_payments = query.order("created_at", desc=True).execute()
            filtered = [
                PaymentResponse.model_validate(p)
                for p in all_payments.data
                if p["bill_id"] in allowed_bill_ids
            ]
            return filtered[offset : offset + limit]

    elif current_user.role in OFFICER_PAYMENT_ROLES:
        query = client.table("payments").select("*")
        if bill_id:
            query = query.eq("bill_id", str(bill_id))
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access forbidden: role '{current_user.role.value}' cannot view payment records",
        )

    if payment_status:
        query = query.eq("status", payment_status)

    response = query.range(offset, offset + limit - 1).order("created_at", desc=True).execute()
    return [PaymentResponse.model_validate(row) for row in response.data]


@router.get(
    "/{payment_id}",
    response_model=PaymentResponse,
    summary="Get Payment by ID",
    description="Retrieve specific payment record details.",
)
def get_payment_by_id(
    payment_id: UUID,
    current_user: UserContext = Depends(get_current_active_user),
    db: Client = Depends(get_user_db),
    admin_db: Optional[Client] = Depends(get_admin_db),
) -> PaymentResponse:
    client = admin_db if admin_db else db
    response = client.table("payments").select("*").eq("id", str(payment_id)).execute()
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Payment with ID '{payment_id}' not found",
        )

    payment_data = response.data[0]

    # Supplier isolation check
    if current_user.role == UserRole.SUPPLIER:
        bill_id = payment_data["bill_id"]
        bill_resp = client.table("bills").select("supplier_id").eq("id", str(bill_id)).execute()
        if not bill_resp.data or str(bill_resp.data[0].get("supplier_id")) != str(current_user.supplier_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access forbidden: payment belongs to another supplier's bill",
            )
    elif current_user.role not in OFFICER_PAYMENT_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access forbidden: role '{current_user.role.value}' cannot view payments",
        )

    return PaymentResponse.model_validate(payment_data)


@router.get(
    "/bills/{bill_id}/payment",
    response_model=Optional[PaymentResponse],
    summary="Get Payment for Bill",
    description="Retrieve the latest payment record associated with a bill.",
)
def get_payment_for_bill(
    bill_id: UUID,
    current_user: UserContext = Depends(get_current_active_user),
    db: Client = Depends(get_user_db),
    admin_db: Optional[Client] = Depends(get_admin_db),
) -> Optional[PaymentResponse]:
    client = admin_db if admin_db else db

    # Verify bill existence and ownership
    bill_resp = client.table("bills").select("supplier_id").eq("id", str(bill_id)).execute()
    if not bill_resp.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Bill with ID '{bill_id}' not found",
        )

    if current_user.role == UserRole.SUPPLIER:
        if str(bill_resp.data[0].get("supplier_id")) != str(current_user.supplier_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access forbidden: bill belongs to another supplier",
            )
    elif current_user.role not in OFFICER_PAYMENT_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access forbidden: role '{current_user.role.value}' cannot view payments",
        )

    payments_resp = (
        client.table("payments")
        .select("*")
        .eq("bill_id", str(bill_id))
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    if not payments_resp.data:
        return None

    return PaymentResponse.model_validate(payments_resp.data[0])


@router.post(
    "/{payment_id}/simulate-status",
    response_model=PaymentResponse,
    summary="Simulate Payment Gateway Status",
    description="Simulate asynchronous banking payment processing: sets payment to SUCCESS (clearing bill to PAID) or FAILED (permitting retry).",
)
def simulate_payment_status(
    payment_id: UUID,
    payload: PaymentSimulateStatus,
    current_user: UserContext = Depends(require_roles(UserRole.ADMIN, UserRole.FINANCE_OFFICER)),
    db: Client = Depends(get_user_db),
    admin_db: Optional[Client] = Depends(get_admin_db),
) -> PaymentResponse:
    target_status = payload.target_status.strip().upper()
    if target_status not in ("SUCCESS", "FAILED"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid target status: must be 'SUCCESS' or 'FAILED'",
        )

    # 1. Attempt atomic execution via PostgreSQL RPC (simulate_payment_status_atomic)
    rpc_payload = {
        "p_payment_id": str(payment_id),
        "p_target_status": target_status,
        "p_actor_id": current_user.id,
    }

    try:
        rpc_resp = db.rpc("simulate_payment_status_atomic", rpc_payload).execute()
        if rpc_resp.data:
            return PaymentResponse.model_validate(rpc_resp.data)
    except HTTPException:
        raise
    except Exception as exc:
        err_str = str(exc).lower()
        is_missing_rpc = (
            "pgrst202" in err_str
            or "could not find the function" in err_str
            or ("simulate_payment_status_atomic" in err_str and ("not found" in err_str or "does not exist" in err_str))
        )
        if is_missing_rpc:
            if settings.is_production:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Transaction-safe database procedure 'simulate_payment_status_atomic' is unavailable in production.",
                )
        else:
            if "insufficient_privilege" in err_str or "not authorized" in err_str:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
            if "already in terminal" in err_str or "check_violation" in err_str:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    # 2. Hardened fallback flow using admin_db with compensating rollback
    client = admin_db if admin_db else db

    # 2a. Fetch payment record
    pay_resp = client.table("payments").select("*").eq("id", str(payment_id)).execute()
    if not pay_resp.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Payment with ID '{payment_id}' not found",
        )
    payment_data = pay_resp.data[0]
    current_pay_status = str(payment_data.get("status", "")).upper()

    if current_pay_status not in ("INITIATED", "PROCESSING"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Payment '{payment_data.get('payment_reference')}' is already in terminal status '{current_pay_status}'",
        )

    bill_id = payment_data["bill_id"]
    bill_resp = client.table("bills").select("status").eq("id", str(bill_id)).execute()
    if not bill_resp.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Parent bill ID '{bill_id}' not found",
        )
    original_bill_status = bill_resp.data[0].get("status")

    if original_bill_status == "PAID":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot simulate payment for bill already in terminal status 'PAID'",
        )

    # 2b. Execute update with compensating rollback protection
    try:
        if target_status == "SUCCESS":
            update_data = {
                "status": "SUCCESS",
                "confirmed_at": datetime.utcnow().isoformat(),
            }
            pay_upd = client.table("payments").update(update_data).eq("id", str(payment_id)).execute()
            if not pay_upd.data:
                raise RuntimeError("Failed to update payment status to SUCCESS")

            bill_upd = client.table("bills").update({"status": "PAID"}).eq("id", str(bill_id)).execute()
            if not bill_upd.data:
                raise RuntimeError("Failed to update bill status to PAID")

            audit_res = client.table("audit_logs").insert({
                "actor_id": current_user.id,
                "action": "CONFIRM_PAYMENT_SUCCESS",
                "entity_type": "payments",
                "entity_id": str(payment_id),
                "details": {
                    "bill_id": str(bill_id),
                    "status": "SUCCESS",
                },
            }).execute()
            if not audit_res.data:
                raise RuntimeError("Failed to record mandatory payment confirmation audit log")

        else:  # FAILED
            update_data = {
                "status": "FAILED",
            }
            pay_upd = client.table("payments").update(update_data).eq("id", str(payment_id)).execute()
            if not pay_upd.data:
                raise RuntimeError("Failed to update payment status to FAILED")

            bill_upd = client.table("bills").update({"status": "PAYMENT_FAILED"}).eq("id", str(bill_id)).execute()
            if not bill_upd.data:
                raise RuntimeError("Failed to update bill status to PAYMENT_FAILED")

            audit_res = client.table("audit_logs").insert({
                "actor_id": current_user.id,
                "action": "RECORD_PAYMENT_FAILURE",
                "entity_type": "payments",
                "entity_id": str(payment_id),
                "details": {
                    "bill_id": str(bill_id),
                    "status": "FAILED",
                    "reason": payload.reason,
                },
            }).execute()
            if not audit_res.data:
                raise RuntimeError("Failed to record mandatory payment failure audit log")

        return PaymentResponse.model_validate(pay_upd.data[0])

    except HTTPException:
        raise
    except Exception as exc:
        # Atomic compensating rollback: revert payment and bill status
        try:
            client.table("payments").update({
                "status": current_pay_status,
                "confirmed_at": payment_data.get("confirmed_at"),
            }).eq("id", str(payment_id)).execute()
            client.table("bills").update({"status": original_bill_status}).eq("id", str(bill_id)).execute()
        except Exception:
            pass

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Payment status simulation failed: {str(exc)}. State has been rolled back.",
        ) from exc
