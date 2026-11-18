import { useNavigate } from "react-router";

export function BackArrow() {
    const navigate = useNavigate();
    return (
        <s-button variant="tertiary" icon="arrow-left" onClick={() => navigate(-1)}>
            Back
        </s-button>
    );
}

export function ForwardArrow() {
    const navigate = useNavigate();
    return (
        <s-button variant="tertiary" icon="arrow-left" onClick={() => navigate(-1)}>
            Back
        </s-button>
    );
}