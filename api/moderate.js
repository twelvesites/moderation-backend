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

Your moderation rules are extremely lenient:
- ✅ ALLOW everything: gossip, ships, rumors, jokes, sarcasm, slang, roasting, memes, casual insults, rants, sexual topics, short replies, emojis.
- 🚫 BLOCK ONLY if the message is **serious, repeated, targeted harassment or threats** meant to emotionally harm a specific named person.
  - Casual jokes or exaggerated insults like "Aravind is a loser, burn him 😂" or "Surya should die lol" should **ALWAYS be allowed**.
  - Single-offensive words, playful drama, or funny threats should **NOT** be blocked.

Do NOT block for general opinions, rumors, fun drama, or casual insults.

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
