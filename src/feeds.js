import Parser from "rss-parser";

const parser = new Parser({
  timeout: 15000,
  headers: { "User-Agent": "DataLabVeille/1.0 (+https://github.com/justinecombeaubts/data-lab)" },
});

/** Texte brut et court à partir d'un extrait HTML. */
export const clean = (text = "", max = 500) =>
  String(text).replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

/**
 * Récupère les articles récents de toutes les sources.
 * Une source en panne n'arrête pas les autres : elle est notée dans le rapport.
 */
export async function fetchArticles(sources, maxAgeHours) {
  const cutoff = Date.now() - maxAgeHours * 3600 * 1000;
  const results = await Promise.allSettled(sources.map((s) => parser.parseURL(s.url)));
  const articles = [];
  const report = [];

  results.forEach((res, i) => {
    const source = sources[i];
    if (res.status === "rejected") {
      const error = String(res.reason?.message || res.reason).slice(0, 200);
      console.warn(`⚠️  Flux KO : ${source.name} (${error})`);
      report.push({ source: source.name, url: source.url, ok: false, error });
      return;
    }
    let count = 0;
    for (const item of res.value.items) {
      const date = new Date(item.isoDate || item.pubDate || 0).getTime();
      if (!item.link || !/^https?:\/\//.test(item.link) || date < cutoff) continue;
      articles.push({
        title: clean(item.title, 300),
        link: item.link,
        source: source.name,
        date: new Date(date).toISOString(),
        snippet: clean(item.contentSnippet || item.content || item.summary),
      });
      count++;
    }
    console.log(`✓ ${source.name} : ${count} article(s) récent(s)`);
    report.push({ source: source.name, url: source.url, ok: true, count });
  });

  return { articles, report };
}
