export const log = async (message: string, network?: string) => {
  const webhookUrl = !network
    ? process.env.WEBHOOK_URL
    : process.env[`WEBHOOK_URL_${network.toUpperCase()}`];
  if (webhookUrl) {
    await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: message,
      }),
    });
  } else {
    console.log(message);
  }
};
