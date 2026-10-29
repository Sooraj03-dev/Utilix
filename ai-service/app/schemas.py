"""Pydantic models for AI service contracts."""
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field

class Slot(BaseModel):
    id: str
    resourceId: str
    resourceName: str
    department: str
    startTime: str
    endTime: str
    capacity: int = 1
    slotType: Literal["free", "credit"] = "free"
    creditCost: int = 0

class PolicyWeights(BaseModel):
    usage: float = 0.35
    waiting: float = 0.25
    need: float = 0.20
    diversity: float = 0.20

class Policy(BaseModel):
    weights: PolicyWeights = Field(default_factory=PolicyWeights)
    tieBreakerOrder: List[str] = Field(
        default_factory=lambda: ["fewestSessionsThisMonth", "earliestRequest", "seededLottery"]
    )
    defaultCreditCost: int = 1
    epsilon: float = 0.0001
    seed: str = "utilix"

class RequestItem(BaseModel):
    id: str
    userId: str
    userName: str = "Anonymous"
    department: str
    requestedSlotId: str
    sessionsThisMonth: int = 0
    waitingHours: float = 0.0
    projectNeedScore: float = 5.0
    isPriorityGroup: bool = False
    trainingVerified: bool = True
    withinBookingLimit: bool = True
    noOverlap: bool = True
    resourceAvailable: bool = True
    currentCreditBalance: int = 10
    freeSessionsLeft: int = 3
    submittedAt: str
    metadata: Dict[str, Any] = Field(default_factory=dict)

class ScoreBreakdown(BaseModel):
    usage: float
    waiting: float
    need: float
    diversity: float

class RankingItem(BaseModel):
    requestId: str
    userId: str
    rank: int
    totalScore: float
    scoreBreakdown: ScoreBreakdown
    studentReason: str
    coordinatorSummary: str
    decidedBy: Optional[str] = None
    tiedWith: List[str] = Field(default_factory=list)
    explanationSource: Optional[str] = "fallback"

class ExcludedItem(BaseModel):
    requestId: str
    userId: str
    reason: str
    code: str

class TieBreakInfo(BaseModel):
    tiedGroupsCount: int = 0
    totalTiedRequests: int = 0
    tiesDecided: List[Dict[str, Any]] = Field(default_factory=list)
    seedUsed: Optional[str] = None

class AuditInfo(BaseModel):
    totalRequests: int
    eligibleRequests: int
    excludedRequests: int
    capacity: int
    policyUsed: Policy
    tieBreakInfo: TieBreakInfo
    executionTimeMs: float

class AllocateRequest(BaseModel):
    slot: Slot
    requests: List[RequestItem]
    policy: Optional[Policy] = None
    seed: Optional[str] = None
    mode: Literal["standard", "promotion"] = "standard"

class AllocateResponse(BaseModel):
    allocated: List[RankingItem]
    waitlist: List[RankingItem]
    excluded: List[ExcludedItem]
    audit: AuditInfo

class AlternativeOption(BaseModel):
    slot: Slot
    scoreDiff: float
    reason: str

class AlternativesRequest(BaseModel):
    requestedSlot: Slot
    availableSlots: List[Slot]
    userRequest: RequestItem
    limit: int = 3

class AlternativesResponse(BaseModel):
    alternatives: List[AlternativeOption]

class BundleRequest(BaseModel):
    resourceIds: List[str]
    slotsByResource: Dict[str, List[Slot]]
    teamRequest: RequestItem
    preferredStart: Optional[str] = None

class BundleResponse(BaseModel):
    bundleSlots: List[Slot]
    isComplete: bool
    reason: str

class EquipmentInsight(BaseModel):
    resourceId: str
    resourceName: str
    utilizationRate: float
    contentionRate: float
    recommendation: str

class InsightsResponse(BaseModel):
    equipmentUtilization: Dict[str, float]
    contentionRate: Dict[str, float]
    giniCoefficient: float
    jainFairnessIndex: float
    recommendations: List[Dict[str, str]]
    narrative: List[str]

class HealthResponse(BaseModel):
    status: str
    version: str = "1.0.0"
    service: str = "ai-service"
    secretConfigured: bool
    llmProvider: str
    llmModel: str
