// components/SuccessModal.jsx

import { useNavigate } from "react-router";

export function SuccessModal({
    id = "success-modal",           // modal ID
    title = "Success!",             // title bar text
    message = "Operation completed successfully!", // body message
    productId = null,               //  Shopify GID (if you want "View product page")
    shop = null,                    //  shop domain
    redirectPath = "/app",          // where "Go to overview" navigates
}) {
    const navigate = useNavigate();

    const handleViewProduct = () => {
        const numericId = productId?.split("/").pop();
        shopify.modal.hide(id);

        setTimeout(() => {
            window.history.replaceState(null, "", redirectPath); // ← key fix
            window.top.location.href = `https://${shop}/admin/products/${numericId}`;
        }, 100);
    };

    const handleGoToOverview = () => {
        shopify.modal.hide(id);
        navigate(redirectPath);
    };

    return (
        <ui-modal id={id} variant="small">
            <p style={{ padding: "16px" }}>{message}</p>
            <ui-title-bar title={title}>
                {productId && shop && (
                    <button variant="primary" onClick={handleViewProduct}>
                        View product page
                    </button>
                )}
                <button onClick={handleGoToOverview}>
                    Go to overview
                </button>
            </ui-title-bar>
        </ui-modal>
    );
}