export function BundleDetailsSection({ title, setTitle, placeholderBundleTitle, description, setDescription, errors }) {
    return (
        <s-section heading="Bundle details">
            <s-stack direction="block" gap="base">
                <s-text-field
                    label="Bundle name"
                    value={title}
                    placeholder={placeholderBundleTitle}
                    error={errors?.title}
                    onInput={(e) => setTitle(e.target.value)}
                />
                <s-text-field
                    label="Description (optional)"
                    multiline="3"
                    value={description}
                    placeholder="Describe what's included..."
                    onInput={(e) => setDescription(e.detail?.value ?? e.target.value)}
                />
            </s-stack>
        </s-section>
    );
}