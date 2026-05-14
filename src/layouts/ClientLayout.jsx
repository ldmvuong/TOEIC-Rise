import { Outlet, useLocation } from "react-router-dom";
import Header from "../components/client/header.client";
import Footer from "../components/client/footer.client";
import WelcomeGuideModal from "../components/client/WelcomeGuideModal";

const ClientLayout = () => {
  const location = useLocation();

  return (
    <>
      <WelcomeGuideModal />
      <Header currentPath={location.pathname} />
      <Outlet />
      <Footer />
    </>
  );
};

export default ClientLayout;
