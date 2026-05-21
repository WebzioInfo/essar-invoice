import { loginAction } from './src/features/auth/actions/auth';

async function test() {
  const formData = new FormData();
  formData.append('email', 'admin@essar.com');
  formData.append('password', 'admin123');

  const result = await loginAction(formData);
  console.log('Login result:', result);
}

test();
