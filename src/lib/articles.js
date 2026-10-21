///////////////////////////////////////////////////////////////////////////////
// lib/articles.js
// ===============
//
// Article discovery, metadata resolution, and published article queries.
//
///////////////////////////////////////////////////////////////////////////////

import { getTechnicalAreaById } from "../data/technicalAreas.js";


//========================================================
// Article Metadata
//========================================================

/**
 * @typedef {Object} ArticleMetadata
 * @property {string} title
 * @property {string} description
 * @property {string} areaId
 * @property {string | null} published
 * @property {boolean} draft
 */

/**
 * @typedef {ArticleMetadata & {
 *     href: string,
 *     area: string,
 *     areaHref: string
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
 * Resolves area metadata from the shared technical areas.
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

			const metadata = module.article;

			const area = getTechnicalAreaById(metadata.areaId);

			if (!area) {
				throw new Error(
					`Unknown technical area "${metadata.areaId}" in ${path}`
				);
			}

			return {
				...metadata,
				href: `/articles/${slug}`,
				area: area.title,
				areaHref: area.href
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

/**
 * Returns the IDs of technical areas containing published articles.
 *
 * @param {Article[]} articles
 * @returns {Set<string>}
 */
export function getPublishedAreaIds(articles) {
	return new Set(
		articles.map((article) => article.areaId)
	);
}

/**
 * Returns articles belonging to a technical area.
 * Preserves the ordering of the supplied collection.
 *
 * @param {Article[]} articles
 * @param {string} areaId
 * @returns {Article[]}
 */
export function getArticlesByAreaId(articles, areaId) {
	return articles.filter(
		(article) => article.areaId === areaId
	);
}

