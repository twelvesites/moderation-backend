export default async function handler(req, res) {
  // Allow all origins (CORS)
  if (req.method === 'OPTIONS') {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.status(200).end();
    return;
  }

  res.setHeader("Access-Control-Allow-Origin", "*");

  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const userText = req.body.text;
  const API_KEY = process.env.GROQ_API_KEY;

  try {
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-guard-3-8b-8k",
        messages: [
          {
            role: "system",
            content: `
You are a strict school confession moderator.

Only reply with ALLOW or BLOCK.

BLOCK messages that:
- Mention real names, initials, or identifying information.
- Contain bullying, harassment, or hate.
- Gossip, drama, or relationship exposure.
- Anything inappropriate or unsafe.

ALLOW messages that:
- Are anonymous, respectful, and safe to post.

Now moderate: """${userText}"""
            `.trim()
          },
          {
            role: "user",
            content: userText
          }
        ]
      })
    });

    const result = await groqRes.json();
    const reply = result.choices?.[0]?.message?.content?.trim().toUpperCase();

    return res.status(200).json({ verdict: (reply === "ALLOW" || reply === "BLOCK") ? reply : "BLOCK" });
  } catch (err) {
    console.error("❌ Groq error:", err);
    return res.status(500).json({ error: "Groq moderation failed" });
  }
}
