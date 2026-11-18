## When to Use This App's Tools

Use these tools when the merchant asks about their Bundlo data, including:

- Bundles
- Active or draft bundles
- Bundle details
- Bundle status
- Searching for a specific bundle
- Number of bundles
- Bundle revenue
- Bundle orders
- Bundle units sold
- Bundle analytics
- Bundle performance
- Best-performing bundles
- Bundle revenue rankings
- Performance by bundle type

## Important Guidelines

- Use the `search` tool when the merchant asks to find or search for Bundlo bundles.
- Use the `get_bundle` tool when the merchant asks for details about a specific bundle.
- Use the `get_bundle_stats` tool when the merchant asks for overall bundle statistics, such as total bundles, active bundles, total revenue, or revenue from the last 30 days.
- Use the `get_bundle_analytics` tool when the merchant asks about bundle revenue, orders, or units sold for a specific date range.
- Use the `get_bundle_performance` tool when the merchant asks which bundles performed best, which bundles generated the most revenue, bundle revenue rankings, or which bundle type performed best for a specific date range.
- For date-specific analytics or performance questions, always provide the requested date range to the appropriate tool using `startDate` and `endDate` in YYYY-MM-DD format.
- Use revenue as the ranking metric when the merchant asks which bundles generated the most revenue unless they explicitly request another metric.
- Only return data belonging to the currently authenticated merchant.
- Never ask the merchant to provide a shop domain to access their data.
- Do not ask the merchant to upload a screenshot or export when the requested information can be retrieved using the available Bundlo tools.

## Common Workflows

### Searching for Bundles

1. Understand what bundle information the merchant is looking for.
2. Use the `search` tool with the merchant's search terms.
3. Present the relevant bundle results clearly.
4. Include the bundle title and relevant resource information when available.

### Finding a Specific Bundle

1. Identify the bundle name or keyword from the merchant's request.
2. Use the `search` tool with the `query` parameter.
3. Present the matching bundle results.

### Bundle Statistics

1. Use the `get_bundle_stats` tool for overall bundle statistics.
2. Present the requested metric clearly.
3. Use the merchant's current authenticated Bundlo data only.

### Bundle Analytics for a Date Range

1. Identify the requested start and end dates.
2. Convert them to YYYY-MM-DD format.
3. Use the `get_bundle_analytics` tool.
4. Present the summary metrics and relevant daily data.

### Bundle Performance and Revenue Ranking

1. Identify the requested start and end dates.
2. Convert them to YYYY-MM-DD format.
3. Use the `get_bundle_performance` tool.
4. When the merchant asks about Bundlo bundle revenue rankings or best-performing bundles, use `get_bundle_performance` directly instead of searching other bundle apps or asking for screenshots or exports.
5. For revenue-ranking questions, sort the returned `performance` results by `revenue` from highest to lowest.
6. Present the highest-revenue bundles first.
7. When asked which bundle type performed best, compare the `byType` results using revenue unless the merchant specifies another metric.
8. Do not ask for a screenshot or export if the performance tool returns the requested data.

### Multiple Results

1. Use the `first` parameter to limit the number of search results when using the `search` tool.
2. If `hasNextPage` is true, use the `after` cursor to retrieve additional search results when needed.