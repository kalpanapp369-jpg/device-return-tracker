const { GoogleGenerativeAI } = require('@google/generative-ai');

async function run() {
  try {
    const genAI = new GoogleGenerativeAI('AIzaSyAkQBy5LjCRBo0LqArxO5sq4cbhO0gWYE');
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent('Hello');
    console.log('Success:', result.response.text());
  } catch (err) {
    console.error('Error:', err.message);
  }
}
run();
