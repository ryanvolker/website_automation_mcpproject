---
name: princess-cruise-details
description: Get full details of one Princess cruise by voyage code - price for every stateroom type (interior, oceanview, balcony, mini-suite, suite), was/now price, day-by-day itinerary with port arrival and departure times, featured shore excursions with ratings, and what's included in the fare. Use when the user asks about a specific Princess cruise, wants to compare stateroom prices, see an itinerary, or asks what a fare includes.
---

# Princess cruise details

## Finding the voyage code

Voyage codes, such as `4726` or `U741`, come from search results. Use the `princess-destinations` or `princess-ships` skill, or:
`node packages/princess/princess.mjs search --destination alaska --month 2027-06 --limit 5`
Each cruise in the results has `voyageCode` and `url`. Cards on destination pages (`featuredCruises` in `destinations.json`) also carry voyage codes.

## Get the details (live, about 30 seconds)

`node packages/princess/princess.mjs details <voyageCode>`

Returns:
- `title`, `sailing` (from and to dates), `ship`, `offers` (such as "Up to 45% Off")
- `staterooms`: a price for each category, e.g. `[{ category: "Balcony", price: 2199 }, …]`. A category with no price may be sold out.
- `lowest`: the cheapest category, with price and was-price
- `itinerary`: `[{ day, port, date, times }]`. `times` is "arrive - depart"; sea days show `port: "At Sea"`. Two entries can share a day (scenic cruising, then a port).
- `featuredExcursions`: name, day, port, rating, reviews, duration, activity level
- `whatsIncluded`: lines from the "What's included" popup (fare inclusions and optional add-ons)

## Answering

- Lead with the ship, dates and the price range across stateroom types, e.g. "Interior $1,244 to Suite $4,269 per person".
- Show the itinerary as a short day list (Day, Port, Times). Point out sea days and scenic cruising.
- For "is X included?", quote `whatsIncluded`. Drinks, Wi-Fi, specialty dining, excursions, spa and laundry are add-ons, which the Princess Plus and Premier packages bundle (see `princess-deals`).
- For more about an excursion, use `princess-shore-excursions` with the port name.
- Link the cruise page (`url`).
- Prices are USD, average per person, for 2 guests, including taxes and fees, and change often. Say when you checked.

## Notes

- The page loads in stages. If `itinerary` comes back empty, run it again once.
- The sitemap's `/cruise-search/details/` URLs are old voyages. Get current codes from a live search.
- Read-only. "CONTINUE" starts booking; never click it.
