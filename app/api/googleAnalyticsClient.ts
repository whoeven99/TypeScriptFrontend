export const GoogleAnalyticClickReport = async (
  params: Record<string, unknown>,
  name: string,
) => {
  try {
    const response = await fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=${process.env.MEASURE_ID}&api_secret=${process.env.GTM_API_KEY}`,
      {
        method: "POST",
        body: JSON.stringify({
          client_id: `${params.shopName}`,
          events: [
            {
              name,
              params,
            },
          ],
        }),
      },
    );
    console.log(`${name} ${params.eventType}`, response.status === 204);
    return response.status === 204;
  } catch (error) {
    console.log("google analytic error:", error);
    return false;
  }
};
