export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.status(200).end();
    return;
  }

  // Allow all origins for POST request
  res.setHeader("Access-Control-Allow-Origin", "*");

  if (req.method !== 'POST') {
    return res.status(405).send("Method Not Allowed");
  }

  const userText = req.body.text;
  const API_KEY = process.env.GEMINI_API_KEY;

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `
You are a careful and fair moderator for a school confession website.

Only reply with one word: ALLOW or BLOCK.

BLOCK if the message:
- Contains real names, personal info, bullying, insults, or anything harmful.
- Reveals secrets or private info.

ALLOW if the message:
- Is anonymous, respectful, and safe to share.
- Expresses feelings without targeting anyone.

Evaluate this message ONLY: """${userText}"""
              `.trim(),
            }],
          }],
        }),
      }
    );

    const result = await geminiRes.json();
    console.log("Gemini raw response:", JSON.stringify(result, null, 2));
    const reply = result?.candidates?.[0]?.content?.parts?.[0]?.text?.trim().toUpperCase();

    if (reply === "ALLOW" || reply === "BLOCK") {
      return res.status(200).json({ verdict: reply });
    } else {
      return res.status(200).json({ verdict: "BLOCK" }); // fallback safe
    }
  } catch (err) {
    console.error("❌ Gemini error:", err);
    return res.status(500).json({ error: "Gemini moderation failed" });
  }
}
