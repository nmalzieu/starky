/**
 * @description      :
 * @author           :
 * @group            :
 * @created          : 01/04/2025 - 13:56:46
 *
 * MODIFICATION LOG
 * - Version         : 1.0.0
 * - Date            : 01/04/2025
 * - Author          :
 * - Modification    :
 **/
import RedirectMessage from "./RedirectMessage";

const ExpiredAnalyticsPage = () => {
  return (
    <RedirectMessage
      title="Invalid link"
      description="This link has probably expired. You may want to generate a new one by using the /starky-analytics command on Discord."
      buttonLabel="Home page"
      buttonLink="/"
      redirectTime={5000}
    />
  );
};

export default ExpiredAnalyticsPage;
