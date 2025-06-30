export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).send("Method Not Allowed");
  }

  res.setHeader("Access-Control-Allow-Origin", "*");

  const userText = req.body.text;
  if (!userText) {
    return res.status(400).json({ error: "No text provided" });
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-r1-0528",
        max_tokens: 256,      
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
            content: userText,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("OpenRouter API error:", response.status, errorBody);
      return res.status(500).json({ error: `OpenRouter API error: ${errorBody}` });
    }

    const data = await response.json();

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
