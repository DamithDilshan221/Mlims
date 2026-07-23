async function testRouting() {
  const { signAccessToken } = require('./src/utils/jwt');
  
  const clerkToken = signAccessToken({ user_id: 7, role_name: 'records_clerk', staff_id: null });
  const doctorToken = signAccessToken({ user_id: 2, role_name: 'doctor', staff_id: 1 });

  const tryInsertPatient = async (role, token) => {
    const patientData = {
      fullName: 'Test ' + role,
      dob: '1990-01-01',
      gender: 'M',
      address: '123 Test St',
      nicPassport: Math.random().toString().slice(2, 11) + 'V'
    };
    try {
      const res = await fetch('http://localhost:3000/api/patients', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(patientData)
      });
      const data = await res.json();
      console.log(`[${role}] Status:`, res.status, 'Response:', data);
    } catch (e) {
      console.error(`[${role}] Error:`, e.message);
    }
  };

  await tryInsertPatient('records_clerk', clerkToken);
  await tryInsertPatient('doctor', doctorToken);
}

testRouting();
