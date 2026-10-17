# SEO strategy

Search visibility is meant to come from pages that answer a question and show the working. Hisab does not promise a ranking or a traffic number.

## What is indexable

- Home, calculator index, compare, plan, learn, explore, methodology, sources, and privacy.
- Each calculator without query parameters. The canonical URL is `/calculators/{slug}`.
- Each guide and each topic page.

## What is not indexable

- Any calculator URL that carries inputs. `generateMetadata` sets `noindex` and the canonical URL stays on the clean calculator.
- `/search`, including query URLs. It exists so the site search action has a real target. `robots.txt` disallows `/search` and `/api/`.
- There is no page per numerical combination.

## Technical pieces

- Server-rendered titles, descriptions, and article text.
- `app/sitemap.ts` lists only the canonical routes above.
- `app/robots.ts` points at the sitemap.
- Open Graph titles and descriptions on calculators and guides.
- Breadcrumb JSON-LD on calculator pages. Article JSON-LD on guides, with Hisab named as the product, not as a person.
- WebSite JSON-LD with a SearchAction aimed at `/search?q={query}`.
- No ratings, prices, or review markup.

## Measurement

Run Lighthouse against a production server for `/`, `/calculators/fd`, and `/learn/compound-interest`. Record the scores in the release notes. A lab score is not field Core Web Vitals.

Before calling a URL indexable, check that the canonical matches the sitemap entry and that a personalised link is `noindex`.

Search Console setup is manual: verify the domain, submit `sitemap.xml`, and watch the calculator and guide URLs. That account is not part of this repository.
