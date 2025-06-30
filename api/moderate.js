export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const userText = req.body.text;
  const API_KEY = process.env.GROQ_API_KEY; // <-- must match your env var name

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
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: [
          {
            role: "system",
            content: `
You are a strict school confession moderator.

Only reply with ALLOW or BLOCK.

BLOCK messages that:
- Mention real names, initials, or identifying info.
- Contain bullying, harassment, or hate.
- Gossip, drama, or relationship exposure.
- Anything inappropriate or unsafe.

ALLOW messages that:
- Are anonymous, respectful, and safe to post.

Now moderate: """${userText}"""
            `.trim(),
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

    return res.status(200).json({ verdict: "BLOCK" }); // fallback

  } catch (err) {
    console.error("Handler error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
