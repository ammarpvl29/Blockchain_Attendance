async function submitAttendance(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    // Get form values
    const course = formData.get('course');
    const className = formData.get('class');
    const date = formData.get('date');
    const session = formData.get('session');
    const teacherAddress = localStorage.getItem('teacherAddress'); // Set this when teacher logs in
    
    // Get attendance data
    const students = [];
    const total = parseInt(formData.get('number'));
    
    for (let i = 1; i <= total; i++) {
        const status = formData.get(`roll_no${i}`);
        students.push({
            number: i,
            status: status || 'A'
        });
    }
    
    try {
        // Show loading
        M.toast({html: 'Processing attendance...', classes: 'blue'});
        
        // Submit to blockchain
        const response = await fetch('/api/attendance/mark-attendance', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                teacherAddress,
                course,
                class: className,
                date,
                session,
                students
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Show success message
            M.toast({html: `Successfully marked ${result.summary.successful} attendance records`, classes: 'green'});
            
            // Show results
            const resultHTML = `Block #${result.results.successful[0].blockNumber} has been added to the blockchain!<br>
                              ✅ Successful: ${result.summary.successful}<br>
                              ❌ Failed: ${result.summary.failed}`;
            
            document.getElementById('resultCard').innerHTML = resultHTML;
            document.getElementById('resultCard').style.display = 'block';
        } else {
            throw new Error(result.message);
        }
        
    } catch (error) {
        console.error('Error:', error);
        M.toast({html: `Error: ${error.message}`, classes: 'red'});
    }
}