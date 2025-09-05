from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Dict, Any
import os
import logging
import jwt
import asyncio
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
import uuid

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Security setup
SECRET_KEY = os.environ.get('SECRET_KEY', 'your-secret-key-here-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(title="نظام المحاسبة المتكامل", description="النظام المحاسبي الشامل")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# User Roles
class UserRole:
    ADMIN = "admin"
    ACCOUNTANT = "accountant" 
    VIEWER = "viewer"
    DATA_ANALYST = "data_analyst"
    FINANCIAL_MANAGER = "financial_manager"
    AUDITOR = "auditor"

# Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    email: EmailStr
    full_name: str
    role: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_login: Optional[datetime] = None
    trial_expires_at: Optional[datetime] = None

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    full_name: str
    role: str = UserRole.VIEWER

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user_info: Dict[str, Any]

class Transaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str  # "income" or "expense"
    amount: float
    category: str
    description: str
    date: datetime
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TransactionCreate(BaseModel):
    type: str
    amount: float
    category: str
    description: str
    date: datetime

class ActivityLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    action: str
    details: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    ip_address: Optional[str] = None

# Helper functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
    
    user = await db.users.find_one({"username": username})
    if user is None:
        raise credentials_exception
    return User(**user)

async def log_activity(user_id: str, action: str, details: str, ip_address: str = None):
    log_entry = ActivityLog(
        user_id=user_id,
        action=action,
        details=details,
        ip_address=ip_address
    )
    await db.activity_logs.insert_one(log_entry.dict())

# Financial Reports endpoints
@api_router.get("/reports/profit-loss")
async def get_profit_loss_report(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Generate Profit & Loss report"""
    if current_user.role not in [UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.FINANCIAL_MANAGER, UserRole.AUDITOR, UserRole.VIEWER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ليس لديك صلاحية لعرض التقارير المالية"
        )
    
    # Set default date range if not provided
    if not start_date:
        start_date = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    if not end_date:
        end_date = datetime.now(timezone.utc).isoformat()
    
    # Query transactions within date range
    transactions = await db.transactions.find({
        "date": {
            "$gte": datetime.fromisoformat(start_date.replace('Z', '+00:00')),
            "$lte": datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        }
    }).to_list(1000)
    
    # Calculate totals by category
    income_by_category = {}
    expense_by_category = {}
    total_income = 0
    total_expenses = 0
    
    for transaction in transactions:
        category = transaction["category"]
        amount = transaction["amount"]
        
        if transaction["type"] == "income":
            total_income += amount
            income_by_category[category] = income_by_category.get(category, 0) + amount
        else:
            total_expenses += amount
            expense_by_category[category] = expense_by_category.get(category, 0) + amount
    
    net_profit = total_income - total_expenses
    profit_margin = (net_profit / total_income * 100) if total_income > 0 else 0
    
    return {
        "period": {"start_date": start_date, "end_date": end_date},
        "total_income": total_income,
        "total_expenses": total_expenses,
        "net_profit": net_profit,
        "profit_margin": profit_margin,
        "income_by_category": income_by_category,
        "expense_by_category": expense_by_category,
        "transaction_count": len(transactions)
    }

@api_router.get("/reports/balance-sheet")
async def get_balance_sheet_report(current_user: User = Depends(get_current_user)):
    """Generate Balance Sheet report"""
    if current_user.role not in [UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.FINANCIAL_MANAGER, UserRole.AUDITOR, UserRole.VIEWER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ليس لديك صلاحية لعرض التقارير المالية"
        )
    
    # Get all transactions
    transactions = await db.transactions.find().to_list(1000)
    
    total_income = 0
    total_expenses = 0
    assets = {}
    liabilities = {}
    
    for transaction in transactions:
        amount = transaction["amount"]
        category = transaction["category"]
        
        if transaction["type"] == "income":
            total_income += amount
            assets[category] = assets.get(category, 0) + amount
        else:
            total_expenses += amount
            liabilities[category] = liabilities.get(category, 0) + amount
    
    equity = total_income - total_expenses
    
    return {
        "date": datetime.now(timezone.utc).isoformat(),
        "assets": {
            "total": total_income,
            "by_category": assets
        },
        "liabilities": {
            "total": total_expenses,
            "by_category": liabilities
        },
        "equity": equity,
        "balance_check": (total_income == (total_expenses + equity))
    }

@api_router.get("/reports/cash-flow")
async def get_cash_flow_report(
    period: str = "monthly",  # daily, weekly, monthly, yearly
    current_user: User = Depends(get_current_user)
):
    """Generate Cash Flow report"""
    if current_user.role not in [UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.FINANCIAL_MANAGER, UserRole.AUDITOR, UserRole.VIEWER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ليس لديك صلاحية لعرض التقارير المالية"
        )
    
    # Get all transactions sorted by date
    transactions = await db.transactions.find().sort("date", 1).to_list(1000)
    
    cash_flow = []
    running_balance = 0
    current_period = None
    period_income = 0
    period_expenses = 0
    
    for transaction in transactions:
        date = transaction["date"]
        amount = transaction["amount"]
        
        # Determine period grouping
        if period == "daily":
            period_key = date.strftime("%Y-%m-%d")
        elif period == "weekly":
            period_key = date.strftime("%Y-W%U")
        elif period == "monthly":
            period_key = date.strftime("%Y-%m")
        else:  # yearly
            period_key = date.strftime("%Y")
        
        # Start new period if needed
        if current_period != period_key:
            # Save previous period if exists
            if current_period:
                net_flow = period_income - period_expenses
                running_balance += net_flow
                cash_flow.append({
                    "period": current_period,
                    "income": period_income,
                    "expenses": period_expenses,
                    "net_flow": net_flow,
                    "running_balance": running_balance
                })
            
            # Reset for new period
            current_period = period_key
            period_income = 0
            period_expenses = 0
        
        # Add to current period
        if transaction["type"] == "income":
            period_income += amount
        else:
            period_expenses += amount
    
    # Add final period
    if current_period:
        net_flow = period_income - period_expenses
        running_balance += net_flow
        cash_flow.append({
            "period": current_period,
            "income": period_income,
            "expenses": period_expenses,
            "net_flow": net_flow,
            "running_balance": running_balance
        })
    
    return {
        "period_type": period,
        "cash_flow": cash_flow,
        "final_balance": running_balance,
        "total_periods": len(cash_flow)
    }

@api_router.get("/reports/trends")
async def get_financial_trends(current_user: User = Depends(get_current_user)):
    """Generate financial trends analysis"""
    if current_user.role not in [UserRole.ADMIN, UserRole.DATA_ANALYST, UserRole.FINANCIAL_MANAGER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ليس لديك صلاحية لعرض تحليل الاتجاهات"
        )
    
    # Get transactions from last 12 months
    twelve_months_ago = datetime.now(timezone.utc) - timedelta(days=365)
    transactions = await db.transactions.find({
        "date": {"$gte": twelve_months_ago}
    }).sort("date", 1).to_list(1000)
    
    # Group by month
    monthly_data = {}
    category_trends = {}
    
    for transaction in transactions:
        month_key = transaction["date"].strftime("%Y-%m")
        category = transaction["category"]
        amount = transaction["amount"]
        t_type = transaction["type"]
        
        # Monthly totals
        if month_key not in monthly_data:
            monthly_data[month_key] = {"income": 0, "expenses": 0}
        
        if t_type == "income":
            monthly_data[month_key]["income"] += amount
        else:
            monthly_data[month_key]["expenses"] += amount
        
        # Category trends
        if category not in category_trends:
            category_trends[category] = {}
        if month_key not in category_trends[category]:
            category_trends[category][month_key] = 0
        category_trends[category][month_key] += amount
    
    # Calculate growth rates
    months = sorted(monthly_data.keys())
    growth_rates = []
    
    for i in range(1, len(months)):
        prev_month = months[i-1]
        curr_month = months[i]
        
        prev_total = monthly_data[prev_month]["income"] - monthly_data[prev_month]["expenses"]
        curr_total = monthly_data[curr_month]["income"] - monthly_data[curr_month]["expenses"]
        
        if prev_total != 0:
            growth_rate = ((curr_total - prev_total) / abs(prev_total)) * 100
        else:
            growth_rate = 100 if curr_total > 0 else -100
            
        growth_rates.append({
            "month": curr_month,
            "growth_rate": growth_rate,
            "net_profit": curr_total
        })
    
    return {
        "monthly_data": monthly_data,
        "category_trends": category_trends,
        "growth_rates": growth_rates,
        "analysis_period": f"{twelve_months_ago.strftime('%Y-%m-%d')} إلى {datetime.now(timezone.utc).strftime('%Y-%m-%d')}"
    }

# Export endpoints
@api_router.get("/export/transactions")
async def export_transactions(
    format: str = "json",  # json, csv
    current_user: User = Depends(get_current_user)
):
    """Export transactions data"""
    if current_user.role not in [UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.FINANCIAL_MANAGER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ليس لديك صلاحية لتصدير البيانات"
        )
    
    transactions = await db.transactions.find().to_list(1000)
    
    # Convert to export format
    export_data = []
    for transaction in transactions:
        export_data.append({
            "id": transaction["id"],
            "type": "إيراد" if transaction["type"] == "income" else "مصروف",
            "amount": transaction["amount"],
            "category": transaction["category"],
            "description": transaction["description"],
            "date": transaction["date"].strftime("%Y-%m-%d"),
            "created_at": transaction["created_at"].strftime("%Y-%m-%d %H:%M:%S")
        })
    
    if format == "csv":
        # Convert to CSV format (simplified)
        csv_lines = ["النوع,المبلغ,الفئة,الوصف,التاريخ,تاريخ الإنشاء"]
        for item in export_data:
            csv_lines.append(f"{item['type']},{item['amount']},{item['category']},\"{item['description']}\",{item['date']},{item['created_at']}")
        
        return {"format": "csv", "data": "\n".join(csv_lines), "count": len(export_data)}
    
    return {"format": "json", "data": export_data, "count": len(export_data)}

# System maintenance endpoints
@api_router.post("/maintenance/cleanup-expired-users")
async def manual_cleanup_expired_users(current_user: User = Depends(get_current_user)):
    """Manually trigger cleanup of expired users"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ليس لديك صلاحية لتنفيذ صيانة النظام"
        )
    
    current_time = datetime.now(timezone.utc)
    expired_users = await db.users.find({
        "trial_expires_at": {"$lt": current_time},
        "role": {"$ne": UserRole.ADMIN}
    }).to_list(1000)
    
    deleted_count = 0
    deleted_users = []
    
    for user in expired_users:
        await log_activity(current_user.id, "حذف يدوي لمستخدم منتهي الصلاحية", f"تم حذف المستخدم: {user['username']}")
        await db.users.delete_one({"id": user["id"]})
        deleted_users.append(user["username"])
        deleted_count += 1
    
    return {
        "deleted_count": deleted_count,
        "deleted_users": deleted_users,
        "cleanup_time": current_time.isoformat()
    }

# Backup endpoints
@api_router.get("/backup/database")
async def backup_database(current_user: User = Depends(get_current_user)):
    """Create database backup"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ليس لديك صلاحية لإنشاء نسخة احتياطية"
        )
    
    backup_data = {}
    
    # Backup users (without passwords)
    users = await db.users.find({}, {"password": 0}).to_list(1000)
    backup_data["users"] = users
    
    # Backup transactions
    transactions = await db.transactions.find().to_list(1000)
    backup_data["transactions"] = transactions
    
    # Backup activity logs
    logs = await db.activity_logs.find().to_list(1000)
    backup_data["activity_logs"] = logs
    
    # Add metadata
    backup_data["metadata"] = {
        "backup_date": datetime.now(timezone.utc).isoformat(),
        "backup_by": current_user.username,
        "total_users": len(users),
        "total_transactions": len(transactions),
        "total_logs": len(logs)
    }
    
    await log_activity(current_user.id, "إنشاء نسخة احتياطية", "تم إنشاء نسخة احتياطية من قاعدة البيانات")
    
    return backup_data

# Initialize super admin
@app.on_event("startup")
async def create_super_admin():
    super_admin = await db.users.find_one({"username": "Nasser7A321"})
    if not super_admin:
        hashed_password = get_password_hash("@Nasser7Ali321@")
        admin_user = User(
            username="Nasser7A321",
            email="admin@system.com",
            full_name="المدير الأعلى",
            role=UserRole.ADMIN,
            is_active=True
        )
        user_dict = admin_user.dict()
        user_dict["password"] = hashed_password
        await db.users.insert_one(user_dict)
        print("Super admin created successfully!")

# Authentication routes
@api_router.post("/auth/login", response_model=Token)
async def login(user_credentials: UserLogin):
    user = await db.users.find_one({"username": user_credentials.username})
    if not user or not verify_password(user_credentials.password, user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="اسم المستخدم أو كلمة المرور غير صحيحة",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["username"]}, expires_delta=access_token_expires
    )
    
    # Update last login
    await db.users.update_one(
        {"username": user_credentials.username},
        {"$set": {"last_login": datetime.now(timezone.utc)}}
    )
    
    # Log login activity
    await log_activity(user["id"], "تسجيل دخول", f"تم تسجيل الدخول بنجاح")
    
    user_info = {
        "id": user["id"],
        "username": user["username"],
        "full_name": user["full_name"],
        "email": user["email"],
        "role": user["role"]
    }
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_info": user_info
    }

@api_router.post("/auth/register", response_model=User)
async def register(user_data: UserCreate, current_user: User = Depends(get_current_user)):
    # Only admin can create new users
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ليس لديك صلاحية لإنشاء مستخدمين جدد"
        )
    
    # Check if user already exists
    existing_user = await db.users.find_one({"$or": [{"username": user_data.username}, {"email": user_data.email}]})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="المستخدم موجود بالفعل"
        )
    
    hashed_password = get_password_hash(user_data.password)
    new_user = User(**user_data.dict())
    user_dict = new_user.dict()
    user_dict["password"] = hashed_password
    
    # Set trial expiration (30 days for non-admin users)
    if user_data.role != UserRole.ADMIN:
        user_dict["trial_expires_at"] = datetime.now(timezone.utc) + timedelta(days=30)
    
    await db.users.insert_one(user_dict)
    
    # Log user creation
    await log_activity(current_user.id, "إنشاء مستخدم", f"تم إنشاء مستخدم جديد: {user_data.username}")
    
    return new_user

@api_router.get("/auth/me", response_model=User)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user

# Users management routes
@api_router.get("/users", response_model=List[User])
async def get_users(current_user: User = Depends(get_current_user)):
    if current_user.role not in [UserRole.ADMIN, UserRole.DATA_ANALYST]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ليس لديك صلاحية لعرض المستخدمين"
        )
    
    users = await db.users.find({}, {"password": 0}).to_list(1000)
    return [User(**user) for user in users]

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ليس لديك صلاحية لحذف المستخدمين"
        )
    
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="لا يمكنك حذف حسابك الخاص"
        )
    
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="المستخدم غير موجود"
        )
    
    await log_activity(current_user.id, "حذف مستخدم", f"تم حذف المستخدم: {user_id}")
    return {"message": "تم حذف المستخدم بنجاح"}

# Transactions routes
@api_router.post("/transactions", response_model=Transaction)
async def create_transaction(transaction_data: TransactionCreate, current_user: User = Depends(get_current_user)):
    if current_user.role not in [UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.FINANCIAL_MANAGER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ليس لديك صلاحية لإضافة المعاملات المالية"
        )
    
    transaction = Transaction(
        **transaction_data.dict(),
        created_by=current_user.id
    )
    
    await db.transactions.insert_one(transaction.dict())
    await log_activity(current_user.id, "إضافة معاملة مالية", f"تم إضافة معاملة مالية بقيمة {transaction.amount}")
    
    return transaction

@api_router.get("/transactions", response_model=List[Transaction])
async def get_transactions(current_user: User = Depends(get_current_user)):
    transactions = await db.transactions.find().to_list(1000)
    return [Transaction(**transaction) for transaction in transactions]

@api_router.get("/transactions/{transaction_id}", response_model=Transaction)
async def get_transaction(transaction_id: str, current_user: User = Depends(get_current_user)):
    transaction = await db.transactions.find_one({"id": transaction_id})
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="المعاملة المالية غير موجودة"
        )
    return Transaction(**transaction)

@api_router.put("/transactions/{transaction_id}", response_model=Transaction)
async def update_transaction(transaction_id: str, transaction_data: TransactionCreate, current_user: User = Depends(get_current_user)):
    if current_user.role not in [UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.FINANCIAL_MANAGER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ليس لديك صلاحية لتعديل المعاملات المالية"
        )
    
    result = await db.transactions.update_one(
        {"id": transaction_id},
        {"$set": transaction_data.dict()}
    )
    
    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="المعاملة المالية غير موجودة"
        )
    
    updated_transaction = await db.transactions.find_one({"id": transaction_id})
    await log_activity(current_user.id, "تعديل معاملة مالية", f"تم تعديل المعاملة المالية: {transaction_id}")
    
    return Transaction(**updated_transaction)

@api_router.delete("/transactions/{transaction_id}")
async def delete_transaction(transaction_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role not in [UserRole.ADMIN, UserRole.ACCOUNTANT]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ليس لديك صلاحية لحذف المعاملات المالية"
        )
    
    result = await db.transactions.delete_one({"id": transaction_id})
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="المعاملة المالية غير موجودة"
        )
    
    await log_activity(current_user.id, "حذف معاملة مالية", f"تم حذف المعاملة المالية: {transaction_id}")
    return {"message": "تم حذف المعاملة المالية بنجاح"}

# Activity logs routes (for Data Analyst)
@api_router.get("/logs", response_model=List[ActivityLog])
async def get_activity_logs(current_user: User = Depends(get_current_user)):
    if current_user.role not in [UserRole.ADMIN, UserRole.DATA_ANALYST]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ليس لديك صلاحية لعرض سجل العمليات"
        )
    
    logs = await db.activity_logs.find().sort("timestamp", -1).to_list(1000)
    return [ActivityLog(**log) for log in logs]

# Dashboard stats
@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: User = Depends(get_current_user)):
    # Get total income and expenses
    total_income = 0
    total_expenses = 0
    
    transactions = await db.transactions.find().to_list(1000)
    for transaction in transactions:
        if transaction["type"] == "income":
            total_income += transaction["amount"]
        else:
            total_expenses += transaction["amount"]
    
    total_users = await db.users.count_documents({})
    total_transactions = len(transactions)
    
    return {
        "total_income": total_income,
        "total_expenses": total_expenses,
        "net_profit": total_income - total_expenses,
        "total_users": total_users,
        "total_transactions": total_transactions
    }

# Categories for transactions
TRANSACTION_CATEGORIES = [
    "مكتب", "تسويق", "راتب", "إيجار", "كهرباء", "إنترنت", "هاتف",
    "مواد خام", "معدات", "صيانة", "سفر", "وقود", "أخرى"
]

@api_router.get("/categories")
async def get_categories():
    return {"categories": TRANSACTION_CATEGORIES}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()