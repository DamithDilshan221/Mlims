const { signAccessToken } = require('./src/utils/jwt');
const token = signAccessToken({ user_id: 7, role_name: 'records_clerk', staff_id: null });
console.log(token);
