const { signAccessToken } = require('./src/utils/jwt');

async function test() {
  const token = signAccessToken({ user_id: 3, role_name: 'doctor', staff_id: 1 });
  try {
    const FormData = require('form-data');
    const form = new FormData();
    form.append('case_id', 14);
    form.append('file_name', 'test.pdf');
    form.append('file', Buffer.from('hello'), { filename: 'test.pdf' });
    
    const res = await fetch('http://localhost:3000/api/digital-assets', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        ...form.getHeaders()
      },
      body: form
    });
    const status = res.status;
    const body = await res.text();
    console.log(`Status: ${status}`);
    console.log(`Body: ${body}`);
  } catch (err) {
    console.error(err);
  }
}

test();
