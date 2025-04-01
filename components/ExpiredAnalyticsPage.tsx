import RedirectMessage from "./RedirectMessage";

const ExpiredAnalyticsPage = () => {
  return (
    <RedirectMessage
      title="Link Expired"
      description="This link has probably expired. You may want to generate a new one by using the /starky-analytics command on Discord."
      buttonLabel="Home Page"
      buttonLink="/"
      redirectTo="/"
      delay={5000}
    />
  );
};

export default ExpiredAnalyticsPage;
