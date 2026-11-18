import { useState } from "react";
import { redirect, Form, useLoaderData, useNavigation } from "react-router";
import { login } from "../../shopify.server";
import "./styles.css";

import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import HeroCrousel from "./components/HeroCrousel";
import BundleShowcase from "./components/BundleShowcase";
import WidgetSection from "./components/WidgetSection";
import GalleryBanner from "./components/GalleryBanner";
import Features from "./components/Features";
import Testimonials from "./components/Testimonials";
import FAQ from "./components/FAQ";
import Footer from "./components/Footer";

export const loader = async ({ request }) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return { showForm: Boolean(login) };
};

function normalizeShop(value) {
  return value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "");
}

export default function App() {
  const { showForm } = useLoaderData();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const [shop, setShop] = useState("");

  // onBlur normalizes as the person tabs away, which covers the common case.
  // But pressing Enter submits the form without ever firing blur, so a raw
  // value (protocol prefix, trailing slash, mixed case) could reach the
  // server unnormalized. Normalizing the live DOM value here — synchronously,
  // before the browser reads form data for the native submission — closes
  // that gap regardless of how the form was submitted.
  const handleSubmit = (event) => {
    const input = event.currentTarget.elements.namedItem("shop");
    if (input) {
      const normalized = normalizeShop(input.value);
      input.value = normalized;
      setShop(normalized);
    }
  };

  return (
    <div className="bc-page">
      <Navbar />

      <Hero>
        {showForm && (
          <Form className="bc-form" method="post" action="/auth/login" onSubmit={handleSubmit}>
            <label className="bc-label" htmlFor="shop">
              <span className="bc-label-text">Shop domain</span>

              <input
                id="shop"
                className="bc-input"
                type="text"
                name="shop"
                placeholder="my-shop-domain.myshopify.com"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                value={shop}
                onChange={(event) => setShop(event.target.value)}
                onBlur={(event) => setShop(normalizeShop(event.target.value))}
              />

              <span className="bc-hint">e.g. my-shop-domain.myshopify.com</span>
            </label>

            <button
              className="bc-button"
              type="submit"
              disabled={isSubmitting || shop.trim().length === 0}
            >
              {isSubmitting ? (
                <>
                  <span className="bc-spinner" aria-hidden="true"></span>
                  Signing in...
                </>
              ) : (
                "Log in"
              )}
            </button>
          </Form>
        )}
      </Hero>

      <HeroCrousel />
      <BundleShowcase />
      <WidgetSection />
      <Features />
      <Testimonials />
      <FAQ />
      <Footer />
    </div>
  );
}