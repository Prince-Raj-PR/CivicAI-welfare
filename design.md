# CivicAI - System Design Document

## 1. Executive Summary

CivicAI is an AI-powered public welfare eligibility engine that simplifies access to government assistance programs. This document outlines the technical architecture for a production-ready, hackathon-demonstrable system.

**Core Technologies**:
- Frontend: React 18+ with TypeScript
- Backend: FastAPI (Python 3.10+)
- Database: PostgreSQL 14+, Redis
- AI/ML: OpenAI GPT-4, scikit-learn
- Infrastructure: AWS (ECS, RDS, S3, CloudFront)

---

## 2. High-Level Architecture

### 2.1 System Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Client Layer                          │
│   React Web App  │  Mobile Responsive  │  Admin Portal  │
└─────────────────────────────────────────────────────────┘
                          │
                    ┌─────▼─────┐
                    │ CloudFront│
                    │    CDN    │
                    └─────┬─────┘
                          │
┌─────────────────────────▼─────────────────────────────┐
│              API Gateway (ALB)                         │
│         Rate Limiting │ Auth │ Routing                │
└─────────────────────────┬─────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
┌───────▼────────┐ ┌─────▼──────┐ ┌───────▼────────┐
│   FastAPI      │ │  AI/ML     │ │  Integration   │
│   Services     │ │  Engine    │ │  Services      │
│                │ │            │ │                │
│ • User Mgmt    │ │ • NLP Chat │ │ • Gov APIs     │
│ • Programs     │ │ • Matching │ │ • Notifications│
│ • Applications │ │ • Explain  │ │ • Document OCR │
└───────┬────────┘ └─────┬──────┘ └───────┬────────┘
        │                │                │
        └────────────────┼────────────────┘
                         │
┌────────────────────────▼──────────────────────────┐
│              Data Layer                            │
│  PostgreSQL (RDS) │ Redis Cache │ S3 Storage      │
└───────────────────────────────────────────────────┘
```

### 2.2 Architecture Principles

- **Microservices-Ready**: Modular design for future decomposition
- **API-First**: RESTful with OpenAPI documentation
- **Stateless**: Horizontal scaling capability
- **Event-Driven**: Async processing for long tasks
- **Security by Design**: Zero-trust with end-to-end encryption

---

## 3. Component Breakdown

### 3.1 Frontend (React)

#### 3.1.1 Technology Stack
- **Core**: React 18.2+, TypeScript 5.0+
- **State**: Redux Toolkit with RTK Query
- **Routing**: React Router v6
- **UI**: Tailwind CSS 3.0+, Headless UI
- **Forms**: React Hook Form + Zod validation
- **Charts**: Recharts
- **Build**: Vite

#### 3.1.2 Project Structure
```
src/
├── components/
│   ├── common/          # Reusable UI (Button, Input, Modal)
│   ├── layout/          # Header, Footer, Sidebar
│   └── features/        # Feature-specific components
├── pages/
│   ├── auth/           # Login, Register
│   ├── dashboard/      # User dashboard
│   ├── programs/       # Program discovery
│   ├── applications/   # Application management
│   └── admin/          # Agency portal
├── store/
│   ├── slices/         # Redux slices
│   └── api/            # RTK Query APIs
├── hooks/              # Custom hooks
├── utils/              # Helpers
└── types/              # TypeScript types
```

#### 3.1.3 Key Features

**Eligibility Questionnaire**:
- Multi-step wizard with progress tracking
- Conditional rendering based on answers
- Real-time validation
- Auto-save functionality

**AI Chat Interface**:
- Streaming responses
- Message history
- Markdown support
- File attachments

**Program Discovery**:
- Card-based layout with filters
- Match confidence badges
- Quick apply buttons
- Bookmark functionality

### 3.2 Backend (FastAPI)

#### 3.2.1 Technology Stack
- **Framework**: FastAPI 0.104+
- **ORM**: SQLAlchemy 2.0 + Alembic
- **Validation**: Pydantic v2
- **Auth**: JWT (python-jose), passlib
- **Tasks**: Celery + Redis
- **Cache**: Redis
- **Testing**: pytest, httpx

#### 3.2.2 Project Structure
```
app/
├── main.py              # FastAPI entry point
├── config.py            # Configuration
├── api/
│   └── v1/
│       ├── auth.py
│       ├── users.py
│       ├── programs.py
│       ├── applications.py
│       ├── eligibility.py
│       └── chat.py
├── models/              # SQLAlchemy models
├── schemas/             # Pydantic schemas
├── services/            # Business logic
│   ├── eligibility_engine.py
│   ├── ai_service.py
│   └── notification_service.py
├── ml/                  # ML modules
│   ├── eligibility_matcher.py
│   └── explainer.py
└── utils/
```

#### 3.2.3 API Endpoints

```
Authentication:
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh

Users:
GET    /api/v1/users/me
PUT    /api/v1/users/me
POST   /api/v1/users/me/profile

Programs:
GET    /api/v1/programs
GET    /api/v1/programs/{id}
POST   /api/v1/programs/search

Eligibility:
POST   /api/v1/eligibility/assess
GET    /api/v1/eligibility/matches
POST   /api/v1/eligibility/explain

Applications:
POST   /api/v1/applications
GET    /api/v1/applications
GET    /api/v1/applications/{id}
PUT    /api/v1/applications/{id}

Chat:
POST   /api/v1/chat/message
GET    /api/v1/chat/history
WS     /api/v1/chat/stream

Documents:
POST   /api/v1/documents/upload
GET    /api/v1/documents/{id}
```

#### 3.2.4 Response Format

**Success**:
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful",
  "timestamp": "2026-02-13T10:30:00Z"
}
```

**Error**:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": [{"field": "email", "message": "Invalid format"}]
  },
  "timestamp": "2026-02-13T10:30:00Z"
}
```

### 3.3 AI/ML Engine

#### 3.3.1 Architecture

```
┌──────────────────────────────────────────────┐
│            AI/ML Engine                       │
│                                              │
│  ┌────────────────────────────────────┐    │
│  │  NLP Layer (OpenAI GPT-4)         │    │
│  │  • Intent Classification           │    │
│  │  • Entity Extraction              │    │
│  │  • Question Answering             │    │
│  └────────────────────────────────────┘    │
│                   │                          │
│  ┌────────────────▼────────────────────┐   │
│  │  Eligibility Matching Engine       │   │
│  │  • Rule-Based Matcher              │   │
│  │  • ML Scorer (Random Forest)       │   │
│  │  • Hybrid Decision Fusion          │   │
│  └────────────────────────────────────┘   │
│                   │                          │
│  ┌────────────────▼────────────────────┐   │
│  │  Explainability Module             │   │
│  │  • SHAP Values                     │   │
│  │  • Rule Explanations               │   │
│  │  • Natural Language Generation     │   │
│  └────────────────────────────────────┘   │
└──────────────────────────────────────────────┘
```

#### 3.3.2 NLP Chat System

**Implementation**:
```python
class ChatService:
    def __init__(self):
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY)
        self.context_window = 10
    
    async def generate_response(
        self,
        message: str,
        user_context: UserContext,
        history: List[Message]
    ) -> str:
        system_prompt = f"""
        You are CivicAI, helping users with welfare programs.
        
        User Context:
        - Location: {user_context.state}, {user_context.city}
        - Income: ${user_context.annual_income}
        - Household: {user_context.household_size} people
        
        Be empathetic, clear, and actionable.
        """
        
        messages = [
            {"role": "system", "content": system_prompt},
            *self._format_history(history[-self.context_window:]),
            {"role": "user", "content": message}
        ]
        
        response = await self.client.chat.completions.create(
            model="gpt-4-turbo-preview",
            messages=messages,
            temperature=0.7,
            max_tokens=500
        )
        
        return response.choices[0].message.content
```

---

## 4. Data Model Schema

### 4.1 Entity Relationship Diagram

```
User ──────< Application >────── Program
  │              │                   │
  │              │                   │
  ▼              ▼                   ▼
UserProfile   Document      EligibilityCriteria
  │                                  │
  ▼                                  ▼
EligibilityAssessment          ProgramCategory
```

### 4.2 Core Tables

#### Users
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'citizen',
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
```

#### User Profiles
```sql
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    date_of_birth DATE,
    ssn_encrypted TEXT,
    
    -- Address
    street_address VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(2),
    zip_code VARCHAR(10),
    county VARCHAR(100),
    
    -- Demographics
    household_size INTEGER,
    annual_income DECIMAL(12, 2),
    employment_status VARCHAR(50),
    marital_status VARCHAR(50),
    
    -- Special Status
    has_disability BOOLEAN DEFAULT false,
    is_veteran BOOLEAN DEFAULT false,
    is_student BOOLEAN DEFAULT false,
    num_children INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_user_profile UNIQUE(user_id)
);

CREATE INDEX idx_profiles_location ON user_profiles(state, city);
CREATE INDEX idx_profiles_income ON user_profiles(annual_income);
```

#### Programs
```sql
CREATE TABLE programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    program_type VARCHAR(100),  -- SNAP, Medicaid, Housing, TANF
    agency_name VARCHAR(255),
    agency_level VARCHAR(50),   -- Federal, State, Local
    
    -- Geographic Scope
    state VARCHAR(2),
    county VARCHAR(100),
    is_nationwide BOOLEAN DEFAULT false,
    
    -- Benefits
    benefit_amount_min DECIMAL(12, 2),
    benefit_amount_max DECIMAL(12, 2),
    benefit_type VARCHAR(100),  -- Cash, Food, Medical, Housing
    
    -- Contact
    application_url TEXT,
    contact_phone VARCHAR(20),
    contact_email VARCHAR(255),
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    enrollment_open BOOLEAN DEFAULT true,
    application_deadline DATE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_programs_type ON programs(program_type);
CREATE INDEX idx_programs_location ON programs(state, county);
CREATE INDEX idx_programs_active ON programs(is_active);
```

#### Eligibility Criteria
```sql
CREATE TABLE eligibility_criteria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID REFERENCES programs(id) ON DELETE CASCADE,
    
    -- Income
    income_limit_annual DECIMAL(12, 2),
    income_percentage_fpl INTEGER,
    
    -- Age
    min_age INTEGER,
    max_age INTEGER,
    
    -- Status Requirements
    citizenship_required BOOLEAN DEFAULT false,
    residency_required BOOLEAN DEFAULT true,
    requires_disability BOOLEAN DEFAULT false,
    requires_veteran_status BOOLEAN DEFAULT false,
    requires_employment BOOLEAN DEFAULT false,
    
    -- Household
    min_household_size INTEGER,
    max_household_size INTEGER,
    requires_dependents BOOLEAN DEFAULT false,
    
    -- Flexible Criteria
    additional_criteria JSONB,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_eligibility_program ON eligibility_criteria(program_id);
```

#### Applications
```sql
CREATE TABLE applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    program_id UUID REFERENCES programs(id) ON DELETE CASCADE,
    
    -- Status
    status VARCHAR(50) DEFAULT 'draft',
    submission_date TIMESTAMP,
    review_date TIMESTAMP,
    decision_date TIMESTAMP,
    
    -- Data
    form_data JSONB NOT NULL,
    eligibility_score DECIMAL(5, 2),
    
    -- Review
    assigned_reviewer_id UUID,
    reviewer_notes TEXT,
    denial_reason TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_status CHECK (
        status IN ('draft', 'submitted', 'under_review', 
                   'approved', 'denied', 'withdrawn')
    )
);

CREATE INDEX idx_applications_user ON applications(user_id);
CREATE INDEX idx_applications_program ON applications(program_id);
CREATE INDEX idx_applications_status ON applications(status);
```

#### Eligibility Assessments
```sql
CREATE TABLE eligibility_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    program_id UUID REFERENCES programs(id) ON DELETE CASCADE,
    
    -- Results
    is_eligible BOOLEAN,
    confidence_score DECIMAL(5, 2),
    match_percentage INTEGER,
    
    -- Details
    criteria_met JSONB,
    criteria_failed JSONB,
    missing_information JSONB,
    
    -- Explanation
    explanation_text TEXT,
    recommendation TEXT,
    
    -- ML Metadata
    model_version VARCHAR(50),
    feature_importance JSONB,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_assessments_user ON eligibility_assessments(user_id);
CREATE INDEX idx_assessments_program ON eligibility_assessments(program_id);
CREATE INDEX idx_assessments_eligible ON eligibility_assessments(is_eligible);
```

#### Documents
```sql
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
    
    -- Metadata
    document_type VARCHAR(100),
    file_name VARCHAR(255),
    file_size INTEGER,
    mime_type VARCHAR(100),
    
    -- Storage
    s3_bucket VARCHAR(255),
    s3_key VARCHAR(500),
    s3_url TEXT,
    
    -- Verification
    is_verified BOOLEAN DEFAULT false,
    verified_by UUID,
    verified_at TIMESTAMP,
    
    -- OCR
    extracted_data JSONB,
    ocr_confidence DECIMAL(5, 2),
    
    expiration_date DATE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_documents_user ON documents(user_id);
CREATE INDEX idx_documents_type ON documents(document_type);
```

#### Chat Messages
```sql
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL,
    
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    
    -- Context
    context_data JSONB,
    
    -- AI Metadata
    model_used VARCHAR(100),
    tokens_used INTEGER,
    response_time_ms INTEGER,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_role CHECK (role IN ('user', 'assistant', 'system'))
);

CREATE INDEX idx_messages_user ON chat_messages(user_id);
CREATE INDEX idx_messages_conversation ON chat_messages(conversation_id);
```

### 4.3 Redis Cache Schema

```
# Cache Keys
user:{user_id}:profile                    # TTL: 1 hour
user:{user_id}:eligibility                # TTL: 24 hours
program:{program_id}                      # TTL: 6 hours
programs:list:{state}:{type}              # TTL: 1 hour
session:{session_id}                      # TTL: 24 hours
rate_limit:{user_id}:{endpoint}           # TTL: 1 minute
chat:{conversation_id}:history            # TTL: 1 hour
```

---

## 5. Eligibility Engine Design

### 5.1 Hybrid Architecture

The eligibility engine combines rule-based logic with machine learning for accuracy and explainability.

```
Input: User Profile + Program Criteria
           │
           ▼
┌──────────────────────────────┐
│  Rule-Based Pre-Screening   │
│  • Hard requirement checks   │
│  • Immediate disqualification│
└──────────────────────────────┘
           │
           ▼
┌──────────────────────────────┐
│  Feature Engineering         │
│  • Income ratios             │
│  • Demographic encoding      │
└──────────────────────────────┘
           │
           ▼
┌──────────────────────────────┐
│  ML-Based Scoring            │
│  • Random Forest classifier  │
│  • Confidence generation     │
└──────────────────────────────┘
           │
           ▼
┌──────────────────────────────┐
│  Decision Fusion             │
│  • Combine results           │
│  • Generate explanation      │
└──────────────────────────────┘
           │
           ▼
Output: Eligibility + Confidence + Explanation
```

### 5.2 Rule-Based Matcher

```python
class RuleBasedMatcher:
    """Hard requirement validation"""
    
    def evaluate(
        self,
        user_profile: UserProfile,
        criteria: EligibilityCriteria
    ) -> RuleMatchResult:
        
        failed = []
        met = []
        missing = []
        
        # Income check
        if criteria.income_limit_annual:
            if user_profile.annual_income is None:
                missing.append("annual_income")
            elif user_profile.annual_income > criteria.income_limit_annual:
                failed.append({
                    "criterion": "income_limit",
                    "required": f"<= ${criteria.income_limit_annual}",
                    "actual": f"${user_profile.annual_income}"
                })
            else:
                met.append("income_limit")
        
        # Age check
        if criteria.min_age or criteria.max_age:
            age = self._calculate_age(user_profile.date_of_birth)
            if age is None:
                missing.append("date_of_birth")
            elif criteria.min_age and age < criteria.min_age:
                failed.append({
                    "criterion": "minimum_age",
                    "required": f">= {criteria.min_age}",
                    "actual": age
                })
            elif criteria.max_age and age > criteria.max_age:
                failed.append({
                    "criterion": "maximum_age",
                    "required": f"<= {criteria.max_age}",
                    "actual": age
                })
            else:
                met.append("age_requirement")
        
        # Citizenship
        if criteria.citizenship_required:
            if user_profile.citizenship_status is None:
                missing.append("citizenship_status")
            elif not user_profile.is_citizen:
                failed.append({
                    "criterion": "citizenship",
                    "required": "US Citizen",
                    "actual": "Not verified"
                })
            else:
                met.append("citizenship")
        
        # Residency
        if criteria.residency_required and criteria.state:
            if not user_profile.state:
                missing.append("state")
            elif user_profile.state != criteria.state:
                failed.append({
                    "criterion": "residency",
                    "required": f"Resident of {criteria.state}",
                    "actual": f"Resident of {user_profile.state}"
                })
            else:
                met.append("residency")
        
        is_eligible = len(failed) == 0 and len(missing) == 0
        
        return RuleMatchResult(
            is_eligible=is_eligible,
            met_criteria=met,
            failed_criteria=failed,
            missing_information=missing
        )
```

### 5.3 ML-Based Scorer

```python
class MLEligibilityScorer:
    """Machine learning eligibility prediction"""
    
    def __init__(self):
        self.model = self._load_model()
        self.features = [
            'income_to_limit_ratio',
            'age',
            'household_size',
            'has_disability',
            'is_veteran',
            'num_children',
            'employment_encoded',
            'state_encoded',
            'program_type_encoded'
        ]
    
    def predict(
        self,
        user_profile: UserProfile,
        criteria: EligibilityCriteria
    ) -> MLScoreResult:
        
        # Engineer features
        features = self._engineer_features(user_profile, criteria)
        
        # Predict
        prediction = self.model.predict(features)[0]
        probabilities = self.model.predict_proba(features)[0]
        
        # Feature importance
        importance = dict(zip(
            self.features,
            self.model.feature_importances_
        ))
        
        return MLScoreResult(
            is_eligible=bool(prediction),
            confidence_score=float(probabilities[1]),
            feature_importance=importance
        )
    
    def _engineer_features(
        self,
        profile: UserProfile,
        criteria: EligibilityCriteria
    ) -> np.ndarray:
        
        features = []
        
        # Income ratio
        if criteria.income_limit_annual and profile.annual_income:
            ratio = profile.annual_income / criteria.income_limit_annual
        else:
            ratio = 0.5
        features.append(ratio)
        
        # Demographics
        features.append(self._calculate_age(profile.date_of_birth) or 35)
        features.append(profile.household_size or 1)
        features.append(1 if profile.has_disability else 0)
        features.append(1 if profile.is_veteran else 0)
        features.append(profile.num_children or 0)
        
        # Encoded categoricals
        employment_map = {
            'employed': 1, 'unemployed': 2,
            'self_employed': 3, 'retired': 4
        }
        features.append(employment_map.get(profile.employment_status, 0))
        
        state_map = {'CA': 1, 'NY': 2, 'TX': 3, 'FL': 4}
        features.append(state_map.get(profile.state, 0))
        
        program_map = {'SNAP': 1, 'Medicaid': 2, 'Housing': 3}
        features.append(program_map.get(criteria.program_type, 0))
        
        return np.array(features).reshape(1, -1)
```

### 5.4 Eligibility Engine Main Class

```python
class EligibilityEngine:
    """Main eligibility assessment engine"""
    
    def __init__(self):
        self.rule_matcher = RuleBasedMatcher()
        self.ml_scorer = MLEligibilityScorer()
        self.explainer = ExplainabilityModule()
    
    async def assess_eligibility(
        self,
        user_profile: UserProfile,
        program: Program
    ) -> EligibilityAssessment:
        
        criteria = await self._get_criteria(program.id)
        
        # Step 1: Rule-based screening
        rule_result = self.rule_matcher.evaluate(user_profile, criteria)
        
        # Early exit if hard requirements failed
        if rule_result.failed_criteria:
            return EligibilityAssessment(
                is_eligible=False,
                confidence_score=0.0,
                match_percentage=0,
                criteria_met=rule_result.met_criteria,
                criteria_failed=rule_result.failed_criteria,
                explanation=self.explainer.explain_failure(rule_result)
            )
        
        # Early exit if missing info
        if rule_result.missing_information:
            return EligibilityAssessment(
                is_eligible=None,
                confidence_score=0.0,
                match_percentage=0,
                missing_information=rule_result.missing_information,
                explanation=self.explainer.explain_missing(rule_result)
            )
        
        # Step 2: ML scoring
        ml_result = self.ml_scorer.predict(user_profile, criteria)
        
        # Step 3: Fuse decisions
        final = self._fuse_decisions(rule_result, ml_result)
        
        # Step 4: Generate explanation
        explanation = self.explainer.explain_success(
            rule_result, ml_result
        )
        
        return EligibilityAssessment(
            is_eligible=final.is_eligible,
            confidence_score=final.confidence_score,
            match_percentage=final.match_percentage,
            criteria_met=rule_result.met_criteria,
            explanation=explanation,
            feature_importance=ml_result.feature_importance,
            model_version="v1.0"
        )
    
    def _fuse_decisions(
        self,
        rule_result: RuleMatchResult,
        ml_result: MLScoreResult
    ) -> FinalDecision:
        
        if rule_result.is_eligible:
            is_eligible = ml_result.is_eligible
            confidence = ml_result.confidence_score
            match_pct = int(confidence * 100)
        else:
            is_eligible = False
            confidence = 0.0
            match_pct = 0
        
        return FinalDecision(
            is_eligible=is_eligible,
            confidence_score=confidence,
            match_percentage=match_pct
        )
```

---

## 6. Explainable AI Module

### 6.1 Explanation Generator

```python
class ExplainabilityModule:
    """Generate human-readable explanations"""
    
    def explain_failure(self, rule_result: RuleMatchResult) -> str:
        explanation = [
            "Based on our assessment, you do not currently qualify. Here's why:\n"
        ]
        
        for failed in rule_result.failed_criteria:
            criterion = failed['criterion']
            required = failed['required']
            actual = failed['actual']
            
            if criterion == "income_limit":
                explanation.append(
                    f"• Income: Your income (${actual}) exceeds "
                    f"the limit ({required})"
                )
            elif criterion == "minimum_age":
                explanation.append(
                    f"• Age: Must be {required}. Current: {actual}"
                )
            elif criterion == "residency":
                explanation.append(
                    f"• Residency: {required}. You are {actual}"
                )
        
        if rule_result.met_criteria:
            explanation.append(
                f"\nYou meet {len(rule_result.met_criteria)} other requirements."
            )
        
        return "\n".join(explanation)
    
    def explain_missing(self, rule_result: RuleMatchResult) -> str:
        field_names = {
            'annual_income': 'annual household income',
            'date_of_birth': 'date of birth',
            'citizenship_status': 'citizenship status',
            'state': 'state of residence'
        }
        
        missing = [
            field_names.get(f, f) 
            for f in rule_result.missing_information
        ]
        
        explanation = (
            "We need additional information:\n\n"
            + "\n".join(f"• {m.capitalize()}" for m in missing)
            + "\n\nPlease update your profile to check eligibility."
        )
        
        return explanation
    
    def explain_success(
        self,
        rule_result: RuleMatchResult,
        ml_result: MLScoreResult
    ) -> str:
        
        confidence = ml_result.confidence_score
        
        if confidence >= 0.8:
            level = "highly likely"
        elif confidence >= 0.6:
            level = "likely"
        else:
            level = "possibly"
        
        explanation = [
            f"Good news! You are {level} eligible "
            f"(confidence: {confidence*100:.0f}%).\n",
            "\nRequirements you meet:"
        ]
        
        for criterion in rule_result.met_criteria:
            explanation.append(
                f"✓ {criterion.replace('_', ' ').title()}"
            )
        
        # Top factors
        top_features = sorted(
            ml_result.feature_importance.items(),
            key=lambda x: x[1],
            reverse=True
        )[:3]
        
        explanation.append("\nKey factors:")
        for feature, _ in top_features:
            explanation.append(
                f"• {feature.replace('_', ' ').title()}"
            )
        
        return "\n".join(explanation)
```

### 6.2 SHAP Integration

```python
def generate_shap_explanation(
    model,
    features: np.ndarray,
    feature_names: List[str]
) -> Dict[str, float]:
    """Generate SHAP values for interpretability"""
    import shap
    
    explainer = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(features)
    
    if isinstance(shap_values, list):
        shap_values = shap_values[1]  # Positive class
    
    return dict(zip(feature_names, shap_values[0]))
```

### 6.3 Visual Explanations

**Frontend Components**:

1. **Match Percentage Bar**
   - Color-coded: Red (<50%), Yellow (50-75%), Green (>75%)
   - Animated progress bar
   - Percentage label

2. **Criteria Checklist**
   - ✓ for met criteria (green)
   - ✗ for failed criteria (red)
   - ? for missing info (yellow)
   - Expandable details

3. **Feature Importance Chart**
   - Horizontal bar chart
   - Top 5 factors
   - Positive/negative contributions
   - Interactive tooltips

---

## 7. Scalability Considerations

### 7.1 Horizontal Scaling

**Application Layer**:
- Stateless FastAPI containers
- Auto-scaling: 2-10 instances
- Trigger: CPU > 70% for 2 minutes
- Scale down: CPU < 30% for 5 minutes
- Load balancer: AWS ALB with health checks

**Database Layer**:
- PostgreSQL primary + 2 read replicas
- Connection pooling: PgBouncer (100 connections/instance)
- Table partitioning:
  - `applications`: Monthly by submission_date
  - `chat_messages`: Weekly by created_at
  - `eligibility_assessments`: Monthly by created_at

**Caching Layer**:
- Redis cluster: 3 masters + 3 replicas
- Cache-aside pattern
- Write-through for user profiles
- Cache warming for popular programs

### 7.2 Performance Optimization

**Database Optimization**:
```sql
-- Materialized view for program stats
CREATE MATERIALIZED VIEW program_stats AS
SELECT 
    p.id,
    p.name,
    COUNT(DISTINCT a.user_id) as applicants,
    COUNT(CASE WHEN a.status = 'approved' THEN 1 END) as approved,
    AVG(ea.confidence_score) as avg_confidence
FROM programs p
LEFT JOIN applications a ON p.id = a.program_id
LEFT JOIN eligibility_assessments ea ON p.id = ea.program_id
GROUP BY p.id, p.name;

-- Refresh hourly
CREATE INDEX idx_program_stats_id ON program_stats(id);
```

**API Optimization**:
- Response compression (gzip)
- Pagination (default: 20 items, max: 100)
- Field selection (sparse fieldsets)
- ETags for conditional requests
- Response caching with Redis

**ML Optimization**:
- Model quantization for faster inference
- Batch predictions
- In-memory model caching
- Async prediction with result caching

### 7.3 Performance Targets

**Benchmarks**:
- Concurrent users: 10,000
- Requests/second: 1,000
- Avg response time: <500ms
- 95th percentile: <1s
- 99th percentile: <2s
- Error rate: <0.1%
- Uptime: 99.9%

**Load Testing Scenarios**:
1. Registration spike: 1,000 users/min
2. Eligibility burst: 500 concurrent assessments
3. Application peak: 200 submissions/min
4. Chat load: 5,000 concurrent conversations

---

## 8. Security & Privacy

### 8.1 Authentication

**JWT Implementation**:
```python
from datetime import datetime, timedelta
from jose import jwt
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class SecurityService:
    SECRET_KEY = settings.SECRET_KEY
    ALGORITHM = "HS256"
    ACCESS_TOKEN_EXPIRE = 30  # minutes
    REFRESH_TOKEN_EXPIRE = 7  # days
    
    @staticmethod
    def create_access_token(data: dict) -> str:
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(
            minutes=SecurityService.ACCESS_TOKEN_EXPIRE
        )
        to_encode.update({"exp": expire, "type": "access"})
        return jwt.encode(
            to_encode,
            SecurityService.SECRET_KEY,
            algorithm=SecurityService.ALGORITHM
        )
    
    @staticmethod
    def verify_password(plain: str, hashed: str) -> bool:
        return pwd_context.verify(plain, hashed)
    
    @staticmethod
    def hash_password(password: str) -> str:
        return pwd_context.hash(password)
```

**Protected Routes**:
```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> User:
    token = credentials.credentials
    try:
        payload = jwt.decode(
            token,
            SecurityService.SECRET_KEY,
            algorithms=[SecurityService.ALGORITHM]
        )
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    
    user = await get_user_by_id(user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    return user
```

### 8.2 Data Encryption

**At Rest**:
- Database: AWS RDS encryption (AES-256)
- S3 documents: Server-side encryption (SSE-S3)
- Sensitive fields: Application-level encryption
  ```python
  from cryptography.fernet import Fernet
  
  class EncryptionService:
      def __init__(self):
          self.cipher = Fernet(settings.ENCRYPTION_KEY)
      
      def encrypt(self, data: str) -> str:
          return self.cipher.encrypt(data.encode()).decode()
      
      def decrypt(self, encrypted: str) -> str:
          return self.cipher.decrypt(encrypted.encode()).decode()
  ```

**In Transit**:
- TLS 1.3 for all connections
- HTTPS only (redirect HTTP to HTTPS)
- Certificate: AWS Certificate Manager
- HSTS headers enabled

### 8.3 Authorization

**Role-Based Access Control**:
```python
from enum import Enum

class Role(str, Enum):
    CITIZEN = "citizen"
    AGENCY_ADMIN = "agency_admin"
    SYSTEM_ADMIN = "system_admin"

def require_role(allowed_roles: List[Role]):
    def decorator(func):
        async def wrapper(*args, **kwargs):
            user = kwargs.get('current_user')
            if user.role not in allowed_roles:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Insufficient permissions"
                )
            return await func(*args, **kwargs)
        return wrapper
    return decorator

# Usage
@router.get("/admin/users")
@require_role([Role.SYSTEM_ADMIN])
async def list_users(current_user: User = Depends(get_current_user)):
    ...
```

### 8.4 Security Best Practices

**Input Validation**:
- Pydantic models for all inputs
- SQL injection prevention (parameterized queries)
- XSS prevention (output encoding)
- CSRF protection (SameSite cookies)

**Rate Limiting**:
```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@app.post("/api/v1/auth/login")
@limiter.limit("5/minute")
async def login(request: Request, credentials: LoginRequest):
    ...
```

**Audit Logging**:
```python
async def log_audit_event(
    user_id: UUID,
    action: str,
    resource: str,
    details: dict
):
    await db.execute(
        """
        INSERT INTO audit_logs 
        (user_id, action, resource, details, ip_address, timestamp)
        VALUES ($1, $2, $3, $4, $5, $6)
        """,
        user_id, action, resource, details, 
        request.client.host, datetime.utcnow()
    )
```

### 8.5 Compliance

**HIPAA** (for health-related benefits):
- Encrypted PHI storage
- Access controls and audit trails
- Business Associate Agreements (BAAs)
- Regular security assessments

**GDPR/CCPA**:
- Data minimization
- Right to access (export user data)
- Right to deletion (anonymize/delete)
- Consent management
- Privacy policy and terms

---

## 9. Deployment Architecture (AWS)

### 9.1 Infrastructure Overview

```
┌─────────────────────────────────────────────────────┐
│                  Route 53 (DNS)                      │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────┐
│              CloudFront (CDN)                        │
│  • Static assets (React build)                      │
│  • Edge caching                                     │
│  • SSL/TLS termination                              │
└─────────────────────┬───────────────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        │                           │
┌───────▼────────┐         ┌───────▼────────┐
│   S3 Bucket    │         │      ALB       │
│  (Frontend)    │         │ (Load Balancer)│
└────────────────┘         └───────┬────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
            ┌───────▼──────┐ ┌────▼─────┐ ┌─────▼──────┐
            │  ECS Task 1  │ │ECS Task 2│ │ ECS Task 3 │
            │   (FastAPI)  │ │(FastAPI) │ │  (FastAPI) │
            └───────┬──────┘ └────┬─────┘ └─────┬──────┘
                    │              │              │
                    └──────────────┼──────────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
            ┌───────▼──────┐ ┌────▼─────┐ ┌─────▼──────┐
            │  RDS Primary │ │ElastiCache│ │     S3     │
            │ (PostgreSQL) │ │  (Redis)  │ │ (Documents)│
            └───────┬──────┘ └──────────┘ └────────────┘
                    │
            ┌───────▼──────┐
            │ RDS Replica  │
            │  (Read-only) │
            └──────────────┘
```

### 9.2 AWS Services

**Compute**:
- **ECS Fargate**: Serverless containers for FastAPI
  - Task definition: 2 vCPU, 4GB RAM
  - Auto-scaling: 2-10 tasks
  - Health checks: `/health` endpoint

**Database**:
- **RDS PostgreSQL 14**:
  - Instance: db.t3.large (2 vCPU, 8GB RAM)
  - Multi-AZ deployment
  - Automated backups (7-day retention)
  - Read replicas: 2 instances
- **ElastiCache Redis**:
  - Node type: cache.t3.medium
  - Cluster mode: 3 shards, 1 replica each
  - Automatic failover

**Storage**:
- **S3**:
  - Frontend bucket: Static website hosting
  - Documents bucket: Encrypted, versioned
  - Lifecycle policies: Archive to Glacier after 90 days
- **EFS**: Shared ML model storage (optional)

**Networking**:
- **VPC**: Isolated network
  - Public subnets: ALB, NAT Gateway
  - Private subnets: ECS, RDS, ElastiCache
  - 3 Availability Zones
- **Security Groups**:
  - ALB: Allow 80, 443 from internet
  - ECS: Allow traffic from ALB only
  - RDS: Allow 5432 from ECS only
  - Redis: Allow 6379 from ECS only

**CDN & DNS**:
- **CloudFront**: Global CDN
  - Origin: S3 (frontend) + ALB (API)
  - Cache behaviors: Static assets (1 day), API (no cache)
  - Custom domain with SSL
- **Route 53**: DNS management
  - A record: civicai.com → CloudFront
  - Health checks and failover

**Monitoring**:
- **CloudWatch**:
  - Logs: ECS task logs, RDS logs
  - Metrics: CPU, memory, request count
  - Alarms: High error rate, low disk space
  - Dashboards: System overview
- **X-Ray**: Distributed tracing (optional)

**Security**:
- **IAM**: Role-based access
  - ECS task role: Access to S3, RDS
  - Lambda execution role: Minimal permissions
- **Secrets Manager**: Store credentials
  - Database password
  - API keys (OpenAI, etc.)
  - Encryption keys
- **WAF**: Web application firewall
  - Rate limiting
  - SQL injection protection
  - Geographic restrictions (optional)

### 9.3 Deployment Pipeline

**CI/CD with GitHub Actions**:

```yaml
name: Deploy to AWS

on:
  push:
    branches: [main]

jobs:
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install and Build
        run: |
          cd frontend
          npm ci
          npm run build
      
      - name: Deploy to S3
        run: |
          aws s3 sync frontend/dist s3://civicai-frontend --delete
          aws cloudfront create-invalidation \
            --distribution-id ${{ secrets.CLOUDFRONT_ID }} \
            --paths "/*"
  
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Configure AWS
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Login to ECR
        run: |
          aws ecr get-login-password --region us-east-1 | \
          docker login --username AWS --password-stdin \
          ${{ secrets.ECR_REGISTRY }}
      
      - name: Build and Push
        run: |
          docker build -t civicai-backend backend/
          docker tag civicai-backend:latest \
            ${{ secrets.ECR_REGISTRY }}/civicai-backend:latest
          docker push ${{ secrets.ECR_REGISTRY }}/civicai-backend:latest
      
      - name: Update ECS Service
        run: |
          aws ecs update-service \
            --cluster civicai-cluster \
            --service civicai-backend \
            --force-new-deployment
```

### 9.4 Infrastructure as Code (Terraform)

**Main Configuration**:
```hcl
# main.tf
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  
  backend "s3" {
    bucket = "civicai-terraform-state"
    key    = "prod/terraform.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = var.aws_region
}

# VPC
module "vpc" {
  source = "terraform-aws-modules/vpc/aws"
  
  name = "civicai-vpc"
  cidr = "10.0.0.0/16"
  
  azs             = ["us-east-1a", "us-east-1b", "us-east-1c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
  
  enable_nat_gateway = true
  single_nat_gateway = false
  
  tags = {
    Environment = "production"
    Project     = "CivicAI"
  }
}

# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "civicai-cluster"
  
  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

# RDS PostgreSQL
resource "aws_db_instance" "postgres" {
  identifier     = "civicai-db"
  engine         = "postgres"
  engine_version = "14.7"
  instance_class = "db.t3.large"
  
  allocated_storage     = 100
  max_allocated_storage = 500
  storage_encrypted     = true
  
  db_name  = "civicai"
  username = "civicai_admin"
  password = var.db_password
  
  multi_az               = true
  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name
  
  skip_final_snapshot = false
  final_snapshot_identifier = "civicai-db-final-snapshot"
  
  tags = {
    Environment = "production"
  }
}

# ElastiCache Redis
resource "aws_elasticache_replication_group" "redis" {
  replication_group_id       = "civicai-redis"
  replication_group_description = "Redis cluster for CivicAI"
  
  engine               = "redis"
  engine_version       = "7.0"
  node_type            = "cache.t3.medium"
  num_cache_clusters   = 3
  
  parameter_group_name = "default.redis7"
  port                 = 6379
  
  subnet_group_name    = aws_elasticache_subnet_group.main.name
  security_group_ids   = [aws_security_group.redis.id]
  
  automatic_failover_enabled = true
  multi_az_enabled          = true
  
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  
  tags = {
    Environment = "production"
  }
}

# S3 Buckets
resource "aws_s3_bucket" "frontend" {
  bucket = "civicai-frontend"
  
  tags = {
    Environment = "production"
  }
}

resource "aws_s3_bucket_website_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id
  
  index_document {
    suffix = "index.html"
  }
  
  error_document {
    key = "index.html"
  }
}

resource "aws_s3_bucket" "documents" {
  bucket = "civicai-documents"
  
  tags = {
    Environment = "production"
  }
}

resource "aws_s3_bucket_versioning" "documents" {
  bucket = aws_s3_bucket.documents.id
  
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "documents" {
  bucket = aws_s3_bucket.documents.id
  
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# CloudFront Distribution
resource "aws_cloudfront_distribution" "main" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  
  origin {
    domain_name = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_id   = "S3-Frontend"
    
    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.main.cloudfront_access_identity_path
    }
  }
  
  origin {
    domain_name = aws_lb.main.dns_name
    origin_id   = "ALB-Backend"
    
    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }
  
  default_cache_behavior {
    target_origin_id       = "S3-Frontend"
    viewer_protocol_policy = "redirect-to-https"
    
    allowed_methods = ["GET", "HEAD", "OPTIONS"]
    cached_methods  = ["GET", "HEAD"]
    
    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
    
    min_ttl     = 0
    default_ttl = 86400
    max_ttl     = 31536000
  }
  
  ordered_cache_behavior {
    path_pattern           = "/api/*"
    target_origin_id       = "ALB-Backend"
    viewer_protocol_policy = "https-only"
    
    allowed_methods = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods  = ["GET", "HEAD"]
    
    forwarded_values {
      query_string = true
      headers      = ["Authorization", "Origin"]
      cookies {
        forward = "all"
      }
    }
    
    min_ttl     = 0
    default_ttl = 0
    max_ttl     = 0
  }
  
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
  
  viewer_certificate {
    acm_certificate_arn      = var.acm_certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
  
  tags = {
    Environment = "production"
  }
}
```

### 9.5 Environment Configuration

**Development**:
- Single ECS task
- db.t3.micro RDS instance
- cache.t3.micro Redis
- No read replicas
- Cost: ~$100/month

**Staging**:
- 2 ECS tasks
- db.t3.medium RDS
- cache.t3.small Redis
- 1 read replica
- Cost: ~$300/month

**Production**:
- 2-10 ECS tasks (auto-scaling)
- db.t3.large RDS (Multi-AZ)
- cache.t3.medium Redis cluster
- 2 read replicas
- CloudFront + WAF
- Cost: ~$800-1500/month

### 9.6 Disaster Recovery

**Backup Strategy**:
- RDS: Automated daily backups (7-day retention)
- S3: Versioning enabled, cross-region replication
- Redis: Daily snapshots (3-day retention)
- Application data: Weekly full backup to S3 Glacier

**Recovery Procedures**:
- **RPO** (Recovery Point Objective): 1 hour
- **RTO** (Recovery Time Objective): 4 hours

**Failover Plan**:
1. Database: Automatic failover to standby (Multi-AZ)
2. Application: Auto-scaling replaces failed tasks
3. Cache: Redis automatic failover to replica
4. Region failure: Manual failover to DR region

---

## 10. Monitoring & Observability

### 10.1 Logging

**Structured Logging**:
```python
import logging
import json
from datetime import datetime

class JSONFormatter(logging.Formatter):
    def format(self, record):
        log_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno
        }
        
        if hasattr(record, 'user_id'):
            log_data['user_id'] = record.user_id
        
        if hasattr(record, 'request_id'):
            log_data['request_id'] = record.request_id
        
        if record.exc_info:
            log_data['exception'] = self.formatException(record.exc_info)
        
        return json.dumps(log_data)

# Configure logger
logger = logging.getLogger("civicai")
handler = logging.StreamHandler()
handler.setFormatter(JSONFormatter())
logger.addHandler(handler)
logger.setLevel(logging.INFO)
```

### 10.2 Metrics

**Key Metrics**:
- Request rate (requests/second)
- Response time (p50, p95, p99)
- Error rate (4xx, 5xx)
- Database connections
- Cache hit rate
- ML inference time
- Active users

**CloudWatch Custom Metrics**:
```python
import boto3

cloudwatch = boto3.client('cloudwatch')

def publish_metric(metric_name: str, value: float, unit: str = 'Count'):
    cloudwatch.put_metric_data(
        Namespace='CivicAI',
        MetricData=[
            {
                'MetricName': metric_name,
                'Value': value,
                'Unit': unit,
                'Timestamp': datetime.utcnow()
            }
        ]
    )

# Usage
publish_metric('EligibilityAssessments', 1)
publish_metric('MLInferenceTime', 0.234, 'Seconds')
```

### 10.3 Alerting

**CloudWatch Alarms**:
- High error rate (>1% for 5 minutes)
- High response time (p95 >2s for 5 minutes)
- Low disk space (<20%)
- High CPU (>80% for 10 minutes)
- Database connection errors
- Failed deployments

**Alert Channels**:
- Email (AWS SNS)
- Slack (webhook)
- PagerDuty (critical alerts)

### 10.4 Health Checks

```python
@app.get("/health")
async def health_check():
    """Basic health check"""
    return {"status": "healthy", "timestamp": datetime.utcnow()}

@app.get("/health/detailed")
async def detailed_health_check():
    """Detailed health with dependencies"""
    checks = {
        "database": await check_database(),
        "redis": await check_redis(),
        "s3": await check_s3(),
        "openai": await check_openai()
    }
    
    all_healthy = all(checks.values())
    status_code = 200 if all_healthy else 503
    
    return JSONResponse(
        status_code=status_code,
        content={
            "status": "healthy" if all_healthy else "unhealthy",
            "checks": checks,
            "timestamp": datetime.utcnow().isoformat()
        }
    )
```

---

## 11. Testing Strategy

### 11.1 Unit Tests

```python
# tests/test_eligibility_engine.py
import pytest
from app.services.eligibility_engine import RuleBasedMatcher

def test_income_check_pass():
    matcher = RuleBasedMatcher()
    profile = UserProfile(annual_income=30000)
    criteria = EligibilityCriteria(income_limit_annual=40000)
    
    result = matcher.evaluate(profile, criteria)
    
    assert "income_limit" in result.met_criteria
    assert len(result.failed_criteria) == 0

def test_income_check_fail():
    matcher = RuleBasedMatcher()
    profile = UserProfile(annual_income=50000)
    criteria = EligibilityCriteria(income_limit_annual=40000)
    
    result = matcher.evaluate(profile, criteria)
    
    assert len(result.failed_criteria) == 1
    assert result.failed_criteria[0]['criterion'] == 'income_limit'
```

### 11.2 Integration Tests

```python
# tests/test_api.py
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_eligibility_assessment(client: AsyncClient, auth_token: str):
    response = await client.post(
        "/api/v1/eligibility/assess",
        json={"program_id": "test-program-id"},
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "is_eligible" in data
    assert "confidence_score" in data
```

### 11.3 Load Tests

```python
# locustfile.py
from locust import HttpUser, task, between

class CivicAIUser(HttpUser):
    wait_time = between(1, 3)
    
    def on_start(self):
        # Login
        response = self.client.post("/api/v1/auth/login", json={
            "email": "test@example.com",
            "password": "password123"
        })
        self.token = response.json()["access_token"]
    
    @task(3)
    def view_programs(self):
        self.client.get(
            "/api/v1/programs",
            headers={"Authorization": f"Bearer {self.token}"}
        )
    
    @task(2)
    def assess_eligibility(self):
        self.client.post(
            "/api/v1/eligibility/assess",
            json={"program_id": "snap-ca"},
            headers={"Authorization": f"Bearer {self.token}"}
        )
    
    @task(1)
    def chat_message(self):
        self.client.post(
            "/api/v1/chat/message",
            json={"message": "What programs am I eligible for?"},
            headers={"Authorization": f"Bearer {self.token}"}
        )
```

---

## 12. Cost Estimation

### 12.1 Monthly AWS Costs (Production)

| Service | Configuration | Monthly Cost |
|---------|--------------|--------------|
| ECS Fargate | 3 tasks × 2 vCPU, 4GB | $180 |
| RDS PostgreSQL | db.t3.large Multi-AZ | $280 |
| RDS Read Replicas | 2 × db.t3.large | $280 |
| ElastiCache Redis | 3-node cluster | $150 |
| S3 Storage | 100GB + requests | $30 |
| CloudFront | 1TB transfer | $85 |
| ALB | Load balancer + LCUs | $25 |
| Data Transfer | Inter-AZ + outbound | $50 |
| CloudWatch | Logs + metrics | $30 |
| Secrets Manager | 10 secrets | $5 |
| **Total** | | **~$1,115/month** |

### 12.2 Third-Party Costs

| Service | Usage | Monthly Cost |
|---------|-------|--------------|
| OpenAI API | 10M tokens | $200 |
| Twilio SMS | 10K messages | $75 |
| SendGrid Email | 100K emails | $20 |
| **Total** | | **~$295/month** |

**Grand Total: ~$1,410/month**

---

## 13. Future Enhancements

### 13.1 Phase 2 (Post-Hackathon)

1. **Mobile Apps**: Native iOS/Android
2. **Advanced AI**: Document OCR, fraud detection
3. **Integrations**: Government APIs, bank verification
4. **Analytics**: Advanced reporting, predictive modeling
5. **Multi-language**: Spanish, Chinese, Vietnamese

### 13.2 Phase 3 (Long-term)

1. **Blockchain**: Decentralized identity
2. **API Marketplace**: Third-party integrations
3. **White-label**: State/local government versions
4. **Policy Tools**: Impact simulation for policymakers
5. **Global Expansion**: International programs

---

## Appendix

### A. Technology Alternatives

**Frontend**:
- Alternative: Next.js (SSR), Vue.js, Svelte
- Chosen: React (ecosystem, team familiarity)

**Backend**:
- Alternative: Django, Express.js, Spring Boot
- Chosen: FastAPI (performance, async, auto-docs)

**Database**:
- Alternative: MySQL, MongoDB, DynamoDB
- Chosen: PostgreSQL (ACID, JSON support, maturity)

**AI/ML**:
- Alternative: Anthropic Claude, local models
- Chosen: OpenAI GPT-4 (quality, reliability)

### B. Glossary

- **FPL**: Federal Poverty Level
- **SNAP**: Supplemental Nutrition Assistance Program
- **TANF**: Temporary Assistance for Needy Families
- **SSN**: Social Security Number
- **PII**: Personally Identifiable Information
- **SHAP**: SHapley Additive exPlanations
- **OCR**: Optical Character Recognition

### C. References

- FastAPI Documentation: https://fastapi.tiangolo.com
- React Documentation: https://react.dev
- AWS Well-Architected Framework: https://aws.amazon.com/architecture/well-architected
- WCAG 2.1 Guidelines: https://www.w3.org/WAI/WCAG21/quickref
- Benefits.gov: https://www.benefits.gov

---

**Document Version**: 2.0  
**Last Updated**: February 13, 2026  
**Status**: Hackathon Ready  
**Authors**: CivicAI Development Team
