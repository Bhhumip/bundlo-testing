
// After the adapter returns a raw list of reviews, the aggregator processes
// them into what the checkout extension actually needs:
//
//   1. Score each review (photo + high rating + upvotes = higher score)
//   2. Sort by score (best reviews first)
//   3. Deduplicate (same review can't appear twice)
//   4. Pick the top N for the carousel (max 9)
//   5. Compute averageRating and totalCount across ALL reviews
// ─────────────────────────────────────────────────────────────────────────────

// Max testimonials to send to the checkout extension
// (3 visible at a time, scroll reveals more)
const MAX_TESTIMONIALS = 9;

// ─────────────────────────────────────────────────────────────────────────────
// aggregateReviews
//
// Takes the raw NormalizedReview[] from an adapter and returns
// the final shape your API route sends as JSON.
//
// @param {NormalizedReview[]} reviews  - all reviews from the adapter
// @param {string}             source   - which adapter produced these ("judgeme" etc)
//
// @returns {{
//   testimonials:  NormalizedReview[],   trimmed + sorted top picks
//   averageRating: number,               across ALL reviews (not just top picks)
//   totalCount:    number,               total review count
//   source:        string,               which adapter was used
// }}
// ─────────────────────────────────────────────────────────────────────────────

export function aggregateReviews(reviews, source) {
    if (!reviews?.length) {
        return { testimonials: [], averageRating: 0, totalCount: 0, source };
    }

    // ── Compute aggregate stats across ALL reviews first ──────────────────
    const totalCount = reviews.length;
    const averageRating = computeAverageRating(reviews);

    // ── Score every review ────────────────────────────────────────────────
    const scored = reviews.map((r) => ({
        ...r,
        _score: scoreReview(r),
    }));

    // ──  Sort by score descending  ──────────────────────────
    scored.sort((a, b) => b._score - a._score);

    // ── Deduplicate by ID  ──────────────────
    const seen = new Set();
    const deduped = scored.filter((r) => {
        if (seen.has(r.id)) return false;
        seen.add(r.id);
        return true;
    });

    // ── Take only top MAX_TESTIMONIALS ────────────────────────────────────
    const testimonials = deduped
        .slice(0, MAX_TESTIMONIALS)
        .map((r) => {
            // Strip internal scoring fields before sending to extension
            const { _score, _votesUp, _isAggregate, ...clean } = r;
            return clean;
        });

    return {
        testimonials,
        averageRating: Math.round(averageRating * 10) / 10, // 1 decimal place
        totalCount,
        source,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// PRIVATE: scoreReview
//
// Scores a review from 0–100.
// Higher score = shown earlier in the carousel.
//
// Scoring formula:
//   - Has photos:       +40 pts  (visual reviews are most compelling)
//   - Rating = 5:       +30 pts
//   - Rating = 4:       +20 pts
//   - Rating = 3:       +5 pts
//   - Has title:        +10 pts  (titled reviews look more credible)
//   - Has body > 50ch:  +10 pts  (detailed reviews build trust)
//   - Upvotes:          +1 pt per upvote, capped at 10 pts
//
// 
// ─────────────────────────────────────────────────────────────────────────────

function scoreReview(review) {
    let score = 0;

    // Photo bonus — biggest factor for visual impact in checkout
    if (review.pictureUrls?.length > 0) score += 40;

    // Rating bonus
    if (review.rating >= 5) score += 30;
    else if (review.rating >= 4) score += 20;
    else if (review.rating >= 3) score += 5;

    // Content quality bonus
    if (review.title?.trim()) score += 10;
    if ((review.body?.length ?? 0) > 50) score += 10;

    // Helpfulness bonus (from Judge.me votes_up)
    const votes = review._votesUp ?? 0;
    score += Math.min(votes, 10); // cap at 10 so viral reviews don't dominate

    return score;
}

// ─────────────────────────────────────────────────────────────────────────────
// PRIVATE: computeAverageRating
// ─────────────────────────────────────────────────────────────────────────────

function computeAverageRating(reviews) {
    if (!reviews.length) return 0;
    const sum = reviews.reduce((acc, r) => acc + (r.rating ?? 0), 0);
    return sum / reviews.length;
}