# load_data.py
import os
import logging
from pymongo import MongoClient, GEOSPHERE
from pymongo.errors import ConnectionFailure, OperationFailure
from dotenv import load_dotenv

# --- Logging Setup ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# --- Configuration ---
load_dotenv() # Load variables from .env file

MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("DB_NAME", "chetakDB") # Use default if not set
COLLECTION_NAME = "hospitals"

if not MONGO_URI:
    logger.critical("FATAL ERROR: MONGO_URI not found in environment variables. Check your .env file.")
    exit("MONGO_URI not set.")

# --- Hospital Data (Sample - 30 Hospitals: Mumbai & Panvel) ---
# Note: Capabilities are illustrative examples, not live data.
# Coordinates format: [Longitude, Latitude]
hospitals_data = [
    # --- Mumbai South ---
    {
        "id": 1, "name": "Breach Candy Hospital",
        "location": {"type": "Point", "coordinates": [72.8045, 18.9645]},
        "hasICU": True,
        "specialists": ["cardiologist", "neurologist", "oncologist", "general_surgeon", "obstetrician", "emergency"],
        "equipment": ["mri", "ct_scanner", "cardiac_monitor", "ventilator", "defibrillator", "ecg", "ultrasound", "x_ray"]
    },
    {
        "id": 2, "name": "Jaslok Hospital",
        "location": {"type": "Point", "coordinates": [72.8070, 18.9680]},
        "hasICU": True,
        "specialists": ["cardiologist", "neurologist", "orthopedic", "pulmonologist", "general_surgeon", "emergency", "pediatrician"],
        "equipment": ["mri", "ct_scanner", "ventilator", "dialysis_machine", "cardiac_monitor", "defibrillator", "x_ray", "ecg"]
    },
    {
        "id": 3, "name": "Sir H. N. Reliance Foundation Hospital",
        "location": {"type": "Point", "coordinates": [72.8185, 18.9550]},
        "hasICU": True,
        "specialists": ["cardiologist", "neurologist", "orthopedic", "oncologist", "emergency", "general_surgeon"],
        "equipment": ["mri", "ct_scanner", "pet_scanner", "ventilator", "cardiac_monitor", "defibrillator", "x_ray"]
    },
    {
        "id": 4, "name": "Wockhardt Hospitals, South Mumbai",
        "location": {"type": "Point", "coordinates": [72.8250, 18.9605]},
        "hasICU": True,
        "specialists": ["cardiologist", "neurologist", "orthopedic", "emergency", "general_surgeon"],
        "equipment": ["ct_scanner", "cardiac_monitor", "ventilator", "defibrillator", "x_ray", "ultrasound"]
    },
    # --- Mumbai Central / Parel ---
    {
        "id": 5, "name": "KEM Hospital (King Edward Memorial)",
        "location": {"type": "Point", "coordinates": [72.8390, 19.0000]}, # Approx location
        "hasICU": True,
        "specialists": ["general", "emergency", "cardiologist", "neurologist", "orthopedic", "pediatrician", "obstetrician", "general_surgeon", "trauma_surgeon"],
        "equipment": ["ct_scanner", "x_ray", "ultrasound", "ventilator", "defibrillator", "cardiac_monitor", "ecg"]
    },
    {
        "id": 6, "name": "Tata Memorial Hospital (Cancer)",
        "location": {"type": "Point", "coordinates": [72.8400, 19.0020]}, # Approx location
        "hasICU": True, # Specialized ICU likely
        "specialists": ["oncologist", "general_surgeon", "radiologist"], # Primarily cancer focused
        "equipment": ["ct_scanner", "mri", "pet_scanner", "radiotherapy", "x_ray", "ventilator"]
    },
    {
        "id": 7, "name": "Global Hospitals, Parel",
        "location": {"type": "Point", "coordinates": [72.8430, 19.0080]},
        "hasICU": True,
        "specialists": ["cardiologist", "neurologist", "gastroenterologist", "transplant_surgeon", "emergency"],
        "equipment": ["mri", "ct_scanner", "ventilator", "cardiac_monitor", "defibrillator", "endoscopy", "x_ray"]
    },
    {
        "id": 8, "name": "Bai Jerbai Wadia Hospital For Children",
        "location": {"type": "Point", "coordinates": [72.8410, 19.0035]}, # Approx location
        "hasICU": True, # Pediatric ICU (NICU/PICU)
        "specialists": ["pediatrician", "pediatric_surgeon", "neonatologist", "pediatric_cardiologist"],
        "equipment": ["pediatric_ventilator", "incubator", "x_ray", "ultrasound", "ecg"]
    },
     # --- Mumbai Suburbs (Bandra/Andheri/Vile Parle) ---
    {
        "id": 9, "name": "Lilavati Hospital & Research Centre",
        "location": {"type": "Point", "coordinates": [72.8330, 19.0570]},
        "hasICU": True,
        "specialists": ["cardiologist", "neurologist", "orthopedic", "general_surgeon", "emergency", "obstetrician"],
        "equipment": ["mri", "ct_scanner", "ventilator", "cardiac_monitor", "defibrillator", "x_ray", "ultrasound"]
    },
    {
        "id": 10, "name": "Nanavati Max Super Speciality Hospital",
        "location": {"type": "Point", "coordinates": [72.8430, 19.0980]},
        "hasICU": True,
        "specialists": ["cardiologist", "neurologist", "orthopedic", "oncologist", "general_surgeon", "emergency"],
        "equipment": ["mri", "ct_scanner", "pet_scanner", "ventilator", "cardiac_monitor", "defibrillator", "x_ray"]
    },
    {
        "id": 11, "name": "Holy Family Hospital, Bandra",
        "location": {"type": "Point", "coordinates": [72.8305, 19.0620]},
        "hasICU": True,
        "specialists": ["general", "emergency", "cardiologist", "obstetrician", "pediatrician", "orthopedic"],
        "equipment": ["ct_scanner", "x_ray", "ultrasound", "ventilator", "defibrillator", "cardiac_monitor"]
    },
    {
        "id": 12, "name": "Kokilaben Dhirubhai Ambani Hospital",
        "location": {"type": "Point", "coordinates": [72.8380, 19.1130]}, # Andheri West
        "hasICU": True,
        "specialists": ["cardiologist", "neurologist", "orthopedic", "oncologist", "general_surgeon", "emergency", "pediatrician"],
        "equipment": ["mri", "ct_scanner", "ventilator", "cardiac_monitor", "defibrillator", "x_ray", "robotics"]
    },
    {
        "id": 13, "name": "Cooper Hospital (RN Cooper Municipal)",
        "location": {"type": "Point", "coordinates": [72.8395, 19.1050]}, # Vile Parle
        "hasICU": True,
        "specialists": ["general", "emergency", "orthopedic", "general_surgeon", "obstetrician"],
        "equipment": ["ct_scanner", "x_ray", "ultrasound", "ventilator", "defibrillator", "cardiac_monitor"]
    },
     # --- Mumbai Suburbs (Further North - Goregaon/Malad/Borivali) ---
    {
        "id": 14, "name": "SRV Hospitals - Goregaon",
        "location": {"type": "Point", "coordinates": [72.8490, 19.1600]},
        "hasICU": True,
        "specialists": ["orthopedic", "neurologist", "cardiologist", "emergency", "general_surgeon"],
        "equipment": ["ct_scanner", "x_ray", "ventilator", "cardiac_monitor", "defibrillator", "ultrasound"]
    },
     {
        "id": 15, "name": "Cloudnine Hospital, Malad",
        "location": {"type": "Point", "coordinates": [72.8410, 19.1850]},
        "hasICU": False, # Primarily Maternity/Pediatric non-critical? Check specific services. Assume NICU maybe, not general ICU.
        "specialists": ["obstetrician", "pediatrician", "neonatologist"],
        "equipment": ["fetal_monitor", "obstetric_ultrasound", "incubator", "ultrasound"]
    },
     {
        "id": 16, "name": "Apex Hospitals Borivali",
        "location": {"type": "Point", "coordinates": [72.8560, 19.2290]},
        "hasICU": True,
        "specialists": ["cardiologist", "general_surgeon", "orthopedic", "emergency", "general"],
        "equipment": ["ct_scanner", "x_ray", "ultrasound", "ventilator", "defibrillator", "cardiac_monitor"]
    },
     {
        "id": 17, "name": "Karuna Hospital, Borivali West",
        "location": {"type": "Point", "coordinates": [72.8480, 19.2250]},
        "hasICU": True,
        "specialists": ["general", "emergency", "obstetrician", "orthopedic"],
        "equipment": ["x_ray", "ultrasound", "ventilator", "defibrillator", "ecg"]
    },
    # --- Mumbai Suburbs (Eastern - Mulund/Thane side) ---
     {
        "id": 18, "name": "Fortis Hospital, Mulund",
        "location": {"type": "Point", "coordinates": [72.9500, 19.1750]},
        "hasICU": True,
        "specialists": ["cardiologist", "neurologist", "orthopedic", "oncologist", "emergency", "transplant_surgeon"],
        "equipment": ["mri", "ct_scanner", "ventilator", "cardiac_monitor", "defibrillator", "ecg", "x_ray"]
    },
     {
        "id": 19, "name": "Jupiter Hospital, Thane",
        "location": {"type": "Point", "coordinates": [72.9700, 19.1890]}, # Thane is adjacent
        "hasICU": True,
        "specialists": ["cardiologist", "neurologist", "orthopedic", "emergency", "general_surgeon", "pediatrician"],
        "equipment": ["mri", "ct_scanner", "ventilator", "cardiac_monitor", "defibrillator", "x_ray", "ultrasound"]
    },
     {
        "id": 20, "name": "Hiranandani Hospital, Powai",
        "location": {"type": "Point", "coordinates": [72.9150, 19.1180]},
        "hasICU": True,
        "specialists": ["general", "emergency", "cardiologist", "neurologist", "orthopedic", "obstetrician"],
        "equipment": ["mri", "ct_scanner", "ventilator", "cardiac_monitor", "defibrillator", "x_ray", "ultrasound"]
    },
    {
        "id": 21, "name": "Godrej Memorial Hospital, Vikhroli",
        "location": {"type": "Point", "coordinates": [72.9300, 19.0950]},
        "hasICU": True,
        "specialists": ["general", "emergency", "orthopedic", "obstetrician", "pediatrician"],
        "equipment": ["x_ray", "ultrasound", "ventilator", "defibrillator", "cardiac_monitor"]
    },
    {
        "id": 22, "name": "Criticzre Asia Multispeciality Hospital, Kurla",
        "location": {"type": "Point", "coordinates": [72.8850, 19.0700]}, # Approx location
        "hasICU": True,
        "specialists": ["general", "emergency", "cardiologist", "neurologist", "orthopedic"],
        "equipment": ["ct_scanner", "ventilator", "cardiac_monitor", "defibrillator", "x_ray", "ultrasound"]
    },

    # --- Panvel Area ---
    {
        "id": 23, "name": "Lifeline Hospital, Panvel",
        "location": {"type": "Point", "coordinates": [73.1080, 18.9950]},
        "hasICU": True,
        "specialists": ["general", "emergency", "orthopedic", "cardiologist", "general_surgeon", "obstetrician"],
        "equipment": ["ct_scanner", "x_ray", "ultrasound", "ventilator", "defibrillator", "cardiac_monitor"]
    },
    {
        "id": 24, "name": "Ashtvinayak Hospital, Panvel",
        "location": {"type": "Point", "coordinates": [73.1150, 18.9890]},
        "hasICU": True,
        "specialists": ["general", "emergency", "pediatrician", "obstetrician", "orthopedic"],
        "equipment": ["x_ray", "ultrasound", "ventilator", "defibrillator", "ecg", "pediatric_ventilator"]
    },
    {
        "id": 25, "name": "Gandhi Hospital, Panvel",
        "location": {"type": "Point", "coordinates": [73.1190, 18.9900]}, # Approx location
        "hasICU": True, # Assume general ICU
        "specialists": ["general", "emergency", "general_surgeon", "orthopedic"],
        "equipment": ["x_ray", "ultrasound", "ecg", "ventilator", "defibrillator"]
    },
    {
        "id": 26, "name": "Parulekar Hospital, Panvel",
        "location": {"type": "Point", "coordinates": [73.1100, 18.9910]}, # Approx location
        "hasICU": False, # Assuming smaller setup
        "specialists": ["general", "obstetrician"],
        "equipment": ["ultrasound", "ecg", "x_ray"]
    },
    {
        "id": 27, "name": "Sukham Hospital, Panvel",
        "location": {"type": "Point", "coordinates": [73.1165, 18.9960]}, # Approx location
        "hasICU": False, # Assuming smaller clinic/nursing home
        "specialists": ["general"],
        "equipment": ["ecg", "ultrasound"]
    },
    {
        "id": 28, "name": "Reliance Hospital Navi Mumbai, Koparkhairane",
        "location": {"type": "Point", "coordinates": [73.0050, 19.1250]}, # Navi Mumbai, near Panvel axis
        "hasICU": True,
        "specialists": ["cardiologist", "neurologist", "orthopedic", "general_surgeon", "emergency"],
        "equipment": ["mri", "ct_scanner", "ventilator", "cardiac_monitor", "defibrillator", "x_ray"]
    },
     {
        "id": 29, "name": "Apollo Hospitals, Navi Mumbai (Belapur)",
        "location": {"type": "Point", "coordinates": [73.0350, 19.0220]}, # Navi Mumbai, near Panvel axis
        "hasICU": True,
        "specialists": ["cardiologist", "neurologist", "orthopedic", "oncologist", "transplant_surgeon", "emergency"],
        "equipment": ["mri", "ct_scanner", "pet_scanner", "ventilator", "cardiac_monitor", "defibrillator", "x_ray"]
    },
     {
        "id": 30, "name": "MGM Hospital & Research Center, Kamothe",
        "location": {"type": "Point", "coordinates": [73.0750, 19.0200]}, # Kamothe, near Panvel
        "hasICU": True,
        "specialists": ["general", "emergency", "cardiologist", "neurologist", "orthopedic", "pediatrician", "obstetrician"],
        "equipment": ["ct_scanner", "mri", "ventilator", "defibrillator", "cardiac_monitor", "x_ray", "ultrasound"]
    },
]

# --- Database Operations ---
client: MongoClient | None = None # Type hint for client
try:
    logger.info("Connecting to MongoDB Atlas...")
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    # Ping to confirm connection
    client.admin.command('ping')
    logger.info("MongoDB connection successful.")

    db = client[DB_NAME]
    collection = db[COLLECTION_NAME]
    logger.info(f"Using database '{DB_NAME}', collection '{COLLECTION_NAME}'.")

    # Check if collection is empty before inserting
    if collection.count_documents({}) == 0:
        logger.info("Collection is empty. Inserting new hospital data...")
        result = collection.insert_many(hospitals_data)
        logger.info(f"Successfully inserted {len(result.inserted_ids)} hospital documents.")
    else:
         logger.warning("Collection already contains data. Skipping insertion.")
         logger.info("Consider manually clearing the collection in Atlas or via script if you want to reload.")

    # --- Ensure Geospatial Index ---
    # This is idempotent - safe to run even if index exists
    try:
        collection.create_index([("location", GEOSPHERE)])
        logger.info("Successfully created or ensured 2dsphere index on 'location' field.")
    except OperationFailure as idx_err:
        logger.error(f"Failed to create or ensure index: {idx_err}")
        # Decide if this is critical - maybe log and continue?

except ConnectionFailure as e:
    logger.critical(f"Could not connect to MongoDB: {e}")
except Exception as e:
    logger.error(f"An unexpected error occurred: {e}", exc_info=True)
finally:
    if client:
        client.close()
        logger.info("MongoDB connection closed.")