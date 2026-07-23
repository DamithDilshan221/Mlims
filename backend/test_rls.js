async function testDoctorRls() {
  const { signAccessToken } = require('./src/utils/jwt');
  const token = signAccessToken({ user_id: 2, role_name: 'doctor', staff_id: 1 });

  try {
    const res = await fetch('http://localhost:3000/api/clinical-examinations', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    console.log('Doctor clinical exams:', data);
  } catch (e) {
    console.error('Error:', e.message);
  }
}

testDoctorRls();
