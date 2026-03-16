const BASE_CONTEXT = [
  "You are the Ready To Hire U FAQ assistant.",
  "Keep answers short, helpful, and client-facing.",
  "Use only this service information:",
  "- Price is $299 one-time.",
  "- Includes one custom mobile-responsive single-page website.",
  "- Includes one revision round.",
  "- Delivery target is 48 hours after payment and complete brief.",
  "- Payment is handled with Stripe checkout links.",
  "- Recommended Stripe success redirect URL is https://readytohireu.netlify.app/?payment=success",
  "- Recommended Stripe cancel redirect URL is https://readytohireu.netlify.app/?payment=cancel",
  "- After payment, clients should submit their project brief by email.",
  "- Support and intake contact email is Sevada.Zadooryan@gmail.com",
  "- Ongoing maintenance plans are available after launch:",
  "  - Basic Maintenance: $49/month — monthly content updates, security patches, uptime monitoring, bug fixes, email support with 48-hour response.",
  "  - Standard Maintenance: $99/month — everything in Basic plus bi-weekly updates, performance optimization, SEO monitoring, priority email support with 24-hour response.",
  "  - Premium Maintenance: $199/month — everything in Standard plus weekly and on-demand changes, analytics and conversion reporting, up to 2 new sections or features per month, same-day priority support.",
  "- Maintenance is billed monthly via Stripe with no long-term contract required. Clients can cancel anytime.",
  "- To start a maintenance plan, contact Sevada.Zadooryan@gmail.com.",
  "If a question is outside this scope, say that the user can contact support by email from the intake section."
].join("\n");

function fallbackAnswer(question: string): string {
  const text = question.toLowerCase();

  if (text.includes("price") || text.includes("cost") || text.includes("299")) {
    return "The package is a one-time $299 payment for one custom, mobile-responsive page and one revision.";
  }

  if (text.includes("delivery") || text.includes("turnaround") || text.includes("48")) {
    return "Standard delivery is within 48 hours once payment is complete and the brief has been submitted.";
  }

  if (text.includes("payment") || text.includes("stripe") || text.includes("checkout")) {
    return "Payment is completed through secure Stripe checkout links on the page.";
  }

  if (
    text.includes("redirect")
    || text.includes("success url")
    || text.includes("cancel url")
    || text.includes("?payment=success")
    || text.includes("?payment=cancel")
  ) {
    return "Use these Stripe redirect URLs: Success URL https://readytohireu.netlify.app/?payment=success and Cancel URL https://readytohireu.netlify.app/?payment=cancel.";
  }

  if (text.includes("revision") || text.includes("change") || text.includes("edit")) {
    return "One revision round is included in the package after the first delivery.";
  }

  if (
    text.includes("contact")
    || text.includes("support")
    || text.includes("who do i contact")
    || text.includes("who to contact")
  ) {
    return "For questions or project intake, contact Sevada.Zadooryan@gmail.com.";
  }

  if (text.includes("brief") || text.includes("email") || text.includes("details")) {
    return "After payment, submit the intake details and send the generated email brief to Sevada.Zadooryan@gmail.com so the build can start.";
  }

  if (text.includes("maintenance") || text.includes("ongoing") || text.includes("support plan") || text.includes("monthly")) {
    return "Three ongoing maintenance plans are available after launch: Basic at $49/month (monthly updates, bug fixes, email support), Standard at $99/month (bi-weekly updates, SEO, performance, priority support), and Premium at $199/month (weekly updates, analytics, new features, same-day support). No long-term contract — cancel anytime. Contact Sevada.Zadooryan@gmail.com to get started.";
  }

  return "This offer covers a $299 one-page build with 48-hour delivery, Stripe payment, and one revision. For anything else, use the intake email section to ask directly.";
}

function extractOutputText(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const data = payload as {
    output_text?: string;
    output?: Array<{ content?: Array<{ text?: string }> }>;
  };

  if (typeof data.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  const fromContent = data.output?.[0]?.content?.[0]?.text;
  if (typeof fromContent === "string" && fromContent.trim()) {
    return fromContent.trim();
  }

  return "";
}

async function fetchAiAnswer(question: string): Promise<string> {
  const gatewayBaseUrl = Netlify.env.get("NETLIFY_AI_GATEWAY_BASE_URL");
  const gatewayKey = Netlify.env.get("NETLIFY_AI_GATEWAY_KEY");

  if (!gatewayBaseUrl || !gatewayKey) {
    return "";
  }

  const response = await fetch(`${gatewayBaseUrl}/openai/v1/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${gatewayKey}`
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      max_output_tokens: 220,
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: BASE_CONTEXT }]
        },
        {
          role: "user",
          content: [{ type: "input_text", text: question }]
        }
      ]
    })
  });

  if (!response.ok) {
    return "";
  }

  const data = await response.json();
  return extractOutputText(data);
}

export default async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const body = (await req.json()) as { question?: string };
    const question = String(body?.question || "").trim();

    if (!question) {
      return Response.json({ error: "Question is required." }, { status: 400 });
    }

    const aiAnswer = await fetchAiAnswer(question);
    const answer = aiAnswer || fallbackAnswer(question);

    return Response.json({
      answer,
      source: aiAnswer ? "ai_gateway" : "fallback"
    });
  } catch (_error) {
    return Response.json({
      answer: fallbackAnswer(""),
      source: "fallback"
    });
  }
};
