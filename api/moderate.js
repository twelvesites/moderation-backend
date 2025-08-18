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

Your moderation rules are as lenient as possible:
- ✅ ALLOW everything: gossip, ships, rumors, jokes, sarcasm, roasting, memes, casual insults, rants, short replies, slang, emojis, sexual topics, playful comments, and fun drama.
- 🚫 BLOCK ONLY if the message is a **serious, repeated, targeted personal attack or harassment** directed at a specific named individual, with clear intent to emotionally harm them.

Notes:
- Casual or playful insults, over-the-top jokes, and teasing using names or emojis should **always be allowed**.
- General comments, rants, and chaotic fun that are not intended to emotionally hurt a person should **never** be blocked.

🧠 Respond with ONLY one word:
- ALLOW
- BLOCK

Now moderate this:: """${userText}"""
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
