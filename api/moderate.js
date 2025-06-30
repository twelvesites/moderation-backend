export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  const userText = req.body.text;
  console.log("Received text:", userText);
  if (!userText) return res.status(400).json({ error: "No text provided" });

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
      }),
    });

    console.log("OpenRouter status:", response.status);
    const data = await response.json();
    console.log("OpenRouter full response:", JSON.stringify(data, null, 2));

    if (!data.choices || data.choices.length === 0) {
      return res.status(500).json({ error: "No choices returned from OpenRouter" });
    }

    const reply = data.choices[0]?.message?.content?.trim();

    if (!reply) {
      return res.status(500).json({ error: "No reply content in choices" });
    }

    return res.status(200).json({ verdict: reply });

  } catch (error) {
    console.error("Moderation error:", error);
    return res.status(500).json({ error: "Moderation error" });
  }
}
