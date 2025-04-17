# main.py - COMPLETE VERSION

import os
import logging
from fastapi import FastAPI, HTTPException, Query, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient, GEOSPHERE
from pymongo.errors import ConnectionFailure, OperationFailure
from dotenv import load_dotenv
from pydantic import BaseModel, Field, field_validator
# Correct Pydantic V2 imports needed for schema customization
from pydantic_core import core_schema
from functools import wraps
#--------------------------------------------------------
from typing import List, Optional, Dict, Any, Literal # Import Literal
from bson import ObjectId # To handle MongoDB ObjectId
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta, timezone
from pydantic import EmailStr
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import uvicorn
import bcrypt # Note: bcrypt library itself might not be directly used if using passlib

# --- Basic Logging Setup ---
# Configure logging format and level
logging.basicConfig(
    level=logging.DEBUG, # <-- Set to DEBUG to see the new log messages
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# --- Configuration ---
load_dotenv() # Load environment variables from .env file
MONGO_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")  # Default to local if not set
DB_NAME = os.getenv("DB_NAME", "chetak")  # Default to lowercase, configurable
COLLECTION_NAME = os.getenv("COLLECTION_NAME", "hospitals")
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key")  # Change this in production
PORT = int(os.getenv("PORT", 8000))

# --- Security Configuration ---
SECRET_KEY = os.getenv("JWT_SECRET") # Load from .env
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 # Token validity period

if not MONGO_URI:
    logger.critical("FATAL ERROR: MONGO_URI environment variable not found. Set it in your .env file.")
    exit("MONGO_URI not set.")

if not SECRET_KEY:
    logger.critical("FATAL ERROR: JWT_SECRET environment variable not found. Set it in your .env file.")
    exit("JWT_SECRET not set.")

# --- FastAPI App Initialization ---
app = FastAPI(
    title="Hospital Management System",
    description="API for managing hospital data and emergency services",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# --- CORS Middleware Configuration ---
origins = [
    "http://localhost",         # Allow local development server (generic)
    "http://localhost:5500",    # Example for VS Code Live Server default
    "http://127.0.0.1:5500",    # Another local address for VS Code Live Server
    "http://127.0.0.1",         # Allow direct IP access if needed
    # Add other local ports if your frontend runs elsewhere (e.g., http://localhost:3000)
    "https://chouhan705.github.io", # Your GitHub Pages URL (Update username!)
    # Add Netlify/Vercel URLs if you deploy there later
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,      # Origins allowed to make requests
    allow_credentials=True,   # Allow cookies if needed in future
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],      # Allow all necessary methods
    allow_headers=["*"],        # Allow all standard headers
)

# --- Static Files and Templates Configuration ---
# Mount the static files directory
app.mount("/static", StaticFiles(directory="static"), name="static")
# Initialize Jinja2 templates
templates = Jinja2Templates(directory="templates") # Although not used in current endpoints

# --- Database Connection Management ---
client: Optional[MongoClient] = None
db = None
hospitals_collection = None

@app.on_event("startup")
async def startup_db_client():
    """Connects to MongoDB and ensures necessary indexes on application startup."""
    global client, db, hospitals_collection
    try:
        logger.info(f"Attempting to connect to MongoDB at {MONGO_URI.split('@')[-1]}...") # Mask credentials in log
        client = MongoClient(
            MONGO_URI,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=5000
        )
        client.admin.command('ping')
        logger.info("MongoDB connection successful (ping successful).")

        db = client[DB_NAME]
        hospitals_collection = db[COLLECTION_NAME]
        logger.info(f"Using database: '{DB_NAME}', collection: '{COLLECTION_NAME}'")

        # Ensure Geospatial Index exists
        try:
            index_name = "location_2dsphere"
            existing_indexes = hospitals_collection.list_indexes()
            index_exists = any(index["name"] == index_name for index in existing_indexes)

            if not index_exists:
                 logger.info(f"Creating 2dsphere index '{index_name}' on 'location' field...")
                 hospitals_collection.create_index([("location", GEOSPHERE)], name=index_name)
                 logger.info(f"Successfully created '{index_name}' index.")
            else:
                logger.info(f"Index '{index_name}' already exists on 'location'.")

        except OperationFailure as idx_err:
             logger.error(f"Failed to create or ensure index: {idx_err}", exc_info=True)

    except ConnectionFailure as conn_err:
        logger.critical(f"FATAL: Failed to connect to MongoDB: {conn_err}", exc_info=True)
        client = None; db = None; hospitals_collection = None
    except Exception as startup_err:
        logger.critical(f"FATAL: An unexpected error occurred during MongoDB startup: {startup_err}", exc_info=True)
        client = None; db = None; hospitals_collection = None


@app.on_event("shutdown")
async def shutdown_db_client():
    """Closes the MongoDB connection on application shutdown."""
    global client
    if client:
        client.close()
        logger.info("MongoDB connection closed.")

# --- Pydantic Models ---

class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls): yield cls.validate
    @classmethod
    def validate(cls, v: Any) -> ObjectId:
        if isinstance(v, ObjectId): return v
        if isinstance(v, str) and ObjectId.is_valid(v): return ObjectId(v)
        raise ValueError(f"Not a valid ObjectId: '{v}'")
    @classmethod
    def __get_pydantic_json_schema__(cls, core_schema_obj, handler):
        return {"type": "string","minLength": 24,"maxLength": 24,"pattern": r"^[0-9a-fA-F]{24}$"}
    @classmethod
    def __get_pydantic_core_schema__(cls, source, handler):
        return core_schema.no_info_plain_validator_function(cls.validate, serialization=core_schema.to_string_ser_schema())

class GeoLocation(BaseModel):
    type: Literal["Point"] = Field(default="Point")
    coordinates: List[float]
    @field_validator('coordinates')
    @classmethod
    def validate_coordinates(cls, v: List[float]) -> List[float]:
        if len(v) != 2: raise ValueError('[longitude, latitude] required')
        lon, lat = v
        if not (-180 <= lon <= 180): raise ValueError('Invalid longitude')
        if not (-90 <= lat <= 90): raise ValueError('Invalid latitude')
        return v

# Unified response model for hospital search results
class HospitalResponse(BaseModel):
    mongo_id: Optional[PyObjectId] = Field(alias="_id", default=None)
    hospital_id: Optional[int] = Field(alias="id", default=None)
    name: Optional[str] = None # Unified name (from 'name' or 'hospitalName')
    location: Optional[GeoLocation] = None
    hasICU: Optional[bool] = None
    specialists: List[str] = Field(default_factory=list)
    equipment: List[str] = Field(default_factory=list)
    distance_km: Optional[float] = None
    model_config = {
        "arbitrary_types_allowed": True, "json_encoders": { ObjectId: str },
        "populate_by_name": True,
        "json_schema_extra": { "example": { # Example for docs
                 "mongo_id": "60c72b9f9b1e8a5f1f1e8a5f", "hospital_id": 1,
                 "name": "City General Hospital",
                 "location": {"type": "Point", "coordinates": [72.8800, 19.0880]},
                 "hasICU": True, "specialists": ["cardiologist", "neurologist"],
                 "equipment": ["defibrillator", "ct_scanner"], "distance_km": 1.23
        }}
    }

# Authentication & User Models
class TokenData(BaseModel): email: Optional[str] = None
class HospitalUserBase(BaseModel):
    hospitalName: str = Field(...)
    email: EmailStr = Field(...)
    phone: str = Field(...)
    address: str = Field(...)
    licenseNumber: str = Field(...)
class HospitalUserCreate(HospitalUserBase): password: str = Field(..., min_length=8)
# Represents the full document structure in DB for registered hospitals
class HospitalUserInDBBase(HospitalUserBase):
    id: Optional[PyObjectId] = Field(alias="_id", default=None) # Use PyObjectId for internal validation
    hashed_password: str = Field(...)
    is_active: bool = Field(default=True)
    registration_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    # Capability fields, matching HospitalResponse where applicable
    location: Optional[GeoLocation] = None
    hasICU: Optional[bool] = None
    specialists: List[str] = Field(default_factory=list)
    equipment: List[str] = Field(default_factory=list)
    model_config = {"arbitrary_types_allowed": True,"json_encoders": {ObjectId: str},"populate_by_name": True}
# Represents data returned publicly via API (e.g., for profile GET)
class HospitalUserPublic(HospitalUserBase):
     id: str = Field(..., alias="_id") # Return ID as string
     is_active: bool
     registration_date: datetime
     location: Optional[GeoLocation] = None
     hasICU: Optional[bool] = None
     specialists: List[str] = Field(default_factory=list)
     equipment: List[str] = Field(default_factory=list)
     model_config = {"populate_by_name": True,"json_encoders": {ObjectId: str, datetime: lambda dt: dt.isoformat()}}
class Token(BaseModel): access_token: str; token_type: str
class CapabilitiesUpdate(BaseModel): # Model for PATCH request body
     hasICU: Optional[bool] = None
     specialists: Optional[List[str]] = Field(default=None)
     equipment: Optional[List[str]] = Field(default=None)

# --- Security Utilities & Dependencies ---
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
def verify_password(plain_password: str, hashed_password: str) -> bool: return pwd_context.verify(plain_password, hashed_password)
def get_password_hash(password: str) -> str: return pwd_context.hash(password)
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/hospital/token")

async def get_current_user(token: str = Depends(oauth2_scheme)) -> HospitalUserInDBBase:
    """Dependency to validate token and get user data from DB."""
    logger.debug("Attempting to validate JWT token...")
    credentials_exception = HTTPException(status_code=401, detail="Could not validate credentials", headers={"WWW-Authenticate": "Bearer"})
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None: logger.warning("Token validation failed: No email (sub) in payload"); raise credentials_exception
        logger.debug(f"Token payload validated for email: {email}")
    except JWTError as e: logger.warning(f"Token validation failed: JWTError - {str(e)}"); raise credentials_exception

    if hospitals_collection is None: logger.error("DB connection unavailable during token validation"); raise HTTPException(status_code=503, detail="DB unavailable.")

    logger.debug(f"Fetching hospital data from DB for email: {email}")
    user_dict = hospitals_collection.find_one({"email": email})
    if user_dict is None: logger.warning(f"Token validation failed: Hospital not found for email {email}"); raise credentials_exception

    try:
        logger.debug("Converting fetched DB dictionary to HospitalUserInDBBase model")
        # Ensure '_id' from dict is used if present for the model's 'id' field
        if '_id' in user_dict and 'id' not in user_dict:
             user_dict['id'] = user_dict['_id']
        user_model = HospitalUserInDBBase(**user_dict)
        logger.debug(f"Successfully created model for user {email}")
        return user_model
    except Exception as model_err:
        logger.error(f"Failed to create HospitalUserInDBBase model from DB data for {email}: {model_err}", exc_info=True)
        logger.error(f"Problematic user_dict: {user_dict}")
        raise HTTPException(status_code=500, detail="Internal error processing user data.")

async def get_current_active_user(current_user: HospitalUserInDBBase = Depends(get_current_user)) -> HospitalUserInDBBase:
    """Dependency to ensure the user fetched from token is active."""
    if not current_user.is_active: logger.warning(f"Auth attempt by inactive user: {current_user.email}"); raise HTTPException(status_code=400, detail="Inactive user")
    logger.debug(f"Active user confirmed: {current_user.email}")
    return current_user

# --- API Endpoints ---

@app.get("/", tags=["Root"], include_in_schema=False)
async def read_root():
    """Redirects root path to the main static frontend page."""
    return RedirectResponse(url="/static/index.html")

@app.get("/api/find-suitable",
         response_model=List[HospitalResponse],
         tags=["Hospitals"],
         summary="Find suitable hospitals near a location")
async def find_suitable_hospitals(
    lat: float = Query(..., description="User's latitude", example=19.0760, ge=-90, le=90),
    lon: float = Query(..., description="User's longitude", example=72.8777, ge=-180, le=180),
    needsICU: Optional[bool] = Query(None, description="Filter for ICU availability"),
    specialist: Optional[str] = Query(None, description="Filter by specialist needed"),
    equipment: Optional[List[str]] = Query(None, description="List of equipment needed")
):
    """Finds hospitals based on proximity and capability filters."""
    if hospitals_collection is None: raise HTTPException(status_code=503, detail="Database service unavailable.")
    logger.info(f"API Request: Find hospitals near (lat={lat}, lon={lon}) filters: ICU={needsICU}, Spec={specialist}, Equip={equipment}")

    # Build the $geoNear query filter
    match_filter: Dict[str, Any] = {}
    if needsICU is True: match_filter["hasICU"] = True
    if specialist: match_filter["specialists"] = {"$in": [specialist.lower(), "emergency", "general"]}
    if equipment and len(equipment) > 0: match_filter["equipment"] = {"$in": [e.lower() for e in equipment]}

    # Refined Aggregation Pipeline
    pipeline = [
        { '$geoNear': { # Stage 1: Find nearby matching documents
            'near': { 'type': 'Point', 'coordinates': [lon, lat] },
            'distanceField': 'distance_meters', 'maxDistance': 50000, # 50km radius
            'query': match_filter, 'spherical': True
        }},
        { '$addFields': { # Stage 2: Calculate km distance and create unified 'name'
            'distance_km': {'$round': [{'$divide': ['$distance_meters', 1000]}, 2]},
            'name': {'$ifNull': ['$name', '$hospitalName']} # Use 'name' or 'hospitalName'
        }},
        { '$project': { # Stage 3: Select ONLY fields needed for the response model
            '_id': 1, 'id': 1, 'name': 1, 'location': 1, 'hasICU': 1,
            'specialists': 1, 'equipment': 1, 'distance_km': 1
            # Excludes distance_meters, hospitalName, password, etc. implicitly
        }},
        { '$limit': 15 } # Stage 4: Limit results
    ]

    try:
        logger.debug(f"Executing MongoDB aggregation pipeline: {pipeline}")
        results_cursor = hospitals_collection.aggregate(pipeline)
        results = list(results_cursor) # Execute pipeline
        logger.info(f"Query successful. Found {len(results)} suitable hospitals.")

        # Validate results against the response model (handles ObjectId conversion)
        # FastAPI automatically serializes using the response_model definition
        # No manual loop needed unless you want stricter pre-validation/logging
        return results # Return the list of dictionaries

    except OperationFailure as op_err:
         logger.error(f"MongoDB operation error during aggregation: {op_err}", exc_info=True)
         raise HTTPException(status_code=500, detail=f"Database query error: {op_err.details.get('errmsg', 'Unknown DB error')}")
    except Exception as e:
        logger.error(f"Unexpected error during hospital search: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error during search.")

@app.post("/api/hospital/register", response_model=HospitalUserPublic, tags=["Authentication"], status_code=201)
async def register_hospital(hospital: HospitalUserCreate):
    """Register a new hospital user account."""
    logger.info("="*50 + "\nSTARTING HOSPITAL REGISTRATION PROCESS")
    logger.info(f"Request: Hospital={hospital.hospitalName}, Email={hospital.email}, License={hospital.licenseNumber}")
    if hospitals_collection is None: logger.error("DB unavailable during registration"); raise HTTPException(status_code=503, detail="DB unavailable")

    # Check for existing unique fields
    if hospitals_collection.find_one({"email": hospital.email}):
        logger.warning(f"Reg failed: Email {hospital.email} exists"); raise HTTPException(status_code=400, detail="Email already registered")
    if hospitals_collection.find_one({"licenseNumber": hospital.licenseNumber}):
        logger.warning(f"Reg failed: License {hospital.licenseNumber} exists"); raise HTTPException(status_code=400, detail="License number already registered")

    # Prepare document for insertion
    hashed_password = get_password_hash(hospital.password)
    hospital_dict = hospital.model_dump(exclude={"password"})
    hospital_dict.update({
        "hashed_password": hashed_password, "is_active": True,
        "registration_date": datetime.now(timezone.utc),
        "location": { "type": "Point", "coordinates": [0.0, 0.0] }, # Default location
        "hasICU": False, "specialists": [], "equipment": [] # Default capabilities
    })
    logger.debug(f"Prepared document for insertion: {list(hospital_dict.keys())}")

    try:
        # Insert into DB
        result = hospitals_collection.insert_one(hospital_dict)
        logger.info(f"Successfully inserted hospital with ID: {result.inserted_id}")

        # Fetch back the inserted document to return
        inserted_hospital_doc = hospitals_collection.find_one({"_id": result.inserted_id})
        if inserted_hospital_doc:
            logger.info("Successfully verified inserted hospital in DB")
            # Convert ObjectId to string for the response model
            inserted_hospital_doc['_id'] = str(inserted_hospital_doc['_id'])
            logger.info("="*50); return HospitalUserPublic(**inserted_hospital_doc)
        else:
            logger.error(f"Failed to fetch back doc after insertion (ID: {result.inserted_id})"); raise HTTPException(status_code=500, detail="Verification failed")

    except OperationFailure as op_err: # Handle DB errors during insert
         logger.error(f"DB operation error during insert: {op_err}", exc_info=True); logger.info("="*50)
         detail = f"DB error: {op_err.details.get('errmsg', 'Unknown')}"
         status = 400 if op_err.code == 11000 else 500 # Duplicate key = 400
         if status == 400: # Provide more specific duplicate key info
             kv = op_err.details.get('keyValue', {}); f = list(kv.keys())[0] if kv else 'field'; v = list(kv.values())[0] if kv else 'value'
             detail = f"The {f} '{v}' is already registered."
         raise HTTPException(status_code=status, detail=detail)
    except Exception as e: # Catch other errors (e.g., Pydantic validation on return)
        logger.error(f"Unexpected error registering: {e}", exc_info=True); logger.info("="*50)
        raise HTTPException(status_code=500, detail=f"Internal error: {e}")

@app.post("/api/hospital/token", response_model=Token, tags=["Authentication"])
async def login_hospital(form_data: OAuth2PasswordRequestForm = Depends()):
    """Authenticate hospital user and return JWT token."""
    logger.info(f"Login attempt for user: {form_data.username}")
    if hospitals_collection is None: logger.error("DB unavailable during login"); raise HTTPException(status_code=503, detail="DB unavailable")

    # Find user by email
    hospital_dict = hospitals_collection.find_one({"email": form_data.username})
    creds_exception = HTTPException(status_code=401, detail="Incorrect email or password", headers={"WWW-Authenticate": "Bearer"})

    if not hospital_dict: logger.warning(f"Login failed: Email '{form_data.username}' not found"); raise creds_exception
    if not verify_password(form_data.password, hospital_dict.get("hashed_password", "")): logger.warning(f"Login failed: Incorrect pwd for '{form_data.username}'"); raise creds_exception
    if not hospital_dict.get("is_active", True): logger.warning(f"Login failed: Account '{form_data.username}' inactive."); raise HTTPException(status_code=400, detail="Account inactive")

    # Create and return token
    access_token = create_access_token(data={"sub": hospital_dict["email"]})
    logger.info(f"Login successful for: {form_data.username}"); return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/hospital/profile", response_model=HospitalUserPublic, tags=["Hospital Profile"])
async def get_hospital_profile(current_user: HospitalUserInDBBase = Depends(get_current_active_user)):
    """Get the profile of the currently authenticated hospital."""
    logger.info(f"Fetching profile for: {current_user.hospitalName} ({current_user.email})")
    # Convert the UserInDB model (which might have ObjectId) to a dict
    # then create the Public response model (which expects string ID)
    user_dict = current_user.model_dump(by_alias=True) # Use by_alias to get '_id' key
    if '_id' in user_dict and isinstance(user_dict['_id'], ObjectId):
        user_dict['_id'] = str(user_dict['_id']) # Convert the ObjectId to string
    elif '_id' not in user_dict and current_user.id: # Safety fallback
        user_dict['_id'] = str(current_user.id)
    # Ensure all required fields for HospitalUserPublic are present before returning
    # (Pydantic should raise validation error if not)
    return HospitalUserPublic(**user_dict)

@app.patch("/api/hospital/profile", response_model=HospitalUserPublic, tags=["Hospital Profile"])
async def update_hospital_profile(
    updates: Dict[str, Any], # Raw dictionary for flexibility from frontend
    current_user: HospitalUserInDBBase = Depends(get_current_active_user)
):
    """Update profile fields (phone, address) of the logged-in hospital."""
    logger.info(f"Profile update request for: {current_user.email}")
    logger.debug(f"Received updates: {updates}")
    if hospitals_collection is None: logger.error("DB unavailable during profile update"); raise HTTPException(status_code=503, detail="DB unavailable")

    # Explicitly define allowed fields and filter input
    allowed = {"phone", "address"}
    update_data = {k: v for k, v in updates.items() if k in allowed and v is not None and v != ""} # Filter Nones and empty strings

    if not update_data:
        logger.warning("No valid profile fields provided to update"); raise HTTPException(status_code=400, detail="No valid fields to update")

    update_filter = {"_id": current_user.id} # Target document using ObjectId
    update_operation = {"$set": update_data}

    try:
        logger.debug(f"Attempting profile update with filter: {update_filter} (Type: {type(current_user.id)})"); logger.debug(f"Profile update op: {update_operation}")
        result = hospitals_collection.update_one(update_filter, update_operation)
        logger.debug(f"Profile update result: matched={result.matched_count}, modified={result.modified_count}")

        if result.matched_count == 0: logger.error(f"Profile update failed: ID {current_user.id} not found"); raise HTTPException(status_code=404, detail="Profile not found")

        logger.info("Profile updated/verified in DB. Fetching updated document.")
        # Fetch the full updated document to return
        updated_doc = hospitals_collection.find_one({"_id": current_user.id})
        if not updated_doc: logger.error(f"Failed to fetch updated profile ID {current_user.id}"); raise HTTPException(status_code=404, detail="Updated profile not retrieved")

        # Convert _id to string for the response model
        updated_doc['_id'] = str(updated_doc['_id'])
        return HospitalUserPublic(**updated_doc) # Return the updated public profile

    except OperationFailure as e: logger.error(f"DB error updating profile: {e}", exc_info=True); raise HTTPException(status_code=500, detail=f"DB error: {e.details.get('errmsg', 'Unknown')}")
    except Exception as e: logger.error(f"Error updating profile: {e}", exc_info=True); raise HTTPException(status_code=500, detail="Internal error updating profile")

@app.patch("/api/hospital/location", status_code=200, tags=["Hospital Profile"], response_model=Dict[str, str])
async def update_hospital_location(
    lat: float = Query(..., description="New Latitude", ge=-90, le=90),
    lon: float = Query(..., description="New Longitude", ge=-180, le=180),
    current_user: HospitalUserInDBBase = Depends(get_current_active_user)
):
    """Update the hospital's GeoJSON location using query parameters."""
    logger.info(f"Location update request for {current_user.email}: Lat={lat}, Lon={lon}")
    if hospitals_collection is None: raise HTTPException(status_code=503, detail="DB unavailable")

    new_location = {"type": "Point", "coordinates": [lon, lat]}
    update_filter = {"_id": current_user.id}
    update_operation = {"$set": {"location": new_location}}

    try:
        logger.debug(f"Attempting location update with filter: {update_filter} (Type: {type(current_user.id)})"); logger.debug(f"Location update op: {update_operation}")
        result = hospitals_collection.update_one(update_filter, update_operation)
        logger.debug(f"Location update result: matched={result.matched_count}, modified={result.modified_count}")

        if result.matched_count == 0: logger.error(f"Location update failed: ID {current_user.id} not found"); raise HTTPException(status_code=404, detail="Profile not found")
        if result.modified_count == 0 and result.matched_count > 0: logger.warning(f"Location update matched for {current_user.email} but didn't modify (data same?).")

        logger.info(f"Location updated successfully for {current_user.email}"); return {"message": "Location updated successfully"}
    except OperationFailure as e: logger.error(f"DB error updating location: {e}", exc_info=True); raise HTTPException(status_code=500, detail=f"DB error: {e.details.get('errmsg', 'Unknown')}")
    except Exception as e: logger.error(f"Error updating location: {e}", exc_info=True); raise HTTPException(status_code=500, detail="Error updating location")

@app.patch("/api/hospital/capabilities", status_code=200, tags=["Hospital Profile"], response_model=Dict[str, str])
async def update_hospital_capabilities(
    updates: CapabilitiesUpdate, # Use Pydantic model for request body validation
    current_user: HospitalUserInDBBase = Depends(get_current_active_user)
):
    """Update hospital capabilities (ICU, specialists, equipment) via request body."""
    logger.info(f"Capabilities update request for {current_user.email}: {updates.model_dump(exclude_unset=True)}")
    if hospitals_collection is None: raise HTTPException(status_code=503, detail="DB unavailable")

    # Prepare the $set object, only including fields explicitly provided in the payload
    update_data = {}
    payload = updates.model_dump(exclude_unset=True) # Use exclude_unset=True

    if "hasICU" in payload: data["hasICU"] = payload["hasICU"]
    if "specialists" in payload: # Check if key exists
        # Handle None case (clear list) vs list provided
        data["specialists"] = sorted(list(set(s.lower().strip() for s in payload["specialists"] if s.strip()))) if payload["specialists"] is not None else []
    if "equipment" in payload: # Check if key exists
        data["equipment"] = sorted(list(set(e.lower().strip() for e in payload["equipment"] if e.strip()))) if payload["equipment"] is not None else []

    if not data: # No valid fields were provided to update
        logger.warning(f"No valid capability data provided for {current_user.email}"); raise HTTPException(status_code=400, detail="No capability fields to update")

    update_filter = {"_id": current_user.id}
    update_operation = {"$set": data}

    try:
        logger.debug(f"Attempting capabilities update with filter: {update_filter} (Type: {type(current_user.id)})"); logger.debug(f"Capabilities update op: {update_operation}")
        result = hospitals_collection.update_one(update_filter, update_operation)
        logger.debug(f"Capabilities update result: matched={result.matched_count}, modified={result.modified_count}")

        if result.matched_count == 0: logger.error(f"Capabilities update failed: ID {current_user.id} not found"); raise HTTPException(status_code=404, detail="Profile not found")
        if result.modified_count == 0 and result.matched_count > 0: logger.warning(f"Capabilities update matched for {current_user.email} but didn't modify (data same?).")

        logger.info(f"Capabilities updated successfully for {current_user.email}"); return {"message": "Capabilities updated successfully"}
    except OperationFailure as e: logger.error(f"DB error updating capabilities: {e}", exc_info=True); raise HTTPException(status_code=500, detail=f"DB error: {e.details.get('errmsg', 'Unknown')}")
    except Exception as e: logger.error(f"Error updating capabilities: {e}", exc_info=True); raise HTTPException(status_code=500, detail="Error updating capabilities")

# --- Uvicorn Runner ---
if __name__ == "__main__":
    logger.info("Starting Uvicorn server locally...")
    if not SECRET_KEY:
         # Provide clear error message if JWT secret is missing
         print("\n" + "="*60 + f"\n FATAL ERROR: JWT_SECRET environment variable not set! \n" +
               " Please create a '.env' file in the 'backend' directory\n" +
               " and add a line like:\n JWT_SECRET=your_very_strong_random_secret_key_here\n" + "="*60 + "\n")
         # Consider exiting if secret is crucial for startup: exit("JWT_SECRET not set.")
    else:
        # Run the FastAPI app using Uvicorn
        uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=True)