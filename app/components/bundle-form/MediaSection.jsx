export function MediaSection({
    mediaPreview,
    handleFileChange,
    clearMedia,
    inputId = "media-input",
}) {
    return (

        < s-section heading="Media" >
            <s-stack direction="block" gap="base">
                {mediaPreview ? (
                    <s-stack direction="block" gap="tight">
                        <img
                            src={mediaPreview}
                            alt="Preview"
                            style={{ width: 200, height: 200, objectFit: "cover", borderRadius: 8 }}
                        />
                        <s-button variant="tertiary" tone="critical" onClick={clearMedia}>
                            Remove
                        </s-button>
                    </s-stack>
                ) : (
                    <s-button variant="secondary" onClick={() => document.getElementById("media-input-mm").click()}>
                        Upload image
                    </s-button>
                )}
                <input
                    id="media-input-mm"
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={handleFileChange}
                />
            </s-stack>
        </s-section >
    );
}
