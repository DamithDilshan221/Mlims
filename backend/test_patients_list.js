const { signAccessToken } = require('./src/utils/jwt');

async function test() {
  const token = signAccessToken({ user_id: 1, role_name: 'admin', staff_id: null });
  try {
    const res = await fetch('http://localhost:3000/api/lookups/referral_sources', {
      headers: { 'Authorization': `Bearer ${token}` }
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
