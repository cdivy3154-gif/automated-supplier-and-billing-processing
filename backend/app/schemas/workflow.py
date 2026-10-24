from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field

from app.schemas.user import UserRole


class WorkflowTaskResponse(BaseModel):
    """Schema representing a workflow task in the approval pipeline."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    bill_id: UUID
    assigned_role: UserRole
    assigned_user_id: Optional[UUID] = None
    status: str
    remarks: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class ApprovalCreate(BaseModel):
    """Payload submitted by authorized officers to approve or reject a workflow task."""
    workflow_task_id: UUID
    decision: str = Field(..., description="Approval decision: 'APPROVED' or 'REJECTED'")
    comments: Optional[str] = Field(default=None, description="Mandatory when decision is 'REJECTED'")


class ApprovalResponse(BaseModel):
    """Immutable record of an officer's approval decision."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    bill_id: UUID
    workflow_task_id: UUID
    approver_id: UUID
    approver_role: str
    decision: str
    comments: Optional[str] = None
    decided_at: Optional[datetime] = None
    created_at: Optional[datetime] = None


class BillWorkflowProgressResponse(BaseModel):
    """Full approval lifecycle progress for a bill."""
    model_config = ConfigDict(from_attributes=True)

    bill_id: UUID
    bill_number: str
    status: str
    total_amount: Decimal
    current_task: Optional[WorkflowTaskResponse] = None
    tasks: List[WorkflowTaskResponse] = Field(default_factory=list)
    approvals: List[ApprovalResponse] = Field(default_factory=list)
    rejection_reason: Optional[str] = None
