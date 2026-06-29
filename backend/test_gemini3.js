async function run() {
  const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
  const key = 'AIzaSyAkQBy5LjCRBo0LqArxO5sq4cbhO0gWYE';
  const res = await fetch(`${GEMINI_API_URL}?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: 'Hello' }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
    })
  });
  
  if (!res.ok) {
    console.error('Error:', res.status, await res.text());
  } else {
    console.log('Success:', await res.json());
  }
}

run();
