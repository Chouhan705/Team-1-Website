# main.py

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
import bcrypt

# --- Basic Logging Setup ---
# Configure logging format and level
logging.basicConfig(
    level=logging.INFO,
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

# --- NEW: Security Configuration ---
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
# List of origins allowed to make requests to this API
# IMPORTANT: Replace placeholders with your actual frontend URLs!
origins = [
    "http://localhost",         # Allow local development server (generic)
    "http://localhost:5500",    # Example for VS Code Live Server default
    "http://127.0.0.1:5500",    # Another local address for VS Code Live Server
    # Add other local ports if your frontend runs elsewhere (e.g., http://localhost:3000)

    # --- DEPLOYMENT URLS ---
    "https://adityarohida.github.io", # Your GitHub Pages URL (Update username!)
    # Add Netlify/Vercel URLs if you deploy there later
    # e.g., "https://your-netlify-app-name.netlify.app"
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
templates = Jinja2Templates(directory="templates")

# --- Database Connection Management ---
client: Optional[MongoClient] = None
db = None
hospitals_collection = None

@app.on_event("startup")
async def startup_db_client():
    """Connects to MongoDB and ensures necessary indexes on application startup."""
    global client, db, hospitals_collection
    try:
        logger.info(f"Attempting to connect to MongoDB Atlas...")
        client = MongoClient(
            MONGO_URI,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=5000
        )
        # Ping the server to verify connection before proceeding
        client.admin.command('ping')
        logger.info("MongoDB connection successful (ping successful).")

        db = client[DB_NAME]
        hospitals_collection = db[COLLECTION_NAME]
        logger.info(f"Using database: '{DB_NAME}', collection: '{COLLECTION_NAME}'")

        # Ensure Geospatial Index exists (idempotent operation)
        try:
            hospitals_collection.create_index([("location", GEOSPHERE)])
            logger.info("Ensured 2dsphere index exists on 'location'.")
        except OperationFailure as idx_err:
             logger.error(f"Failed to create or ensure index: {idx_err}", exc_info=True)
             # Depending on the error, you might want to handle it differently
             # For now, we log it but allow the app to continue if connection was okay

    except ConnectionFailure as conn_err:
        logger.critical(f"FATAL: Failed to connect to MongoDB: {conn_err}", exc_info=True)
        # You might want the app to fail startup if DB is essential
        # raise RuntimeError("Database connection failed on startup") from conn_err
        client = None # Ensure client is None if connection failed
        db = None
        hospitals_collection = None

@app.on_event("shutdown")
async def shutdown_db_client():
    """Closes the MongoDB connection on application shutdown."""
    global client
    if client:
        client.close()
        logger.info("MongoDB connection closed.")

# --- Pydantic Models (Data Validation & Serialization) ---

# Helper class for MongoDB ObjectId serialization AND SCHEMA REPRESENTATION
# --- Pydantic Models (Data Validation & Serialization) ---

# Helper class for MongoDB ObjectId serialization AND SCHEMA REPRESENTATION
class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    # --- CORRECTED SIGNATURE ---
    @classmethod
    def validate(cls, v: Any) -> ObjectId: # Remove the _info argument
        # --- Keep the validation logic ---
        if isinstance(v, ObjectId):
            return v
        if isinstance(v, str) and ObjectId.is_valid(v):
            return ObjectId(v)
        raise ValueError(f"Not a valid ObjectId: '{v}'")
    # --- END CORRECTION ---

    @classmethod
    def __get_pydantic_json_schema__(
        cls, core_schema_obj: core_schema.CoreSchema, handler: callable
    ) -> dict[str, Any]:
        # --- Keep this method as it was ---
        return {
            "type": "string",
            "minLength": 24,
            "maxLength": 24,
            "pattern": r"^[0-9a-fA-F]{24}$",
            "examples": ["60c72b9f9b1e8a5f1f1e8a5f"],
        }

    @classmethod
    def __get_pydantic_core_schema__(
        cls, source: type[Any], handler: callable
    ) -> core_schema.CoreSchema:
        # --- Keep this method as it was ---
        # Use no_info_plain_validator_function as we removed _info from validate
        return core_schema.no_info_plain_validator_function(
            cls.validate, serialization=core_schema.to_string_ser_schema()
        )
# GeoJSON Point structure
class GeoLocation(BaseModel):
    # Use Literal to enforce the value "Point" - Pydantic V2 Style
    type: Literal["Point"] = Field(default="Point", description="GeoJSON type, must be 'Point'")
    coordinates: List[float] # Expected order: [longitude, latitude]

    # Use field_validator - Pydantic V2 Style
    @field_validator('coordinates')
    @classmethod # Keep classmethod decorator here
    def validate_coordinates(cls, v: List[float]) -> List[float]: # Add type hints
        if len(v) != 2:
            raise ValueError('Coordinates must be a list of [longitude, latitude]')
        lon, lat = v
        # Validate longitude
        if not (-180 <= lon <= 180):
            raise ValueError(f'Invalid longitude: {lon}. Must be between -180 and 180.')
        # Validate latitude
        if not (-90 <= lat <= 90):
            raise ValueError(f'Invalid latitude: {lat}. Must be between -90 and 90.')
        return v # Return the validated value

# API response model for a hospital
class HospitalResponse(BaseModel):
    mongo_id: Optional[PyObjectId] = Field(alias="_id", description="MongoDB document ID")
    hospital_id: int = Field(alias="id", description="Original numeric hospital ID from data source")
    name: str
    location: GeoLocation
    hasICU: bool
    specialists: List[str] = Field(default_factory=list)
    equipment: List[str] = Field(default_factory=list)
    distance_km: Optional[float] = Field(None, description="Calculated distance in kilometers")

    # Use model_config for Pydantic V2 instead of class Config
    model_config = {
        "arbitrary_types_allowed": True,
        "json_encoders": {
            ObjectId: str # Serialize ObjectId to string
        },
        # --- MODIFIED for Pydantic V2 ---
        "populate_by_name": True, # Renamed from allow_population_by_field_name
        # --- END OF MODIFICATION ---
         # Optional: Example to show in OpenAPI docs
        "json_schema_extra": {
            "example": {
                 "mongo_id": "60c72b9f9b1e8a5f1f1e8a5f",
                 "hospital_id": 1,
                 "name": "City General Hospital",
                 "location": {
                     "type": "Point",
                     "coordinates": [72.8800, 19.0880]
                 },
                 "hasICU": True,
                 "specialists": ["cardiologist", "neurologist"],
                 "equipment": ["defibrillator", "ct_scanner"],
                 "distance_km": 1.23
             }
         }
    }

# --- NEW: Authentication Models ---
class TokenData(BaseModel):
    email: Optional[str] = None

class HospitalUserBase(BaseModel):
    hospitalName: str = Field(...)
    email: EmailStr = Field(...)
    phone: str = Field(...) # Add more specific validation later if needed
    address: str = Field(...)
    licenseNumber: str = Field(...)

class HospitalUserCreate(HospitalUserBase):
    password: str = Field(..., min_length=8)

class HospitalUserInDBBase(HospitalUserBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    hashed_password: str = Field(...)
    is_active: bool = Field(default=True)
    registration_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    model_config = {
        "arbitrary_types_allowed": True,
        "json_encoders": {ObjectId: str},
        "populate_by_name": True,
    }

# Model for returning user data (excluding password)
class HospitalUserPublic(HospitalUserBase):
     id: str = Field(..., alias="_id") # Return ID as string
     is_active: bool
     registration_date: datetime

     model_config = {
         "populate_by_name": True,
         "json_encoders": {ObjectId: str}
     }

class Token(BaseModel):
    access_token: str
    token_type: str

# --- NEW: Security Utility Functions ---
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain password against a hashed password."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hashes a plain password."""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Creates a JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        # Default expiration time
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/hospital/token") # Login endpoint URL

async def get_current_user(token: str = Depends(oauth2_scheme)) -> HospitalUserInDBBase:
    """Dependency to get the current authenticated user from a token."""
    logger.info("Validating JWT token...")
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            logger.warning("Token validation failed: No email in payload")
            raise credentials_exception
        logger.info(f"Token validated for email: {email}")
        token_data = TokenData(email=email)
    except JWTError as e:
        logger.warning(f"Token validation failed: {str(e)}")
        raise credentials_exception
    
    if hospitals_collection is None:
        logger.error("Database connection not available during token validation")
        raise HTTPException(status_code=503, detail="Database service unavailable.")
         
    logger.info(f"Fetching hospital data for email: {email}")
    user = hospitals_collection.find_one({"email": token_data.email})
    if user is None:
        logger.warning(f"Token validation failed: Hospital not found for email {email}")
        raise credentials_exception
        
    logger.info("Converting hospital data to model...")
    user_model = HospitalUserInDBBase(**user)
    return user_model

async def get_current_active_user(current_user: HospitalUserInDBBase = Depends(get_current_user)) -> HospitalUserInDBBase:
    """Dependency to get the current *active* user."""
    # Example: Add check for active status if needed
    # if not current_user.is_active:
    #     raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

# --- API Endpoints ---

@app.get("/", tags=["Root"])
async def read_root():
    """Redirects to the main frontend page."""
    return RedirectResponse(url="/static/index.html")

@app.get("/api/find-suitable",
         response_model=List[HospitalResponse], # Specify the expected response structure
         tags=["Hospitals"],
         summary="Find suitable hospitals near a location",
         description="Returns a list of hospitals near the provided coordinates, filtered by optional criteria (ICU, specialist, equipment), sorted by distance.")
async def find_suitable_hospitals(
    lat: float = Query(..., description="User's latitude", example=19.0760, ge=-90, le=90),
    lon: float = Query(..., description="User's longitude", example=72.8777, ge=-180, le=180),
    needsICU: Optional[bool] = Query(None, description="Filter for hospitals with ICU availability (pass true to filter)"),
    specialist: Optional[str] = Query(None, description="Filter by required specialist (e.g., 'cardiologist'). Matches specialist OR 'emergency' OR 'general'."),
    # Use alias 'equipment' to allow multiple ?equipment=X&equipment=Y in URL
    equipment: Optional[List[str]] = Query(None, description="List of required equipment; hospital must have at least one (e.g., ?equipment=ct_scanner&equipment=mri)")
):
    """
    Finds hospitals based on proximity and capability filters.
    - Requires **latitude** and **longitude**.
    - Optional filters: **needsICU**, **specialist**, **equipment**.
    - Returns hospitals sorted by distance (nearest first).
    """
    if hospitals_collection is None or client is None:
         logger.error("Database connection not available for request.")
         raise HTTPException(status_code=503, detail="Database service unavailable. Please try again later.")

    logger.info(f"API Request: Find hospitals near (lat={lat}, lon={lon}) with filters: ICU={needsICU}, Spec={specialist}, Equip={equipment}")

    # --- Build the MongoDB Filter for $geoNear's query ---
    match_filter: Dict[str, Any] = {}
    if needsICU is True: # Explicitly check for True
        match_filter["hasICU"] = True
        logger.debug("Applying filter: hasICU = True")
    if specialist:
        # Hospital must have the specific specialist OR 'emergency' OR 'general'
        specialist_filter = {"$in": [specialist.lower(), "emergency", "general"]} # Convert input specialist to lowercase
        match_filter["specialists"] = specialist_filter
        logger.debug(f"Applying filter: specialists in {specialist_filter['$in']}")
    if equipment and len(equipment) > 0:
        # Hospital must have at least one of the listed equipment (convert input to lowercase)
        equipment_filter = {"$in": [e.lower() for e in equipment]}
        match_filter["equipment"] = equipment_filter
        logger.debug(f"Applying filter: equipment in {equipment_filter['$in']}")

    # --- Build the Aggregation Pipeline using $geoNear ---
    # $geoNear MUST be the first stage when used
    pipeline = [
        {
            '$geoNear': {
                'near': {
                    'type': 'Point',
                    'coordinates': [lon, lat]  # GeoJSON order: [longitude, latitude]
                },
                # Output field name for the calculated distance (in meters by default)
                'distanceField': 'distance_meters',
                 # Optional: Limit search radius (e.g., 50km = 50000 meters) - adjust as needed
                'maxDistance': 50000,
                'query': match_filter,           # Apply capability filters here
                'spherical': True                # Use spherical geometry for accuracy
            }
        },
        {
            # Add distance in kilometers, rounded to 2 decimal places
            '$addFields': {
                'distance_km': {'$round': [{'$divide': ['$distance_meters', 1000]}, 2]}
            }
        },
        {
             # Limit the number of results returned
            '$limit': 15
        },
        {   # Ensure output matches the response model structure (optional but good practice)
           '$project': {
               '_id': 1,
               'id': 1, # Original numeric ID
               'name': 1,
               'location': 1,
               'hasICU': 1,
               'specialists': 1,
               'equipment': 1,
               'distance_km': 1
           }
        }
    ]

    try:
        logger.debug(f"Executing MongoDB aggregation pipeline: {pipeline}")
        # Execute the aggregation pipeline
        results_cursor = hospitals_collection.aggregate(pipeline)
        # Convert cursor to list - this reads all results into memory
        results = list(results_cursor)
        logger.info(f"Query successful. Found {len(results)} suitable hospitals.")

        # FastAPI will automatically validate the list 'results' against List[HospitalResponse]
        # because it's specified in `response_model`. If validation fails, FastAPI returns an error.
        return results

    except OperationFailure as op_err:
         logger.error(f"MongoDB operation error during aggregation: {op_err}", exc_info=True)
         # Provide more specific details if available
         error_detail = op_err.details.get('errmsg', 'Unknown database operation error')
         raise HTTPException(status_code=500, detail=f"Database query error: {error_detail}")
    except Exception as e:
        logger.error(f"An unexpected error occurred during hospital search: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An internal server error occurred while searching for hospitals.")

@app.post("/api/hospital/register", response_model=HospitalUserPublic, tags=["Authentication"])
async def register_hospital(hospital: HospitalUserCreate):
    """Register a new hospital."""
    logger.info("="*50)
    logger.info("STARTING HOSPITAL REGISTRATION PROCESS")
    logger.info(f"Received registration request for hospital: {hospital.hospitalName}")
    logger.info(f"Email: {hospital.email}")
    logger.info(f"License Number: {hospital.licenseNumber}")
    
    if hospitals_collection is None:
        logger.error("❌ Database connection not available during registration")
        raise HTTPException(status_code=503, detail="Database service unavailable")

    # Check if email already exists
    logger.info("Checking for existing email...")
    existing_hospital = hospitals_collection.find_one({"email": hospital.email})
    if existing_hospital:
        logger.warning(f"❌ Registration failed: Email {hospital.email} already registered")
        raise HTTPException(status_code=400, detail="Email already registered")
    logger.info("✅ Email check passed - no existing email found")
    
    # Check if license number already exists
    logger.info("Checking for existing license number...")
    existing_license = hospitals_collection.find_one({"licenseNumber": hospital.licenseNumber})
    if existing_license:
        logger.warning(f"❌ Registration failed: License number {hospital.licenseNumber} already registered")
        raise HTTPException(status_code=400, detail="License number already registered")
    logger.info("✅ License number check passed - no existing license found")

    logger.info("Creating new hospital document...")
    # Create hospital document
    hospital_dict = hospital.model_dump(exclude={"password"})
    logger.info("✅ Successfully created hospital dictionary")
    
    # Hash the password
    logger.info("Hashing password...")
    hashed_password = get_password_hash(hospital.password)
    logger.info("✅ Password hashed successfully")

    # Prepare the complete document
    hospital_dict.update({
        "hashed_password": hashed_password,
        "is_active": True,
        "registration_date": datetime.now(timezone.utc),
        "location": {
            "type": "Point",
            "coordinates": [0, 0]  # Default coordinates, to be updated later
        },
        "hasICU": False,  # Default values
        "specialists": [],
        "equipment": []
    })
    logger.info("✅ Document prepared with all required fields")

    try:
        logger.info("Attempting to insert hospital into database...")
        result = hospitals_collection.insert_one(hospital_dict)
        logger.info(f"✅ Successfully inserted hospital with ID: {result.inserted_id}")
        
        # Fetch the inserted document to verify
        inserted_hospital = hospitals_collection.find_one({"_id": result.inserted_id})
        if inserted_hospital:
            logger.info("✅ Successfully verified hospital in database")
            logger.info("="*50)
            return HospitalUserPublic(**inserted_hospital)
        else:
            logger.error("❌ Failed to verify hospital in database after insertion")
            raise HTTPException(status_code=500, detail="Error verifying hospital registration")
    except Exception as e:
        logger.error(f"❌ Error registering hospital: {str(e)}", exc_info=True)
        logger.error("Registration failed with error details:", exc_info=True)
        logger.info("="*50)
        raise HTTPException(status_code=500, detail="Error registering hospital")

@app.post("/api/hospital/token", response_model=Token, tags=["Authentication"])
async def login_hospital(form_data: OAuth2PasswordRequestForm = Depends()):
    """Login endpoint for hospitals to get JWT token."""
    logger.info(f"Login attempt for email: {form_data.username}")
    
    if hospitals_collection is None:
        logger.error("Database connection not available during login")
        raise HTTPException(status_code=503, detail="Database service unavailable")

    hospital = hospitals_collection.find_one({"email": form_data.username})
    if not hospital:
        logger.warning(f"Login failed: Email {form_data.username} not found")
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    logger.info("Verifying password...")
    if not verify_password(form_data.password, hospital["hashed_password"]):
        logger.warning(f"Login failed: Incorrect password for email {form_data.username}")
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    logger.info("Creating access token...")
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": hospital["email"]},
        expires_delta=access_token_expires
    )
    logger.info(f"Login successful for email: {form_data.username}")
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/hospital/profile", response_model=HospitalUserPublic, tags=["Hospital Profile"])
async def get_hospital_profile(current_user: HospitalUserInDBBase = Depends(get_current_active_user)):
    """Get the profile of the currently logged-in hospital."""
    logger.info(f"Fetching profile for hospital: {current_user.hospitalName} ({current_user.email})")
    return current_user

@app.patch("/api/hospital/profile", response_model=HospitalUserPublic, tags=["Hospital Profile"])
async def update_hospital_profile(
    updates: Dict[str, Any],
    current_user: HospitalUserInDBBase = Depends(get_current_active_user)
):
    """Update the profile of the currently logged-in hospital."""
    logger.info(f"Profile update request for hospital: {current_user.hospitalName}")
    
    if hospitals_collection is None:
        logger.error("Database connection not available during profile update")
        raise HTTPException(status_code=503, detail="Database service unavailable")

    # Don't allow updating certain fields
    forbidden_updates = {"_id", "email", "hashed_password", "is_active", "registration_date"}
    updates = {k: v for k, v in updates.items() if k not in forbidden_updates}

    if not updates:
        logger.warning("No valid update fields provided")
        raise HTTPException(status_code=400, detail="No valid update fields provided")

    try:
        logger.info(f"Updating profile with fields: {list(updates.keys())}")
        result = hospitals_collection.update_one(
            {"_id": current_user.id},
            {"$set": updates}
        )
        if result.modified_count == 0:
            logger.warning("Profile update failed: Hospital not found")
            raise HTTPException(status_code=404, detail="Hospital not found")
        
        logger.info("Successfully updated hospital profile")
        updated_hospital = hospitals_collection.find_one({"_id": current_user.id})
        return HospitalUserPublic(**updated_hospital)
    except Exception as e:
        logger.error(f"Error updating hospital profile: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error updating profile")

@app.patch("/api/hospital/location", tags=["Hospital Profile"])
async def update_hospital_location(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
    current_user: HospitalUserInDBBase = Depends(get_current_active_user)
):
    """Update the hospital's location."""
    if hospitals_collection is None:
        raise HTTPException(status_code=503, detail="Database service unavailable")

    try:
        result = hospitals_collection.update_one(
            {"_id": current_user.id},
            {
                "$set": {
                    "location": {
                        "type": "Point",
                        "coordinates": [lon, lat]
                    }
                }
            }
        )
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Hospital not found")
        return {"message": "Location updated successfully"}
    except Exception as e:
        logger.error(f"Error updating hospital location: {e}")
        raise HTTPException(status_code=500, detail="Error updating location")

@app.patch("/api/hospital/capabilities", tags=["Hospital Profile"])
async def update_hospital_capabilities(
    hasICU: Optional[bool] = None,
    specialists: Optional[List[str]] = None,
    equipment: Optional[List[str]] = None,
    current_user: HospitalUserInDBBase = Depends(get_current_active_user)
):
    """Update the hospital's capabilities (ICU, specialists, equipment)."""
    if hospitals_collection is None:
        raise HTTPException(status_code=503, detail="Database service unavailable")

    updates = {}
    if hasICU is not None:
        updates["hasICU"] = hasICU
    if specialists is not None:
        updates["specialists"] = [s.lower() for s in specialists]
    if equipment is not None:
        updates["equipment"] = [e.lower() for e in equipment]

    if not updates:
        raise HTTPException(status_code=400, detail="No update fields provided")

    try:
        result = hospitals_collection.update_one(
            {"_id": current_user.id},
            {"$set": updates}
        )
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Hospital not found")
        return {"message": "Capabilities updated successfully"}
    except Exception as e:
        logger.error(f"Error updating hospital capabilities: {e}")
        raise HTTPException(status_code=500, detail="Error updating capabilities")

# --- Add Uvicorn runner for local development ---
if __name__ == "__main__":
    logger.info("Starting Uvicorn server locally...")
    # Make sure JWT_SECRET is loaded before this point
    if not SECRET_KEY:
         print("ERROR: JWT_SECRET not set in environment. Cannot start server.")
    else:
        # Use port 8000 to avoid conflict with potential frontend port
        uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=True) 

# --- How to Run Locally ---
# 1. Make sure MongoDB (Atlas or Local) is running.
# 2. Ensure .env file has MONGO_URI and optionally DB_NAME.
# 3. Activate virtual environment (recommended): source venv/bin/activate (or .\venv\Scripts\activate on Windows)
# 4. Install dependencies: pip install fastapi uvicorn pymongo[srv] python-dotenv pydantic email-validator
# 5. Run Uvicorn: uvicorn main:app --reload --host 0.0.0.0 --port 8000
# 6. Access API docs at http://127.0.0.1:8000/api/docs
# 7. Access application at http://127.0.0.1:8000/