import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { EmptyWidgetTab } from "~/components/shared/CustomizeFormWidgets/subcomponents/EmptyWidgetTab.jsx";

describe("EmptyWidgetTab", () => {
    it("renders nothing", () => {
        const { container } = render(<EmptyWidgetTab />);
        expect(container).toBeEmptyDOMElement();
    });

    it("ignores any props it is given", () => {
        const { container } = render(<EmptyWidgetTab theme={{}} update={() => { }} mode="checkout" />);
        expect(container).toBeEmptyDOMElement();
    });
});