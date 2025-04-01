# main.py

import os
import logging
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient, GEOSPHERE
from pymongo.errors import ConnectionFailure, OperationFailure
from dotenv import load_dotenv
from pydantic import BaseModel, Field, field_validator
# Correct Pydantic V2 imports needed for schema customization
from pydantic_core import core_schema
#--------------------------------------------------------
from typing import List, Optional, Dict, Any, Literal # Import Literal
from bson import ObjectId # To handle MongoDB ObjectId

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
MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("DB_NAME", "chetakDB") # Default database name if not in .env
COLLECTION_NAME = "hospitals"

# --- Pre-startup Checks ---
if not MONGO_URI:
    logger.critical("FATAL ERROR: MONGO_URI environment variable not found. Set it in your .env file.")
    exit("MONGO_URI not set.")

# --- FastAPI App Initialization ---
app = FastAPI(
    title="Chetak API",
    description="API for finding suitable hospitals based on location and needs.",
    version="1.0.0",
    docs_url="/docs", # Standard docs URL
    redoc_url="/redoc" # Alternative docs URL
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
    allow_methods=["GET"],      # Only allow GET method for this simple API
    allow_headers=["*"],        # Allow all standard headers
)

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
        client = MongoClient(MONGO_URI,
                             serverSelectionTimeoutMS=5000) # Add timeout
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


# --- API Endpoints ---

@app.get("/", tags=["Root"])
async def read_root():
    """Provides a simple welcome message to verify the API is running."""
    return {"message": "Welcome to the Chetak API! Visit /docs for API documentation."}

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

# --- How to Run Locally ---
# 1. Make sure MongoDB (Atlas or Local) is running.
# 2. Ensure .env file has MONGO_URI and optionally DB_NAME.
# 3. Activate virtual environment (recommended): source venv/bin/activate (or .\venv\Scripts\activate on Windows)
# 4. Install dependencies: pip install fastapi uvicorn pymongo[srv] python-dotenv pydantic email-validator
# 5. Run Uvicorn: uvicorn main:app --reload --host 0.0.0.0 --port 8080
# 6. Access API docs at http://127.0.0.1:8080/docs
# 7. Access application at http://127.0.0.1:8080/