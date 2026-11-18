import { useLoaderData } from "react-router";

export default function WidgetDisplay() {
  const { appEmbedActive = false, blockStatuses = [], urls = {} } =
    useLoaderData() ?? {};

  const activeMap = Object.fromEntries(
    blockStatuses.map((block) => [block.handle, block.active])
  );

  const cards = [
    {
      key: "Fixed Bundle",
      title: "Frequently bought together",
      description:
        "Sell a pre-selected set of products together as one bundle offer.",
      image:
        "https://cdnapps.avada.io/bundle/widgets/bb-hover.jpg",
      active: !!activeMap.fixed_bundle,
      addHref: urls?.blocks?.fixed_bundle?.addToMainSection,
      editorHref: urls?.blocks?.fixed_bundle?.openEditor,
      addLabel: "Add Bundle block",
    },
    {
      key: "volume_bundle",
      title: "Volume Bundle",
      description:
        "Encourage larger purchases with tiered discounts based on quantity bought.",
      image:
        "https://cdnapps.avada.io/bundle/widgets/volume-hover.jpg",
      active: !!activeMap.volume_bundle,
      addHref: urls?.blocks?.volume_bundle?.addToMainSection,
      editorHref: urls?.blocks?.volume_bundle?.openEditor,
      addLabel: "Add Volume Bundle block",
    },
    {
      key: "mix_and_match_bundle",
      title: "Mix & Match Bundle",
      description:
        "Let customers choose their own combination of products to build a custom bundle.",
      image:
        "https://cdnapps.avada.io/bundle/widgets/mm-hover.jpg",
      active: !!activeMap.mix_and_match_bundle,
      addHref: urls?.blocks?.mix_and_match_bundle?.addToMainSection,
      editorHref: urls?.blocks?.mix_and_match_bundle?.openEditor,
      addLabel: "Add Mix & Match Bundle block",
    },
  ];

  return (
    <div style={{ padding: "24px 32px", background: "#f6f6f7", minHeight: "100vh" }}>
      <h1 style={{ fontSize: "28px", fontWeight: 700, marginBottom: "24px" }}>
        Widget display
      </h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: "24px",
        }}
      >
        {cards.map((card) => (
          <div
            key={card.key}
            style={{
              background: "#fff",
              border: "1px solid #e1e3e5",
              borderRadius: "16px",
              overflow: "hidden",
              boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
            }}
          >
            <a href={card.editorHref || card.addHref || "#"} style={{ display: "block", textDecoration: "none" }} target="_top" rel="noreferrer">
              <div style={{ height: "180px", overflow: "hidden", background: "#f1f2f3" }}>
                <img
                  src={card.image}
                  alt={card.title}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              </div>
            </a>

            <div style={{ padding: "20px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  marginBottom: "12px",
                  flexWrap: "wrap",
                }}
              >
                <h2 style={{ fontSize: "16px", fontWeight: 700, margin: 0 }}>
                  {card.title}
                </h2>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    padding: "4px 8px",
                    borderRadius: "999px",
                    background: card.active ? "#bbf7d0" : "#fed7aa",
                    color: card.active ? "#166534" : "#9a3412",
                  }}
                >
                  {card.active ? "Active" : "Needs setup"}
                </span>
              </div>

              <p
                style={{
                  margin: 0,
                  marginBottom: "16px",
                  color: "#4a4f55",
                  lineHeight: 1.45,
                  fontSize: "14px",
                }}
              >
                {card.description}
              </p>

              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  flexWrap: "wrap",
                }}
              >
                {!card.active ? (
                  <a
                    href={card.addHref || "#"}
                    target="_top"
                    rel="noreferrer"
                    style={{
                      display: "inline-block",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      border: "1px solid #111827",
                      background: "#111827",
                      color: "#fff",
                      textDecoration: "none",
                      fontSize: "14px",
                      fontWeight: 600,
                    }}
                  >
                    {card.addLabel}
                  </a>
                ) : null}

                <a
                  href={card.editorHref || "#"}
                  target="_top"
                  rel="noreferrer"
                  style={{
                    display: "inline-block",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    border: "1px solid #c9cccf",
                    background: "#fff",
                    color: "#111827",
                    textDecoration: "none",
                    fontSize: "14px",
                    fontWeight: 600,
                  }}
                >
                  Open theme editor
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}