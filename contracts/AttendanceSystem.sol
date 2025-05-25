// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract AttendanceSystem {
    address public admin;
    uint256 public attendanceCount;
    
    struct Teacher {
        string name;
        bool isActive;
    }
    
    struct AttendanceRecord {
        string student;
        string subject;
        bool present;
        uint256 timestamp;
        address teacher;
    }
    
    mapping(address => Teacher) public teachers;
    mapping(uint256 => AttendanceRecord) public attendanceRecords;
    
    event TeacherAdded(address indexed teacherAddress, string name);
    event AttendanceMarked(uint256 indexed id, string student, string subject, bool present);
    
    constructor() {
        admin = msg.sender;
        attendanceCount = 0;
    }
    
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can call this function");
        _;
    }
    
    modifier onlyTeacher() {
        require(teachers[msg.sender].isActive, "Only active teachers can call this function");
        _;
    }
    
    function addTeacher(address _teacher, string memory _name) public onlyAdmin {
        require(_teacher != address(0), "Invalid teacher address");
        require(!teachers[_teacher].isActive, "Teacher already exists");
        
        teachers[_teacher] = Teacher({
            name: _name,
            isActive: true
        });
        
        emit TeacherAdded(_teacher, _name);
    }
    
    function markAttendance(string memory _student, string memory _subject, bool _present) 
        public 
        onlyTeacher 
        returns (uint256)
    {
        require(bytes(_student).length > 0, "Student name cannot be empty");
        require(bytes(_subject).length > 0, "Subject cannot be empty");
        
        uint256 id = attendanceCount;
        attendanceRecords[id] = AttendanceRecord({
            student: _student,
            subject: _subject,
            present: _present,
            timestamp: block.timestamp,
            teacher: msg.sender
        });
        
        emit AttendanceMarked(id, _student, _subject, _present);
        
        attendanceCount++;
        return id;
    }
    
    function getAttendance(uint256 _id) public view returns (
        string memory student,
        string memory subject,
        bool present,
        uint256 timestamp,
        address teacher
    ) {
        require(_id < attendanceCount, "Invalid attendance ID");
        AttendanceRecord memory record = attendanceRecords[_id];
        return (
            record.student,
            record.subject,
            record.present,
            record.timestamp,
            record.teacher
        );
    }
    
    function getTeacherCount() public view returns (uint256) {
        return attendanceCount;
    }
}