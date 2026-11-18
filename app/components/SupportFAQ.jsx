import * as Accordion from "@radix-ui/react-accordion";

const FAQ_ITEMS = [
    {
        value: "item-1",
        question: "What tools are available to optimize my Shopify store?",
        answer:
            "Our platform offers a range of tools to enhance your store's performance: Website Analyzer, AI Chatbot, Web To App Converter, Shopify Utils, Shopify Status, Theme Converter, and CRO. These tools help improve speed, optimize themes, and boost conversions.",
    },
    {
        value: "item-2",
        question: "Is there a cost associated with these tools?",
        answer:
            "There is no cost associated with the tools as of now. All the tools and their features can be used for free.",
    },
    {
        value: "item-3",
        question: "How accurate are the analytics provided?",
        answer:
            "Our tools use reliable data sources and algorithms to deliver accurate and actionable insights. However, for the best results, we recommend using them in combination with other data sources and strategies.",
    },
    {
        value: "item-4",
        question: "Do I need technical knowledge to use these tools?",
        answer:
            "No technical expertise is needed! Our tools are designed with user-friendly interfaces and guided instructions, making them accessible to users of all experience levels.",
    },
    {
        value: "item-5",
        question: "Can I use these tools for any website?",
        answer:
            "Yes, most tools are compatible with any website. Some features may be more tailored to Shopify stores, so Shopify users can benefit from specialized insights.",
    },
    {
        value: "item-6",
        question: "Can I get support if I need help?",
        answer:
            "Yes, our support team is available to help with any questions or technical issues. You can reach out to us via the contact options on our website.",
    },
];

export function SupportFAQ() {
    return (
        <div style={styles.wrapper}>
            <h2 style={styles.heading}>Frequently Asked Questions(FAQ)</h2>

            <Accordion.Root type="single" collapsible style={styles.root}>
                {FAQ_ITEMS.map(({ value, question, answer }) => (
                    <Accordion.Item key={value} value={value} style={styles.item}>

                        <Accordion.Header>
                            <Accordion.Trigger style={styles.trigger}>
                                <span>{question}</span>
                                <span style={styles.icon}>▾</span>
                            </Accordion.Trigger>
                        </Accordion.Header>

                        <Accordion.Content style={styles.content}>
                            <div style={styles.contentInner}>{answer}</div>
                        </Accordion.Content>

                    </Accordion.Item>
                ))}
            </Accordion.Root>
        </div>
    );
}

const styles = {
    wrapper: {
        padding: "16px 0",
    },
    heading: {
        fontSize: "18px",
        fontWeight: "600",
        marginBottom: "12px",
    },
    root: {
        borderTop: "1px solid #e5e7eb",
    },
    item: {
        borderBottom: "1px solid #e5e7eb",
    },
    trigger: {
        all: "unset",
        width: "100%",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "14px 0",
        cursor: "pointer",
        fontSize: "14px",
        fontWeight: "500",
        color: "#111",
        gap: "8px",
        boxSizing: "border-box",
    },
    icon: {
        fontSize: "16px",
        flexShrink: 0,
        transition: "transform 0.2s ease",
    },
    content: {
        overflow: "hidden",
    },
    contentInner: {
        paddingBottom: "14px",
        fontSize: "13px",
        color: "#6b7280",
        lineHeight: "1.6",
    },
};