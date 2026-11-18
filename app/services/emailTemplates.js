function installEmail(shopName) {
    return {
        subject: `Welcome to Bundlo, ${shopName}!`,
        htmlBody: `
      <p>Hi there,</p>
      <p>Thanks for installing Bundlo on <strong>${shopName}</strong>. We're excited to help you build bundles, upsells, and offers for your store.</p>
      <p>If you have any questions getting started, just reply to this email.</p>
    `,
    };
}

function uninstallEmail(shopName) {
    return {
        subject: `Sorry to see you go, ${shopName}`,
        htmlBody: `
      <p>Hi there,</p>
      <p>Bundlo has been uninstalled from <strong>${shopName}</strong>.</p>
      <p>If there's something we could've done better, we'd genuinely love to hear it — just reply to this email.</p>
    `,
    };
}
function revenueLimitEmail(shopName, planName, revenueLimit, gracePeriodEndsAt) {
    const graceDate = new Date(gracePeriodEndsAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    return {
        subject: `Your Bundlo ${planName} revenue limit has been reached`,
        htmlBody: `
      <p>Hi there,</p>

      <p>
        Your <strong>${planName}</strong> plan on
        <strong>${shopName}</strong> has reached its rolling
        30-day revenue limit of <strong>$${revenueLimit.toLocaleString()}</strong>.
      </p>

      <p>
        You can no longer create new bundles while this limit is exceeded.
        Your existing bundles will continue to remain active during the
        7-day grace period.
      </p>

      <p>
        Your grace period ends on <strong>${graceDate}</strong>.
        Please upgrade your plan before then to continue using your existing bundles.
      </p>

      <p>
        If you have any questions, just reply to this email.
      </p>
    `,
    };
}

function planExpiryEmail(shopName, planName, expiryDate) {
    const formattedDate = expiryDate
        ? new Date(expiryDate).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        })
        : "soon";

    return {
        subject: `Your Bundlo ${planName} plan is expiring soon`,
        htmlBody: `
            <p>Hi there,</p>

            <p>
                Your <strong>${planName}</strong> plan for
                <strong>${shopName}</strong> is expiring on
                <strong>${formattedDate}</strong>.
            </p>

            <p>
                To keep using Bundlo's paid features without interruption,
                please renew or choose a plan from the Billing page.
            </p>

            <p>
                Thanks for using Bundlo!
            </p>
        `,
    };
}

export { installEmail, uninstallEmail, revenueLimitEmail, planExpiryEmail };
