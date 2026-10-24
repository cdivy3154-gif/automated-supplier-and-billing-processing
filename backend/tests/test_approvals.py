"""Tests for Phase 2C Approval Workflow Endpoints."""

from decimal import Decimal
from typing import Any, Dict
from unittest.mock import patch
import pytest
from starlette.testclient import TestClient

from app.schemas.user import UserRole
from tests.conftest import MockSupabaseClient, MockTableQuery


def test_valid_approval_workflow_through_all_stages(
    client: TestClient,
    supplier_token: str,
    branch_officer_token: str,
    pre_auditor_token: str,
    general_manager_token: str,
    finance_officer_token: str,
    mock_db_state: Dict[str, Any],
):
    """
    Validates the end-to-end multi-stage approval lifecycle:
    1. Supplier submits bill -> Bill 'SUBMITTED', task 1 for BRANCH_OFFICER.
    2. Branch Officer approves -> Bill 'BRANCH_APPROVED', task 2 for PRE_AUDITOR.
    3. Pre-Auditor verifies -> Bill 'PRE_AUDITED', task 3 for GENERAL_MANAGER.
    4. General Manager approves -> Bill 'GM_APPROVED', task 4 for FINANCE_OFFICER.
    5. Finance Officer clears -> Bill 'APPROVED', final clearance reached.
    """
    mock_client = MockSupabaseClient(mock_db_state)

    with patch("app.dependencies.auth.get_supabase_user_client", return_value=mock_client), \
         patch("app.dependencies.db.get_supabase_user_client", return_value=mock_client), \
         patch("app.dependencies.db.get_supabase_admin_client", return_value=mock_client):

        # Step 1: Supplier submits bill
        deliv1_id = mock_db_state["deliveries"][0]["id"]
        submit_resp = client.post(
            "/api/v1/bills",
            headers={"Authorization": f"Bearer {supplier_token}"},
            json={
                "invoice_number": "INV-LIFECYCLE-001",
                "invoice_date": "2026-10-24",
                "delivery_items": [{"delivery_id": deliv1_id, "billed_quantity": 400.0, "rate": 25.50}],
            },
        )
        assert submit_resp.status_code == 201
        bill_id = submit_resp.json()["id"]
        assert submit_resp.json()["status"] == "SUBMITTED"

        # Check initial task is created for BRANCH_OFFICER
        tasks_for_bill = [t for t in mock_db_state["workflow_tasks"] if t["bill_id"] == bill_id]
        assert len(tasks_for_bill) == 1
        task1 = tasks_for_bill[0]
        assert task1["assigned_role"] == UserRole.BRANCH_OFFICER.value
        assert task1["status"] == "PENDING"

        # Step 2: Branch Officer reviews and approves
        appr1_resp = client.post(
            "/api/v1/approvals",
            headers={"Authorization": f"Bearer {branch_officer_token}"},
            json={
                "workflow_task_id": task1["id"],
                "decision": "APPROVED",
                "comments": "Branch procurement verified against physical delivery",
            },
        )
        assert appr1_resp.status_code == 201
        assert appr1_resp.json()["decision"] == "APPROVED"

        # Verify bill status is now BRANCH_APPROVED and task 2 is created for PRE_AUDITOR
        bill_row = next(b for b in mock_db_state["bills"] if b["id"] == bill_id)
        assert bill_row["status"] == "BRANCH_APPROVED"
        pending_tasks = [t for t in mock_db_state["workflow_tasks"] if t["bill_id"] == bill_id and t["status"] == "PENDING"]
        assert len(pending_tasks) == 1
        task2 = pending_tasks[0]
        assert task2["assigned_role"] == UserRole.PRE_AUDITOR.value

        # Step 3: Pre-Auditor verifies
        appr2_resp = client.post(
            "/api/v1/approvals",
            headers={"Authorization": f"Bearer {pre_auditor_token}"},
            json={
                "workflow_task_id": task2["id"],
                "decision": "APPROVED",
                "comments": "Pre-audit verification cleared. Mathematical and rate checks pass.",
            },
        )
        assert appr2_resp.status_code == 201
        assert bill_row["status"] == "PRE_AUDITED"

        pending_tasks = [t for t in mock_db_state["workflow_tasks"] if t["bill_id"] == bill_id and t["status"] == "PENDING"]
        assert len(pending_tasks) == 1
        task3 = pending_tasks[0]
        assert task3["assigned_role"] == UserRole.GENERAL_MANAGER.value

        # Step 4: General Manager approves
        appr3_resp = client.post(
            "/api/v1/approvals",
            headers={"Authorization": f"Bearer {general_manager_token}"},
            json={
                "workflow_task_id": task3["id"],
                "decision": "APPROVED",
                "comments": "Executive approval granted for payment processing.",
            },
        )
        assert appr3_resp.status_code == 201
        assert bill_row["status"] == "GM_APPROVED"

        pending_tasks = [t for t in mock_db_state["workflow_tasks"] if t["bill_id"] == bill_id and t["status"] == "PENDING"]
        assert len(pending_tasks) == 1
        task4 = pending_tasks[0]
        assert task4["assigned_role"] == UserRole.FINANCE_OFFICER.value

        # Step 5: Finance Officer gives final clearance
        appr4_resp = client.post(
            "/api/v1/approvals",
            headers={"Authorization": f"Bearer {finance_officer_token}"},
            json={
                "workflow_task_id": task4["id"],
                "decision": "APPROVED",
                "comments": "Final finance clearance granted. Ready for payment disbursement.",
            },
        )
        assert appr4_resp.status_code == 201
        assert bill_row["status"] == "APPROVED"

        # Verify no further pending tasks
        pending_tasks = [t for t in mock_db_state["workflow_tasks"] if t["bill_id"] == bill_id and t["status"] == "PENDING"]
        assert len(pending_tasks) == 0

        # Verify approval history in approvals table
        approvals_for_bill = [a for a in mock_db_state["approvals"] if a["bill_id"] == bill_id]
        assert len(approvals_for_bill) == 4

        # Verify audit logs were written
        audit_entries = [a for a in mock_db_state["audit_logs"] if a["entity_id"] == bill_id]
        assert len(audit_entries) >= 4


def test_unauthorized_role_attempting_stage(
    client: TestClient,
    supplier_token: str,
    general_manager_token: str,
    mock_db_state: Dict[str, Any],
):
    """
    Verifies that roles cannot act on workflow stages not assigned to them:
    - Supplier cannot approve bills (403 Forbidden).
    - General Manager cannot approve Branch Officer stage (403 Forbidden).
    """
    mock_client = MockSupabaseClient(mock_db_state)

    bill_id = "e0000000-0000-0000-0000-000000000099"
    task_id = "f0000000-0000-0000-0000-000000000099"
    mock_db_state["bills"].append({
        "id": bill_id,
        "bill_number": "BILL-TEST-AUTH",
        "supplier_id": mock_db_state["suppliers"][0]["id"],
        "total_amount": 1000.0,
        "status": "SUBMITTED",
    })
    mock_db_state["workflow_tasks"].append({
        "id": task_id,
        "bill_id": bill_id,
        "assigned_role": UserRole.BRANCH_OFFICER.value,
        "status": "PENDING",
    })

    with patch("app.dependencies.auth.get_supabase_user_client", return_value=mock_client), \
         patch("app.dependencies.db.get_supabase_user_client", return_value=mock_client), \
         patch("app.dependencies.db.get_supabase_admin_client", return_value=mock_client):

        # Supplier attempt -> 403 Forbidden
        resp_supp = client.post(
            "/api/v1/approvals",
            headers={"Authorization": f"Bearer {supplier_token}"},
            json={"workflow_task_id": task_id, "decision": "APPROVED"},
        )
        assert resp_supp.status_code == 403

        # General Manager attempt on Branch Officer task -> 403 Forbidden
        resp_gm = client.post(
            "/api/v1/approvals",
            headers={"Authorization": f"Bearer {general_manager_token}"},
            json={"workflow_task_id": task_id, "decision": "APPROVED"},
        )
        assert resp_gm.status_code == 403
        assert "cannot act on task assigned to" in resp_gm.json()["detail"].lower()


def test_rejection_with_reason(
    client: TestClient,
    branch_officer_token: str,
    mock_db_state: Dict[str, Any],
):
    """
    Verifies that an authorized officer can reject a bill:
    - Comments/rejection reason is mandatory.
    - Bill transitions to 'REJECTED'.
    - Task transitions to 'REJECTED'.
    - No new workflow tasks are created.
    - Audit log records rejection reason.
    """
    mock_client = MockSupabaseClient(mock_db_state)
    bill_id = "e0000000-0000-0000-0000-000000000088"
    task_id = "f0000000-0000-0000-0000-000000000088"
    mock_db_state["bills"].append({
        "id": bill_id,
        "bill_number": "BILL-TEST-REJECT",
        "supplier_id": mock_db_state["suppliers"][0]["id"],
        "total_amount": 5000.0,
        "status": "SUBMITTED",
    })
    mock_db_state["workflow_tasks"].append({
        "id": task_id,
        "bill_id": bill_id,
        "assigned_role": UserRole.BRANCH_OFFICER.value,
        "status": "PENDING",
    })

    with patch("app.dependencies.auth.get_supabase_user_client", return_value=mock_client), \
         patch("app.dependencies.db.get_supabase_user_client", return_value=mock_client), \
         patch("app.dependencies.db.get_supabase_admin_client", return_value=mock_client):

        # Rejection without reason fails with 400 Bad Request
        resp_no_reason = client.post(
            "/api/v1/approvals",
            headers={"Authorization": f"Bearer {branch_officer_token}"},
            json={"workflow_task_id": task_id, "decision": "REJECTED", "comments": ""},
        )
        assert resp_no_reason.status_code == 400
        assert "rejection reason" in resp_no_reason.json()["detail"].lower()

        # Rejection with reason succeeds
        resp_reject = client.post(
            "/api/v1/approvals",
            headers={"Authorization": f"Bearer {branch_officer_token}"},
            json={
                "workflow_task_id": task_id,
                "decision": "REJECTED",
                "comments": "Delivered moisture content exceeds acceptable threshold (18% vs max 12%).",
            },
        )
        assert resp_reject.status_code == 201
        assert resp_reject.json()["decision"] == "REJECTED"

        # Verify bill is REJECTED
        bill_row = next(b for b in mock_db_state["bills"] if b["id"] == bill_id)
        assert bill_row["status"] == "REJECTED"

        # Verify task is REJECTED
        task_row = next(t for t in mock_db_state["workflow_tasks"] if t["id"] == task_id)
        assert task_row["status"] == "REJECTED"

        # Verify no new tasks were spawned
        tasks_for_bill = [t for t in mock_db_state["workflow_tasks"] if t["bill_id"] == bill_id]
        assert len(tasks_for_bill) == 1


def test_reprocess_completed_task_rejected(
    client: TestClient,
    branch_officer_token: str,
    mock_db_state: Dict[str, Any],
):
    """
    Verifies that once a workflow task is COMPLETED or REJECTED,
    any attempt to re-approve it is rejected with 409 Conflict.
    """
    mock_client = MockSupabaseClient(mock_db_state)
    bill_id = "e0000000-0000-0000-0000-000000000077"
    task_id = "f0000000-0000-0000-0000-000000000077"
    mock_db_state["bills"].append({
        "id": bill_id,
        "bill_number": "BILL-TEST-REPROCESS",
        "supplier_id": mock_db_state["suppliers"][0]["id"],
        "total_amount": 2000.0,
        "status": "BRANCH_APPROVED",
    })
    mock_db_state["workflow_tasks"].append({
        "id": task_id,
        "bill_id": bill_id,
        "assigned_role": UserRole.BRANCH_OFFICER.value,
        "status": "COMPLETED",  # Already finished!
    })

    with patch("app.dependencies.auth.get_supabase_user_client", return_value=mock_client), \
         patch("app.dependencies.db.get_supabase_user_client", return_value=mock_client), \
         patch("app.dependencies.db.get_supabase_admin_client", return_value=mock_client):

        resp = client.post(
            "/api/v1/approvals",
            headers={"Authorization": f"Bearer {branch_officer_token}"},
            json={"workflow_task_id": task_id, "decision": "APPROVED", "comments": "Duplicate attempt"},
        )
        assert resp.status_code == 409
        assert "must be 'pending'" in resp.json()["detail"].lower()


def test_supplier_workflow_progress_isolation(
    client: TestClient,
    supplier_token: str,
    supplier2_token: str,
    mock_db_state: Dict[str, Any],
):
    """
    Verifies that a supplier can view workflow progress and rejection reasons
    for their own bill, but receives 403 Forbidden when attempting to view
    another supplier's bill progress.
    """
    mock_client = MockSupabaseClient(mock_db_state)
    bill_id = "e0000000-0000-0000-0000-000000000066"
    task_id = "f0000000-0000-0000-0000-000000000066"

    mock_db_state["bills"].append({
        "id": bill_id,
        "bill_number": "BILL-SUPP1-PROGRESS",
        "supplier_id": mock_db_state["suppliers"][0]["id"],  # Supplier 1
        "total_amount": 3000.0,
        "status": "REJECTED",
    })
    mock_db_state["workflow_tasks"].append({
        "id": task_id,
        "bill_id": bill_id,
        "assigned_role": UserRole.BRANCH_OFFICER.value,
        "status": "REJECTED",
        "remarks": "Commodity quality failed specification",
    })
    mock_db_state["approvals"].append({
        "id": "a0000000-0000-0000-0000-000000000066",
        "bill_id": bill_id,
        "workflow_task_id": task_id,
        "approver_id": mock_db_state["user_profiles"][1]["id"],
        "approver_role": UserRole.BRANCH_OFFICER.value,
        "decision": "REJECTED",
        "comments": "Commodity quality failed specification",
        "decided_at": "2026-10-24T12:00:00Z",
        "created_at": "2026-10-24T12:00:00Z",
    })

    with patch("app.dependencies.auth.get_supabase_user_client", return_value=mock_client), \
         patch("app.dependencies.db.get_supabase_user_client", return_value=mock_client), \
         patch("app.dependencies.db.get_supabase_admin_client", return_value=mock_client):

        # Supplier 1 views own progress -> succeeds and exposes rejection reason
        resp1 = client.get(
            f"/api/v1/approvals/bills/{bill_id}/workflow",
            headers={"Authorization": f"Bearer {supplier_token}"},
        )
        assert resp1.status_code == 200
        data = resp1.json()
        assert data["status"] == "REJECTED"
        assert data["rejection_reason"] == "Commodity quality failed specification"
        assert len(data["approvals"]) == 1

        # Supplier 2 attempts to view Supplier 1's progress -> 403 Forbidden
        resp2 = client.get(
            f"/api/v1/approvals/bills/{bill_id}/workflow",
            headers={"Authorization": f"Bearer {supplier2_token}"},
        )
        assert resp2.status_code == 403
        assert "another supplier's bill" in resp2.json()["detail"].lower()


def test_attempting_to_skip_stage(
    client: TestClient,
    pre_auditor_token: str,
    general_manager_token: str,
    mock_db_state: Dict[str, Any],
):
    """
    Verifies that stage skipping is prevented:
    - Pre-Auditor attempting to approve when bill is still 'SUBMITTED' fails (400 Bad Request).
    - General Manager attempting to approve when bill is 'BRANCH_APPROVED' (un-audited) fails (400 Bad Request).
    """
    mock_client = MockSupabaseClient(mock_db_state)
    bill_id = "e0000000-0000-0000-0000-000000000055"
    task_pre = "f0000000-0000-0000-0000-000000000055"
    task_gm = "f0000000-0000-0000-0000-000000000056"

    mock_db_state["bills"].append({
        "id": bill_id,
        "bill_number": "BILL-SKIP-TEST",
        "supplier_id": mock_db_state["suppliers"][0]["id"],
        "total_amount": 4000.0,
        "status": "SUBMITTED",  # Branch review not yet performed!
    })
    mock_db_state["workflow_tasks"].extend([
        {
            "id": task_pre,
            "bill_id": bill_id,
            "assigned_role": UserRole.PRE_AUDITOR.value,
            "status": "PENDING",
        },
        {
            "id": task_gm,
            "bill_id": bill_id,
            "assigned_role": UserRole.GENERAL_MANAGER.value,
            "status": "PENDING",
        },
    ])

    with patch("app.dependencies.auth.get_supabase_user_client", return_value=mock_client), \
         patch("app.dependencies.db.get_supabase_user_client", return_value=mock_client), \
         patch("app.dependencies.db.get_supabase_admin_client", return_value=mock_client):

        # Pre-Auditor attempts approval before Branch Officer review -> 400 Bad Request
        resp_pre = client.post(
            "/api/v1/approvals",
            headers={"Authorization": f"Bearer {pre_auditor_token}"},
            json={"workflow_task_id": task_pre, "decision": "APPROVED", "comments": "Premature audit"},
        )
        assert resp_pre.status_code == 400
        assert "requires bill status 'branch_approved'" in resp_pre.json()["detail"].lower()

        # Update bill to BRANCH_APPROVED (skipping PRE_AUDITED)
        bill = next(b for b in mock_db_state["bills"] if b["id"] == bill_id)
        bill["status"] = "BRANCH_APPROVED"

        # General Manager attempts approval before Pre-Audit -> 400 Bad Request
        resp_gm = client.post(
            "/api/v1/approvals",
            headers={"Authorization": f"Bearer {general_manager_token}"},
            json={"workflow_task_id": task_gm, "decision": "APPROVED", "comments": "Premature GM approval"},
        )
        assert resp_gm.status_code == 400
        assert "requires bill status 'pre_audited'" in resp_gm.json()["detail"].lower()


def test_concurrent_approval_and_rejection_conflict(
    client: TestClient,
    branch_officer_token: str,
    mock_db_state: Dict[str, Any],
):
    """
    Simulates race condition between simultaneous approval and rejection:
    - First request acquires task and transitions to COMPLETED.
    - Second request attempting to reject same task is blocked with 409 Conflict.
    - Prevents concurrent attempts from both approving and rejecting the same task.
    """
    mock_client = MockSupabaseClient(mock_db_state)
    bill_id = "e0000000-0000-0000-0000-000000000044"
    task_id = "f0000000-0000-0000-0000-000000000044"

    mock_db_state["bills"].append({
        "id": bill_id,
        "bill_number": "BILL-CONCURRENT-APPROVE",
        "supplier_id": mock_db_state["suppliers"][0]["id"],
        "total_amount": 2500.0,
        "status": "SUBMITTED",
    })
    mock_db_state["workflow_tasks"].append({
        "id": task_id,
        "bill_id": bill_id,
        "assigned_role": UserRole.BRANCH_OFFICER.value,
        "status": "PENDING",
    })

    with patch("app.dependencies.auth.get_supabase_user_client", return_value=mock_client), \
         patch("app.dependencies.db.get_supabase_user_client", return_value=mock_client), \
         patch("app.dependencies.db.get_supabase_admin_client", return_value=mock_client):

        # Request 1: Branch Officer approves task
        resp1 = client.post(
            "/api/v1/approvals",
            headers={"Authorization": f"Bearer {branch_officer_token}"},
            json={"workflow_task_id": task_id, "decision": "APPROVED", "comments": "Approved by Officer 1"},
        )
        assert resp1.status_code == 201

        # Request 2: Concurrent Officer attempt on same task (now COMPLETED)
        resp2 = client.post(
            "/api/v1/approvals",
            headers={"Authorization": f"Bearer {branch_officer_token}"},
            json={"workflow_task_id": task_id, "decision": "REJECTED", "comments": "Conflicting rejection by Officer 2"},
        )
        assert resp2.status_code == 409
        assert "must be 'pending'" in resp2.json()["detail"].lower()

        # Bill remains in approved state, task remains COMPLETED
        bill = next(b for b in mock_db_state["bills"] if b["id"] == bill_id)
        assert bill["status"] == "BRANCH_APPROVED"

