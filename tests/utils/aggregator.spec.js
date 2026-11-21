import { describe, it, expect } from "vitest";
import { aggregateReviews } from "~/reviews/aggregator.js";

// Worth 0 points by default (1 star, no photo/title/body/votes), so each test
// switches on only the signal it wants to measure.
const review = (overrides) => ({
    id: "r",
    rating: 1,
    title: "",
    body: "",
    pictureUrls: [],
    ...overrides,
});
const ids = (result) => result.testimonials.map((t) => t.id);

describe("aggregateReviews: empty input", () => {
    it.each([[null], [undefined], [[]]])("returns an empty result for %j", (input) => {
        expect(aggregateReviews(input, "judgeme")).toEqual({
            testimonials: [],
            averageRating: 0,
            totalCount: 0,
            source: "judgeme",
        });
    });
});

describe("aggregateReviews: scoring and ordering", () => {
    it("ranks a photo review above a 5-star review without a photo", () => {
        const result = aggregateReviews(
            [review({ id: "five", rating: 5 }), review({ id: "photo", pictureUrls: ["a.jpg"] })],
            "judgeme"
        );
        expect(ids(result)).toEqual(["photo", "five"]);
    });

    it("ranks by rating tier: 5 > 4 > 3 > 2", () => {
        const result = aggregateReviews(
            [review({ id: "2", rating: 2 }), review({ id: "3", rating: 3 }),
            review({ id: "4", rating: 4 }), review({ id: "5", rating: 5 })],
            "judgeme"
        );
        expect(ids(result)).toEqual(["5", "4", "3", "2"]);
    });

    it("gives a bonus for a title, but not for a whitespace-only title", () => {
        const result = aggregateReviews(
            [review({ id: "blank", title: "   " }), review({ id: "titled", title: "Great" })],
            "judgeme"
        );
        expect(ids(result)).toEqual(["titled", "blank"]);
    });

    it("gives a bonus for a body longer than 50 characters (boundary: 50 vs 51)", () => {
        const result = aggregateReviews(
            [review({ id: "fifty", body: "x".repeat(50) }), review({ id: "fifty-one", body: "x".repeat(51) })],
            "judgeme"
        );
        expect(ids(result)).toEqual(["fifty-one", "fifty"]);
    });

    it("adds a point per upvote", () => {
        const result = aggregateReviews(
            [review({ id: "none" }), review({ id: "three", _votesUp: 3 })],
            "judgeme"
        );
        expect(ids(result)).toEqual(["three", "none"]);
    });

    it("caps upvotes so a viral low-rated review cannot beat a 4-star review", () => {
        const result = aggregateReviews(
            [review({ id: "viral", rating: 3, _votesUp: 100 }), review({ id: "four", rating: 4 })],
            "judgeme"
        );
        expect(ids(result)).toEqual(["four", "viral"]);
    });

    it("keeps the original order for reviews with equal scores", () => {
        const result = aggregateReviews(
            [review({ id: "1" }), review({ id: "2" }), review({ id: "3" })],
            "judgeme"
        );
        expect(ids(result)).toEqual(["1", "2", "3"]);
    });
});

describe("aggregateReviews: de-duplication and limits", () => {
    it("keeps only the highest-scoring copy of a duplicated id", () => {
        const result = aggregateReviews(
            [review({ id: "1", rating: 1 }), review({ id: "1", rating: 5 }), review({ id: "2" })],
            "judgeme"
        );
        expect(ids(result)).toEqual(["1", "2"]);
        expect(result.testimonials[0].rating).toBe(5);
    });

    // Characterization: stats are computed BEFORE de-duplication
    it("counts duplicates in totalCount", () => {
        const result = aggregateReviews([review({ id: "1" }), review({ id: "1" })], "judgeme");
        expect(result.testimonials).toHaveLength(1);
        expect(result.totalCount).toBe(2);
    });

    it("returns at most 9 testimonials but counts all reviews", () => {
        const many = Array.from({ length: 12 }, (_, i) => review({ id: String(i) }));
        const result = aggregateReviews(many, "judgeme");
        expect(result.testimonials).toHaveLength(9);
        expect(result.totalCount).toBe(12);
    });
});

describe("aggregateReviews: output shape", () => {
    it("strips internal scoring fields but keeps the rest", () => {
        const result = aggregateReviews(
            [review({ id: "1", author: "Priya", _votesUp: 2, _isAggregate: true })],
            "judgeme"
        );
        const item = result.testimonials[0];
        expect(item).not.toHaveProperty("_score");
        expect(item).not.toHaveProperty("_votesUp");
        expect(item).not.toHaveProperty("_isAggregate");
        expect(item).toMatchObject({ id: "1", author: "Priya" });
    });

    it("passes the source through", () => {
        expect(aggregateReviews([review({ id: "1" })], "metafield").source).toBe("metafield");
    });

    it("does not mutate the input reviews", () => {
        const input = [review({ id: "b" }), review({ id: "a", rating: 5 })];
        aggregateReviews(input, "judgeme");
        expect(input.map((r) => r.id)).toEqual(["b", "a"]);
        expect(input[0]).not.toHaveProperty("_score");
    });
});

describe("aggregateReviews: average rating", () => {
    it.each([
        [[5, 4, 4], 4.3],
        [[5, 5, 4], 4.7],
        [[3], 3],
    ])("ratings %j → average %d (1 decimal place)", (ratings, expected) => {
        const result = aggregateReviews(ratings.map((rating, i) => review({ id: String(i), rating })), "judgeme");
        expect(result.averageRating).toBe(expected);
    });

    it("averages across ALL reviews, not just the top 9", () => {
        const reviews = [
            ...Array.from({ length: 9 }, (_, i) => review({ id: `a${i}`, rating: 5 })),
            review({ id: "low", rating: 1 }),
        ];
        const result = aggregateReviews(reviews, "judgeme");
        expect(ids(result)).not.toContain("low");
        expect(result.averageRating).toBe(4.6);
    });

    it("counts a missing rating as 0", () => {
        const result = aggregateReviews([{ id: "1" }, { id: "2", rating: 4 }], "judgeme");
        expect(result.averageRating).toBe(2);
    });
});