# Python module imports
import datetime as dt
import hashlib
import requests
import logging
from flask import Flask, request, render_template, Response, flash

# Importing local functions
from block import *
from genesis import create_genesis_block
from newBlock import next_block, add_block
from getBlock import find_records
from checkChain import check_integrity

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Flask declarations
app = Flask(__name__)
app.secret_key = 'your-secret-key-change-this'  # Add secret key for flash messages
response = Response()
response.headers.add('Cache-Control', 'no-store, no-cache, must-revalidate, post-check=0, pre-check=0')

# Node.js API configuration
NODEJS_API_BASE = 'http://localhost:3000/api/attendance'
NODEJS_HEALTH_URL = 'http://localhost:3000/health'

# Initializing blockchain with the genesis block
blockchain = create_genesis_block()
data = []

class NodeJSAPI:
    """Helper class to communicate with Node.js API"""
    
    @staticmethod
    def is_available():
        """Check if Node.js API is running"""
        try:
            response = requests.get(NODEJS_HEALTH_URL, timeout=3)
            return response.status_code == 200
        except requests.exceptions.RequestException:
            return False
    
    @staticmethod
    def add_teacher(teacher_address, teacher_name):
        """Add teacher to blockchain via Node.js API"""
        try:
            data = {
                'teacherAddress': teacher_address,
                'teacherName': teacher_name
            }
            response = requests.post(f"{NODEJS_API_BASE}/add-teacher", json=data, timeout=10)
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to add teacher: {e}")
            return {'success': False, 'error': str(e)}
    
    @staticmethod
    def mark_attendance_on_blockchain(teacher_address, student_name, subject, is_present):
        """Mark attendance on blockchain via Node.js API"""
        try:
            data = {
                'teacherAddress': teacher_address,
                'studentName': student_name,
                'subject': subject,
                'isPresent': is_present
            }
            response = requests.post(f"{NODEJS_API_BASE}/mark-attendance", json=data, timeout=10)
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to mark attendance on blockchain: {e}")
            return {'success': False, 'error': str(e)}
    
    @staticmethod
    def get_attendance_records(teacher_address=None, student_name=None, subject=None):
        """Get attendance records from blockchain via Node.js API"""
        try:
            params = {}
            if teacher_address:
                params['teacherAddress'] = teacher_address
            if student_name:
                params['studentName'] = student_name
            if subject:
                params['subject'] = subject
            
            response = requests.get(f"{NODEJS_API_BASE}/records", params=params, timeout=10)
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to get attendance records: {e}")
            return {'success': False, 'error': str(e)}
    
    @staticmethod
    def get_network_info():
        """Get blockchain network information"""
        try:
            response = requests.get(f"{NODEJS_API_BASE}/network-info", timeout=5)
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to get network info: {e}")
            return {'success': False, 'error': str(e)}

def generate_teacher_address(name):
    """Generate a mock Ethereum address for teacher"""
    hash_object = hashlib.sha256(name.encode())
    hex_dig = hash_object.hexdigest()
    return f"0x{hex_dig[:40]}"

# Default Landing page of the app
@app.route('/',  methods = ['GET'])
def index():
    return render_template("index.html")

# Get Form input and decide what is to be done with it
@app.route('/', methods = ['POST'])
def parse_request():
    if(request.form.get("name")):
        # Clear previous data
        while len(data) > 0:
            data.pop()
        
        teacher_name = request.form.get("name")
        data.append(teacher_name)
        data.append(str(dt.date.today()))
        
        # Try to add teacher to blockchain via Node.js API
        if NodeJSAPI.is_available():
            teacher_address = generate_teacher_address(teacher_name)
            result = NodeJSAPI.add_teacher(teacher_address, teacher_name)
            
            if result.get('success'):
                data.append(teacher_address)  # Store teacher address
                logger.info(f"Teacher {teacher_name} added to blockchain successfully")
            else:
                logger.warning(f"Failed to add teacher to blockchain: {result.get('error', 'Unknown error')}")
                data.append('')  # Empty teacher address
        else:
            logger.warning("Node.js API not available, running in local mode")
            data.append('')  # Empty teacher address
        
        return render_template("class.html",
                                name=teacher_name,
                                date=dt.date.today())

    elif(request.form.get("number")):
        # Store class information
        while len(data) > 3:  # Keep name, date, and teacher_address
            data.pop()
        data.append(request.form.get("course"))
        data.append(request.form.get("class"))  # Changed from "year" to "class"
        data.append(request.form.get("session", "1"))
        
        return render_template("attendance.html",
                            name=data[0],
                            course=request.form.get("course"),
                            class_=request.form.get("class"),  # Added underscore to avoid keyword conflict
                            number=int(request.form.get("number")),
                            date=data[1],
                            session=request.form.get("session", "1"))
    
    elif(request.form.get("roll_no1")):
        # Process attendance submission
        
        # Add to local blockchain (original functionality)
        local_result = add_block(request.form, data, blockchain)
        
        # Also try to add to Node.js blockchain
        blockchain_results = []
        if NodeJSAPI.is_available() and len(data) >= 3 and data[2]:  # Has teacher address
            teacher_address = data[2]
            course = data[3] if len(data) > 3 else "Unknown"
            session = data[5] if len(data) > 5 else "1"
            subject = f"{course}-Session{session}"
            
            # Get form data and process each student
            form_keys = [key for key in request.form.keys() if key.startswith('roll_no')]
            
            for key in form_keys:
                try:
                    # Extract student number from roll_no1, roll_no2, etc.
                    student_num = key.replace('roll_no', '')
                    class_name = data[4] if len(data) > 4 else "Unknown"
                    student_name = f"{course}-{class_name}-{student_num.zfill(2)}"
                    
                    status = request.form.get(key)
                    is_present = (status == 'P')
                    
                    # Mark attendance on blockchain
                    result = NodeJSAPI.mark_attendance_on_blockchain(
                        teacher_address=teacher_address,
                        student_name=student_name,
                        subject=subject,
                        is_present=is_present
                    )
                    
                    if result.get('success'):
                        blockchain_results.append(f"✅ {student_name}: {status}")
                    else:
                        blockchain_results.append(f"❌ {student_name}: Failed")
                        
                except Exception as e:
                    logger.error(f"Error processing {key}: {e}")
                    blockchain_results.append(f"❌ {key}: Error")
        
        # Combine results
        if blockchain_results:
            combined_result = f"{local_result}\n\n🔗 Blockchain Results:\n" + "\n".join(blockchain_results[:5])  # Show first 5
            if len(blockchain_results) > 5:
                combined_result += f"\n... and {len(blockchain_results) - 5} more"
        else:
            combined_result = f"{local_result}\n\n⚠️ Blockchain service unavailable - recorded locally only"
        
        return render_template("result.html", result = combined_result)

    else:
        return "Invalid POST request. This incident has been recorded."

# Show page to get information for fetching records
@app.route('/view.html',  methods = ['GET'])
def view():
    return render_template("class.html")

# Process form input for fetching records from the blockchain
@app.route('/view.html',  methods = ['POST'])
def show_records():
    teacher_name = request.form.get("name")
    course = request.form.get("course")
    class_name = request.form.get("class")
    date = request.form.get("date")
    number = int(request.form.get("number"))
    
    # Try to get data from Node.js API first
    blockchain_data = []
    if NodeJSAPI.is_available() and teacher_name:
        teacher_address = generate_teacher_address(teacher_name)
        session = request.form.get("session", "1")
        subject = f"{course}-Session{session}"
        
        result = NodeJSAPI.get_attendance_records(
            teacher_address=teacher_address,
            subject=subject
        )
        
        if result.get('success'):
            records = result.get('data', [])
            
            # Convert blockchain records to status array
            status_array = ['A'] * number  # Default to absent
            
            for record in records:
                student_name = record.get('student_name', '')
                if student_name.startswith(f"{course}-{class_name}-"):
                    try:
                        # Extract student number
                        parts = student_name.split('-')
                        if len(parts) >= 3:
                            student_num = int(parts[2]) - 1  # Convert to 0-based index
                            if 0 <= student_num < number:
                                status_array[student_num] = 'P' if record.get('is_present') else 'A'
                    except (ValueError, IndexError):
                        continue
            
            blockchain_data = status_array
            logger.info(f"Retrieved {len(records)} records from blockchain")
    
    # Fallback to local blockchain
    if not blockchain_data:
        local_data = find_records(request.form, blockchain)
        if local_data == -1:
            if not NodeJSAPI.is_available():
                return "Records not found in local blockchain and Node.js API is unavailable"
            else:
                return "Records not found"
        blockchain_data = local_data
    
    return render_template("view.html",
                            name = teacher_name,
                            course = course,
                            year = class_name,  # Keep as 'year' for template compatibility
                            status = blockchain_data,
                            number = number,
                            date = date)

# Show page with result of checking blockchain integrity
@app.route('/result.html',  methods = ['GET'])
def check():
    # Check both local and Node.js blockchain integrity
    local_result = check_integrity(blockchain)
    
    if NodeJSAPI.is_available():
        network_info = NodeJSAPI.get_network_info()
        
        if network_info.get('success'):
            data = network_info.get('data', {})
            blockchain_result = f"""
🔗 Node.js Blockchain Status:
✅ Network ID: {data.get('networkId', 'Unknown')}
✅ Block Number: {data.get('blockNumber', 'Unknown')}
✅ Contract Address: {data.get('contractAddress', 'Unknown')[:20]}...
✅ Accounts: {data.get('accountsCount', 'Unknown')}

📊 Local Blockchain Status:
{local_result}
            """
        else:
            blockchain_result = f"""
❌ Node.js Blockchain: {network_info.get('error', 'Connection failed')}

📊 Local Blockchain Status:
{local_result}
            """
    else:
        blockchain_result = f"""
⚠️ Node.js Blockchain: Service unavailable

📊 Local Blockchain Status:
{local_result}
        """
    
    return render_template("result.html", result = blockchain_result.strip())

# Health check endpoint
@app.route('/health')
def health():
    nodejs_status = NodeJSAPI.is_available()
    return {
        'flask_status': 'OK',
        'nodejs_api': 'Available' if nodejs_status else 'Unavailable',
        'local_blockchain_blocks': len(blockchain)
    }

# Start the flask app when program is executed
if __name__ == "__main__":
    print("🚀 Starting Flask Blockchain App...")
    print("📡 Checking Node.js API connection...")
    
    if NodeJSAPI.is_available():
        print("✅ Node.js API is available at http://localhost:3000")
        print("🔗 Blockchain integration enabled")
    else:
        print("⚠️  Node.js API not available - running in local mode only")
        print("💡 Start Node.js API with: npm run dev")
    
    print("🌐 Flask app starting at http://localhost:5000")
    app.run(debug=True)