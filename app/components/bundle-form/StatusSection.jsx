export function StatusSection({ status, setStatus }) {
    return (
        <s-section heading="Status & visibility">
            <s-select
                label="Bundle status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
            >
                <s-option value="ACTIVE">Active — visible to customers</s-option>
                <s-option value="DRAFT">Draft — hidden</s-option>
            </s-select>
        </s-section>
    );
}