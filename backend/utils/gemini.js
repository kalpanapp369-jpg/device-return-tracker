require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

let genAI = null;
let model = null;

try {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
} catch (e) {
  console.error("Failed to initialize GoogleGenerativeAI:", e.message);
}

async function callGemini(prompt) {
  if (!model) {
    throw new Error('Gemini model is not initialized. Please check your API key.');
  }

  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (err) {
    throw new Error(`Gemini API error: ${err.message}`);
  }
}

// ── Feature 1: Generate professional damage summary ───────────────────────────
async function generateDamageSummary({ deviceName, condition, description, repairCost }) {
  const prompt = `
You are a device return specialist at One Point Solutions, an electronics rental company in India.

A customer has returned a device. Write a SHORT, professional damage assessment summary (3-4 sentences max) in clear English. Be factual and neutral — no blame.

Device: ${deviceName}
Condition: ${condition}
Staff notes: ${description || 'No additional notes'}
Repair cost: ₹${repairCost || 0}

Write ONLY the summary paragraph. No headings, no bullet points.
  `.trim();

  return callGemini(prompt);
}

// ── Feature 2: Suggest repair cost estimate ───────────────────────────────────
async function estimateRepairCost({ deviceName, condition, description, purchaseCost }) {
  const prompt = `
You are a device repair cost estimator for an electronics rental company in India.

Based on the damage described, suggest a realistic repair cost estimate in Indian Rupees (₹).

Device: ${deviceName}
Purchase cost: ₹${purchaseCost || 'Unknown'}
Condition: ${condition}
Damage description: ${description || 'No description'}

Respond ONLY with this JSON format (no markdown, no extra text):
{
  "min_estimate": 500,
  "max_estimate": 2000,
  "recommended": 1200,
  "reasoning": "One sentence explaining the estimate"
}
  `.trim();

  const text = await callGemini(prompt);
  try {
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch {
    return { min_estimate: 0, max_estimate: 0, recommended: 0, reasoning: text };
  }
}

// ── Feature 3: Draft customer settlement email ────────────────────────────────
async function draftSettlementEmail({ customerName, deviceName, condition, repairCost, depositAmount, refundAmount, status, notes }) {
  const prompt = `
You are writing a professional customer email for One Point Solutions, an electronics rental company in India.

Write a clear, polite, professional email to the customer about their device return settlement.

Customer: ${customerName}
Device: ${deviceName}
Condition on return: ${condition}
Repair cost: ₹${repairCost || 0}
Deposit paid: ₹${depositAmount || 0}
Refund amount: ₹${refundAmount || 0}
Settlement decision: ${status}
Notes: ${notes || 'None'}

Rules:
- Keep it under 150 words
- Be professional and empathetic
- Mention the refund amount clearly if applicable
- End with contact info placeholder: [Contact: support@onepointsolutions.com]
- Write ONLY the email body — no subject line, no JSON

  `.trim();

  return callGemini(prompt);
}

// ── Feature 4: AI chat assistant for return queries ───────────────────────────
async function chatAssistant({ message, context }) {
  const prompt = `
You are a helpful assistant for One Point Solutions, an electronics rental device return tracking system.

Context about the current return record:
${context ? JSON.stringify(context, null, 2) : 'No specific record context'}

User question: ${message}

Answer helpfully and concisely in 2-3 sentences. Focus only on device returns, damage assessment, deposits, and settlements. If asked something unrelated, politely redirect.
  `.trim();

  return callGemini(prompt);
}

module.exports = {
  generateDamageSummary,
  estimateRepairCost,
  draftSettlementEmail,
  chatAssistant
};