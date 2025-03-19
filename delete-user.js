// Script pentru testarea ștergerii unui utilizator
import fetch from 'node-fetch';
import http from 'http';
import https from 'https';

const httpAgent = new http.Agent({ keepAlive: true });
const httpsAgent = new https.Agent({ keepAlive: true });

// Configurare pentru cookie-uri
const cookies = [];

// Create a special fetch instance that handles cookies
const fetchWithCookies = (url, options = {}) => {
  // Add cookies to request if we have any
  if (cookies.length > 0) {
    options.headers = options.headers || {};
    options.headers.Cookie = cookies.join('; ');
  }

  // Add correct agent based on protocol
  const agent = url.startsWith('https:') ? httpsAgent : httpAgent;
  options.agent = agent;

  return fetch(url, options)
    .then(response => {
      // Get and store cookies from response
      const setCookie = response.headers.raw()['set-cookie'];
      if (setCookie) {
        setCookie.forEach(cookie => {
          // Extract just the name=value part (ignore expires, path, etc)
          const mainPart = cookie.split(';')[0];
          
          // Check if cookie already exists and update it
          const cookieExists = cookies.findIndex(c => c.startsWith(mainPart.split('=')[0]));
          if (cookieExists >= 0) {
            cookies[cookieExists] = mainPart;
          } else {
            cookies.push(mainPart);
          }
        });
      }
      return response;
    });
};

async function deleteUser(email) {
  try {
    console.log(`Încercând ștergerea utilizatorului cu email: ${email}`);
    
    // Mai întâi autentifică-te ca Administrator
    console.log('Autentificare ca Administrator...');
    const loginResponse = await fetchWithCookies('http://localhost:5000/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: '123456'
      })
    });

    if (!loginResponse.ok) {
      const error = await loginResponse.text();
      console.error('Eroare la autentificare:', error);
      return;
    }

    console.log('Autentificare reușită. Cookies setate:', cookies);
    
    // Verifică dacă utilizatorul există
    console.log('Verificare dacă utilizatorul există...');
    const checkResponse = await fetchWithCookies('http://localhost:5000/api/users/profile', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!checkResponse.ok) {
      console.error('Eroare la verificarea profilului:', await checkResponse.text());
      return;
    }

    const profile = await checkResponse.json();
    console.log('Profil autentificat:', profile);

    // Șterge utilizatorul cu emailul specificat
    console.log(`Ștergere utilizator cu email: ${email}...`);
    const deleteResponse = await fetchWithCookies('http://localhost:5000/api/admin/users', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: email
      })
    });

    const responseText = await deleteResponse.text();
    
    if (!deleteResponse.ok) {
      console.error('Eroare la ștergerea utilizatorului:', responseText);
      return;
    }

    try {
      const result = JSON.parse(responseText);
      console.log('Rezultat ștergere:', result);
    } catch (e) {
      console.log('Răspuns text:', responseText);
    }
  } catch (error) {
    console.error('Eroare generală:', error);
  }
}

// Rulează ștergerea pentru utilizatorul specificat
deleteUser('danen53@gmail.com');