export default async function handler(req, res) {
  // CORS headers — allow any origin, POST & OPTIONS methods, and JSON content
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight OPTIONS request quickly
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).send("Method Not Allowed");
  }

  const userText = req.body.text;
  const apiKey = "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";

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer sk-or-v1-a5f54968b486fa17e328d32de7bc227e5bbfc02c6916b4061d14e5a3f1513",
        "Content-Type": "application/json",
        "HTTP-Referer": req.headers["referer"] || "https://twelve-ai.vercel.app",
        "X-Title": "Confession Moderation"
      },
      body: JSON.stringify({
        model: "openrouter/gpt-4-1-nano",
        messages: [
          {
            role: "system",
            content: `
You are a fair and thoughtful school confession moderator.

BLOCK messages that:
- Mention real names, initials, or anything that can identify someone.
- Include bullying, harassment, hate speech, or threats.
- Reveal private or sensitive information about individuals.

ALLOW messages that:
- Contain casual slang, friendly words (like "babe", "yo", etc.) not directed to harm.
- Express feelings, vent, joke, or share general thoughts without targeting anyone.

Reply ONLY with: ALLOW or BLOCK.
            `.trim()
          },
          {
            role: "user",
            content: userText
          }
        ]
      })
    });

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content?.trim();

    return res.status(200).json({ verdict: reply });

  } catch (error) {
    console.error("🛑 Moderation failed:", error);
    return res.status(500).json({ error: "Moderation error" });
  }
}
