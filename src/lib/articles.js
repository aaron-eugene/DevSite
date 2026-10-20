//========================================================
// Article Metadata
//========================================================

/**
 * @typedef {Object} ArticleMetadata
 * @property {string} title
 * @property {string} description
 * @property {string} area
 * @property {string} areaHref
 * @property {string | null} published
 * @property {boolean} draft
 */

/**
 * @typedef {ArticleMetadata & {
 *     href: string
 * }} Article
 */


//========================================================
// Article Discovery
//========================================================

const articleModules =
	/** @type {Record<string, { article: ArticleMetadata }>} */ (
		import.meta.glob(
			"../pages/articles/*.astro",
			{
				eager: true
			}
		)
	);


//========================================================
// Article Queries
//========================================================

/**
 * Returns all published articles, newest first.
 *
 * @returns {Article[]}
 */
export function getPublishedArticles() {
	return Object.entries(articleModules)
		.map(([path, module]) => {
			const slug =
				path
					.replace("../pages/articles/", "")
					.replace(".astro", "");

			return {
				...module.article,
				href: `/articles/${slug}`
			};
		})
		.filter(
			(article) =>
				!article.draft &&
				article.published !== null
		)
		.sort(
			(a, b) =>
				new Date(b.published).getTime() -
				new Date(a.published).getTime()
		);
}