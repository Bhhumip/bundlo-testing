
import { useFetcher } from "react-router";
import { randomUUID } from "node:crypto";

import { BackArrow } from "../components/NavArrows.jsx";
import { authenticate } from "../shopify.server";
import { canShopAccessFeature } from "../featureAccess.server";
import db from "../db.server";
import { sendEmail } from "../services/email.server";

export const loader = async ({ request }) => {
    await authenticate.admin(request);
    return null;
};

const SUPPORT_EMAIL = "support@properoapps.in";

const escapeHtml = (value) =>
    String(value).replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
    })[char]);

const createEmailLayout = (content) => `
    <div style="margin:0;padding:32px 16px;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;color:#202124;">
        <div style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
            <div style="background:#171717;padding:24px 30px;">
                <h2 style="margin:0;color:#ffffff;font-size:22px;letter-spacing:1px;">BUNDLO</h2>
                <p style="margin:8px 0 0;color:#d1d5db;font-size:13px;">Customer Support</p>
            </div>
            <div style="padding:30px;">
                ${content}
            </div>
            <div style="border-top:1px solid #e5e7eb;padding:18px 30px;text-align:center;">
                <p style="margin:0;color:#9ca3af;font-size:12px;">Bundlo Support · ${SUPPORT_EMAIL}</p>
            </div>
        </div>
    </div>
`;

export const action = async ({ request }) => {
    const { session } = await authenticate.admin(request);
    const formData = await request.formData();

    const email = String(formData.get("email") || "").trim();
    const subject = String(formData.get("subject") || "").trim();
    const message = String(formData.get("message") || "").trim();

    if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        !subject ||
        !message
    ) {
        return {
            success: false,
            message: "Please enter a valid email, subject and message.",
        };
    }

    if (subject.length > 150 || message.length > 5000) {
        return {
            success: false,
            message: "Subject or message is too long.",
        };
    }

    const hasPrioritySupport = await canShopAccessFeature(
        session.shop,
        "PRIORITY_SUPPORT"
    );

    const responseTime = hasPrioritySupport
        ? "within 24 hours"
        : "within 2 business days";

    let ticket;

    try {
        // Create the ticket first with a temporary unique identifier.
        ticket = await db.supportTicket.create({
            data: {
                ticketNumber: `PENDING-${randomUUID()}`,
                shop: session.shop,
                customerEmail: email,
                subject,
                message,
                responseTime,
            },
        });

        // Use the database auto-increment ID for the final ticket number.
        const ticketNumber = `BND-${String(ticket.id).padStart(6, "0")}`;

        ticket = await db.supportTicket.update({
            where: { id: ticket.id },
            data: { ticketNumber },
        });

        const safeTicketNumber = escapeHtml(ticketNumber);
        const safeShop = escapeHtml(session.shop);
        const safeEmail = escapeHtml(email);
        const safeSubject = escapeHtml(subject);
        const safeMessage = escapeHtml(message);

        // Email to the common Bundlo support inbox.
        const supportHtml = createEmailLayout(`
            <h2 style="margin:0 0 10px;font-size:20px;color:#202124;">New Support Request</h2>

            <p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.6;">
                A merchant has submitted a new support request through the Bundlo app.
            </p>

            <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:18px;margin-bottom:22px;">
                <p style="margin:0 0 12px;font-size:14px;"><strong>Ticket number:</strong> ${safeTicketNumber}</p>
                <p style="margin:0 0 12px;font-size:14px;"><strong>Store:</strong> ${safeShop}</p>
                <p style="margin:0 0 12px;font-size:14px;"><strong>Customer email:</strong> ${safeEmail}</p>
                <p style="margin:0;font-size:14px;"><strong>Subject:</strong> ${safeSubject}</p>
            </div>

            <h3 style="margin:0 0 10px;font-size:15px;color:#202124;">Message</h3>

            <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;padding:18px;font-size:14px;line-height:1.7;color:#374151;white-space:pre-wrap;">${safeMessage}</div>

            <p style="margin:22px 0 0;font-size:14px;line-height:1.6;color:#4b5563;">
                Please respond to the customer ${responseTime}.
            </p>
        `);

        const supportSent = await sendEmail({
            shop: session.shop,
            event: "support_request",
            to: SUPPORT_EMAIL,
            subject: `[Bundlo Support] [${ticketNumber}] ${subject}`,
            htmlBody: supportHtml,
            replyTo: email,
        });

        if (!supportSent) {
            console.error(`[support] Team notification failed for ${ticketNumber}`);

            return {
                success: false,
                ticketNumber,
                message: `Your ticket ${ticketNumber} was created, but we couldn't notify our support team. Please contact ${SUPPORT_EMAIL}.`,
            };
        }

        // Acknowledgement email to the customer.
        const customerHtml = createEmailLayout(`
            <h2 style="margin:0 0 12px;font-size:20px;color:#202124;">We've received your request!</h2>

            <p style="margin:0 0 22px;color:#6b7280;font-size:14px;line-height:1.7;">
                Thank you for contacting Bundlo Support. Your support request has been successfully received.
            </p>

            <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin-bottom:22px;">
                <p style="margin:0 0 8px;color:#6b7280;font-size:13px;">Your ticket number</p>
                <h2 style="margin:0;color:#171717;font-size:24px;letter-spacing:1px;">${safeTicketNumber}</h2>
            </div>

            <p style="margin:0 0 12px;font-size:14px;line-height:1.7;color:#374151;">
                <strong>Subject:</strong> ${safeSubject}
            </p>

            <p style="margin:0;font-size:14px;line-height:1.7;color:#4b5563;">
                Our support team will get back to you ${responseTime}.
                Please keep your ticket number for future reference.
            </p>
        `);

        const customerSent = await sendEmail({
            shop: session.shop,
            event: "support_acknowledgement",
            to: email,
            subject: `Your Bundlo support request [${ticketNumber}]`,
            htmlBody: customerHtml,
            replyTo: SUPPORT_EMAIL,
        });

        if (!customerSent) {
            console.error(`[support] Customer acknowledgement failed for ${ticketNumber}`);
        }

        return {
            success: true,
            ticketNumber,
            responseTime,
            customerEmailSent: customerSent,
        };
    } catch (error) {
        console.error("[support] Request submission failed:", error);

        return {
            success: false,
            message: "Something went wrong while processing your request. Please try again.",
        };
    }
};

export default function EmailSupportPage() {
    const fetcher = useFetcher();
    const isSubmitting = fetcher.state !== "idle";
    const result = fetcher.data;

    return (
        <s-page heading="Contact Support">
            <div
                slot="nav"
                style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    width: "100%",
                }}
            >
                <BackArrow />
            </div>

            <s-section>
                <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "8px 0 32px" }}>
                    <div
                        style={{
                            background: "#fff",
                            border: "1px solid #e1e3e5",
                            borderRadius: "12px",
                            padding: "32px",
                        }}
                    >
                        {!result?.success && (
                            <div style={{ marginBottom: "28px" }}>
                                <s-heading size="large">How can we help?</s-heading>
                                <div style={{ marginTop: "8px" }}>
                                    <s-text tone="subdued">
                                        Have a question or facing an issue with Bundlo?
                                        Send us a message and our support team will get back to you.
                                    </s-text>
                                </div>
                            </div>
                        )}

                        {result?.success && (
                            <div
                                style={{
                                    background: "#f0fdf4",
                                    border: "1px solid #bbf7d0",
                                    borderRadius: "10px",
                                    padding: "20px",
                                    marginBottom: "24px",
                                }}
                            >
                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                    <span style={{ fontSize: "20px", color: "#15803d" }}>✓</span>
                                    <s-heading size="small">Thanks for reaching out!</s-heading>
                                </div>

                                <div style={{ marginTop: "8px", paddingLeft: "30px" }}>
                                    <s-text>
                                        We&apos;ve received your message. Our team will get back to you {result.responseTime}.
                                    </s-text>

                                    <div style={{ marginTop: "12px" }}>
                                        <s-text>
                                            Your ticket number: <strong>{result.ticketNumber}</strong>
                                        </s-text>
                                    </div>

                                    {!result.customerEmailSent && (
                                        <div style={{ marginTop: "10px" }}>
                                            <s-text tone="subdued">
                                                Your request was received, but we couldn&apos;t send the confirmation email. Please keep your ticket number for reference.
                                            </s-text>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {result?.success === false && (
                            <div
                                style={{
                                    background: "#fff1f0",
                                    border: "1px solid #e8b4b0",
                                    borderRadius: "8px",
                                    padding: "14px",
                                    marginBottom: "20px",
                                }}
                            >
                                <s-text tone="critical">{result.message}</s-text>
                            </div>
                        )}

                        {!result?.success && (
                            <fetcher.Form method="post">
                                <div style={{ display: "grid", gap: "20px" }}>
                                    <div>
                                        <s-text-field
                                            label="Email address"
                                            name="email"
                                            type="email"
                                            placeholder="you@example.com"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <s-text-field
                                            label="Subject"
                                            name="subject"
                                            placeholder="What do you need help with?"
                                            required
                                            maxLength={150}
                                        />
                                    </div>

                                    <div>
                                        <s-text-area
                                            label="Message"
                                            name="message"
                                            placeholder="Describe your question or issue in detail..."
                                            rows={7}
                                            required
                                            maxLength={5000}
                                        />
                                    </div>

                                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                                        <s-button
                                            variant="primary"
                                            type="submit"
                                            disabled={isSubmitting}
                                        >
                                            {isSubmitting ? "Submitting..." : "Submit Request"}
                                        </s-button>
                                    </div>
                                </div>
                            </fetcher.Form>
                        )}

                        <div
                            style={{
                                borderTop: "1px solid #e1e3e5",
                                marginTop: "28px",
                                paddingTop: "20px",
                            }}
                        />
                    </div>

                    <div style={{ textAlign: "center", marginTop: "20px" }}>
                        <s-text tone="subdued">
                            You can also reach us at support@properoapps.in
                        </s-text>
                    </div>
                </div>
            </s-section>
        </s-page>
    );
}
