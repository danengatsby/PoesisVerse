// Script pentru testarea ștergerii unui utilizator
const fetch = require('node-fetch');

async function deleteUser(email) {
  try {
    // Mai întâi autentifică-te ca Administrator
    const loginResponse = await fetch('http://localhost:5000/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: '123456'
      }),
      credentials: 'include'
    });

    if (!loginResponse.ok) {
      const error = await loginResponse.text();
      console.error('Eroare la autentificare:', error);
      return;
    }

    const cookie = loginResponse.headers.get('set-cookie');

    // Șterge utilizatorul cu emailul specificat
    const deleteResponse = await fetch('http://localhost:5000/api/admin/users', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookie
      },
      body: JSON.stringify({
        email: email
      }),
      credentials: 'include'
    });

    if (!deleteResponse.ok) {
      const error = await deleteResponse.text();
      console.error('Eroare la ștergerea utilizatorului:', error);
      return;
    }

    const result = await deleteResponse.json();
    console.log('Rezultat ștergere:', result);
  } catch (error) {
    console.error('Eroare generală:', error);
  }
}

// Rulează ștergerea pentru utilizatorul specificat
deleteUser('danen53@gmail.com');