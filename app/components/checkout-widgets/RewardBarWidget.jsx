export function RewardBarWidget({ shop, definition }) {
  return (
    <>
      <s-section>
        <s-stack gap="base">
          <s-heading>{definition.title}</s-heading>
          <s-paragraph color="subdued">{definition.description}</s-paragraph>
        </s-stack>
      </s-section>

      <s-section>
        <s-stack gap="base">
          <s-heading>Reward Bar Configuration</s-heading>

          <s-box padding="base" border="base" borderRadius="base" background="base">
            <s-stack gap="base">
              <s-heading size="small">Reward Threshold</s-heading>
              <s-form-group>
                <s-label htmlFor="goal-amount">Goal Amount ($)</s-label>
                <s-input
                  id="goal-amount"
                  type="number"
                  placeholder="100"
                />
                <s-text color="subdued" size="small">
                  Cart value needed to unlock the reward
                </s-text>
              </s-form-group>

              <s-form-group>
                <s-label htmlFor="reward-label">Reward Label</s-label>
                <s-input
                  id="reward-label"
                  type="text"
                  placeholder="Free shipping"
                />
                <s-text color="subdued" size="small">
                  What reward is offered (e.g., "Free shipping", "10% off", "$10 gift")
                </s-text>
              </s-form-group>

              <s-form-group>
                <s-label htmlFor="reward-description">Reward Description</s-label>
                <s-textarea
                  id="reward-description"
                  placeholder="Spend $100 or more and get free shipping on your order"
                />
              </s-form-group>

              <s-heading size="small">Bar Display</s-heading>
              <s-form-group>
                <s-label htmlFor="bar-style">Bar Style</s-label>
                <s-select id="bar-style" value="solid">
                  <s-option value="solid">Solid</s-option>
                  <s-option value="striped">Striped</s-option>
                  <s-option value="animated">Animated</s-option>
                </s-select>
              </s-form-group>

              <s-form-group>
                <s-label htmlFor="bar-color">Bar Color</s-label>
                <s-select id="bar-color" value="success">
                  <s-option value="success">Green</s-option>
                  <s-option value="warning">Orange</s-option>
                  <s-option value="critical">Red</s-option>
                  <s-option value="info">Blue</s-option>
                </s-select>
              </s-form-group>

              <s-form-group>
                <s-checkbox id="show-percentage">
                  <s-text>Show progress percentage</s-text>
                </s-checkbox>
              </s-form-group>

              <s-form-group>
                <s-checkbox id="show-remaining">
                  <s-text>Show amount remaining to reach goal</s-text>
                </s-checkbox>
              </s-form-group>

              <s-heading size="small">Messaging</s-heading>
              <s-form-group>
                <s-label htmlFor="headline">Headline</s-label>
                <s-input
                  id="headline"
                  placeholder="You're close to unlocking a reward"
                  type="text"
                />
              </s-form-group>

              <s-form-group>
                <s-label htmlFor="subheading">Subheading</s-label>
                <s-textarea
                  id="subheading"
                  placeholder="Encourage a larger checkout value with progress messaging."
                />
              </s-form-group>

              <s-form-group>
                <s-label htmlFor="cta-label">CTA Label</s-label>
                <s-input
                  id="cta-label"
                  placeholder="Unlock reward"
                  type="text"
                />
              </s-form-group>
            </s-stack>
          </s-box>
        </s-stack>
      </s-section>

      <s-section>
        <s-stack gap="base">
          <s-heading>Preview</s-heading>
          <s-box padding="base" border="base" borderRadius="base" background="base" tone="success">
            <s-stack gap="base">
              <s-heading size="small">You're close to unlocking a reward</s-heading>
              <s-paragraph color="subdued">Encourage a larger checkout value with progress messaging.</s-paragraph>

              <s-stack gap="small">
                <s-stack direction="inline" justifyContent="space-between" alignItems="center">
                  <s-text size="small">$75 of $100</s-text>
                  <s-text size="small" weight="bold">75%</s-text>
                </s-stack>
                <s-box
                  borderRadius="base"
                  background="subdued"
                  padding="none"
                  style={{
                    height: "8px",
                    overflow: "hidden"
                  }}
                >
                  <s-box
                    background="success"
                    style={{
                      height: "100%",
                      width: "75%"
                    }}
                  />
                </s-box>
                <s-text size="small" color="subdued">Add $25 more to unlock free shipping</s-text>
              </s-stack>

              <s-button tone="success">Unlock reward</s-button>
            </s-stack>
          </s-box>
        </s-stack>
      </s-section>
    </>
  );
}

