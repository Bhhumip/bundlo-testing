export function TagsSection({ tags, setTags }) {
    return (
        <s-section heading="Tags">
            <s-text-field
                label="Tags"
                value={tags}
                placeholder="summer, combo, socks"
                help-text="Comma separated. Used for filtering and search."
                onInput={(e) => setTags(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === "Enter") {
                        e.preventDefault();
                        e.stopPropagation();
                    }
                }}
            />
        </s-section>
    );
}