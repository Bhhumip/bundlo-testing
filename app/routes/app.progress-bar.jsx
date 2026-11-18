import { redirect } from "react-router";

export async function loader() {
  return redirect(
    "/app/Customize/free-shipping-progress-bar?surface=CART",
  );
}

export default function ProgressBarRedirect() {
  return null;
}