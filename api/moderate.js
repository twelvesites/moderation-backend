export default async function handler(req, res) {
  // Handle CORS preflight (OPTIONS) requests
  if (req.method === 'OPTIONS') {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    return res.status(200).end();
  }

  // Allow all origins for POST request
  res.setHeader("Access-Control-Allow-Origin", "*");

  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const userText = req.body.text;
  const API_KEY = process.env.GROQ_API_KEY;

  if (!API_KEY) {
    return res.status(500).json({ error: "API key not configured" });
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: "gemma2-9b-it",
        max_tokens: 2,
        temperature: 0,
        messages: [
          {
            role: "system",
            content: `
You are an AI content moderator for an anonymous school confession platform.

Your moderation rules are EXTREMELY lenient:
- ✅ ALLOW gossip, ships, rumors, memes, jokes, sarcasm, roasting, casual insults, rants, slang, emojis, sexual topics, playful comments, fun drama.
- 🚫 BLOCK if:
   1. Serious, repeated, targeted personal attack or harassment toward a specific named individual, with clear intent to emotionally harm.
   2. Message includes student names (e.g., “Shaheen”, “Maryam”) or these exact phrases:
      • “6th grade”
      • “7th grade”
      • “8th grade”
   3. Doxxing / private info (phone, address, socials).

Other tips for the model:
- Ignore trigger words like “gay”, “shit”, “fuck” if used casually or jokingly.
- Casual insults, hyperbolic venting, and emoji-heavy drama are fine if not naming anyone.
- Treat over-the-top or silly “violent” jokes as harmless.

🧠 Respond with ONLY one word:
ALLOW
BLOCK

Now moderate this: """${userText}"""
`.trim()


          },
          { role: "user", content: userText },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Groq API error:", errorText);
      return res.status(500).json({ error: "Groq API error", details: errorText });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content?.trim().toUpperCase();

    if (reply === "ALLOW" || reply === "BLOCK") {
      return res.status(200).json({ verdict: reply });
    }

    // fallback to BLOCK if response unexpected
    return res.status(200).json({ verdict: "BLOCK" });

  } catch (err) {
    console.error("Handler error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
