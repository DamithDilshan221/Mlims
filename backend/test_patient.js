async function testPatientCreation() {
  try {
    const { signAccessToken } = require('./src/utils/jwt');
    const token = signAccessToken({ user_id: 7, role_name: 'records_clerk', staff_id: null });
    console.log('Token is:', token);

    const patientData = {
      fullName: 'Test Patient ' + Math.random(),
      gender: 'M',
      address: '123 Test St',
      nicPassport: Math.random().toString().slice(2, 11) + 'V'
    };

    console.log('Attempting to create patient...');
    const createRes = await fetch('http://localhost:3000/api/patients', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify(patientData)
    });

    const data = await createRes.json();
    if (!createRes.ok) {
      console.error('Status:', createRes.status);
      console.error('Data:', data);
    } else {
      console.log('Patient creation successful!', data);
    }
  } catch (err) {
    console.error('Error during patient creation:', err.message);
  }
}

testPatientCreation();
